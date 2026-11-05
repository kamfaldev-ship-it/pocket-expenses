import { DEFAULT_CATS } from './defaults';
import type { AppState, Category, RecurringRule, SavingsEntry, SavingsGoal, Transaction } from './types';

/** Tables synchronisées, dans l'ordre d'envoi (les objectifs avant les versements qui les citent). */
export const TABLES = ['categories', 'savings_goals', 'savings_entries', 'transactions', 'budgets', 'recurring_rules'] as const;
export type Table = (typeof TABLES)[number];

export type Row = Record<string, string | number | null>;
export type Rows = Record<Table, Row[]>;

/** Colonne qui identifie une ligne (avec user_id côté serveur). */
export const KEY: Record<Table, string> = {
  categories: 'id',
  savings_goals: 'id',
  savings_entries: 'id',
  transactions: 'id',
  budgets: 'cat',
  recurring_rules: 'id',
};

export interface TableDiff {
  upsert: Row[];
  remove: (string | number)[];
}
export type Diff = Record<Table, TableDiff>;

export const emptyRows = (): Rows => ({
  categories: [],
  savings_goals: [],
  savings_entries: [],
  transactions: [],
  budgets: [],
  recurring_rules: [],
});

// Les contraintes CHECK de schema.sql refusent toute la requête si une seule ligne les viole
// (ex. une sauvegarde importée avec une couleur « red »). On nettoie donc avant d'envoyer.
const money = (n: number) => Math.max(0.01, Math.round(n * 100) / 100);
const text = (s: string, max: number) => s.slice(0, max);
const HEX = /^#[0-9A-Fa-f]{6}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** État de l'app → lignes (sans user_id). Photos et thème restent sur l'appareil. */
export function toRows(s: AppState): Rows {
  return {
    categories: s.cats.map((c, position) => ({
      id: c.id,
      kind: c.kind,
      name: text(c.name.trim() || 'Sans nom', 40),
      color: HEX.test(c.color) ? c.color : '#8B8AA3',
      icon: c.icon,
      position,
    })),
    savings_goals: s.goals.map((g) => ({ id: g.id, name: text(g.name.trim() || 'Objectif', 60), target: Math.max(0, Math.round(g.target * 100) / 100) })),
    savings_entries: s.savings.map((e) => ({
      id: e.id,
      goal_id: e.goalId,
      type: e.type,
      amount: money(e.amount),
      date: e.date,
      note: text(e.note, 500),
    })),
    transactions: s.tx.map((t) => ({ id: t.id, type: t.type, amount: money(t.amount), cat: t.cat, date: t.date, note: text(t.note, 500) })),
    budgets: Object.entries(s.budgets).map(([cat, amount]) => ({ cat, amount: money(amount) })),
    recurring_rules: s.recurring.map((r) => ({
      id: r.id,
      kind: r.kind,
      amount: money(r.amount),
      cat: r.cat,
      note: text(r.note, 500),
      day: r.day,
      start_month: r.startMonth,
      last_applied: r.lastApplied && MONTH.test(r.lastApplied) ? r.lastApplied : null,
    })),
  };
}

const num = (v: unknown) => Number(v);
const str = (v: unknown) => String(v ?? '');
const byId = <T extends { id: number }>(a: T, b: T) => a.id - b.id;

/**
 * Lignes du serveur → état de l'app. Le thème et les photos viennent de l'appareil :
 * une photo est reprise par id d'opération, pour qu'une reprise des données ne les perde pas.
 */
export function fromRows(r: Rows, local: Pick<AppState, 'theme' | 'tx'>): AppState {
  const photos = new Map(local.tx.filter((t) => t.photo).map((t) => [t.id, t.photo as string]));
  const cats: Category[] = [...r.categories]
    .sort((a, b) => num(a.position) - num(b.position))
    .map((c) => ({ id: str(c.id), kind: c.kind === 'in' ? 'in' : 'out', name: str(c.name), color: str(c.color), icon: str(c.icon) }));
  const tx: Transaction[] = r.transactions
    .map((t) => ({
      id: num(t.id),
      type: (t.type === 'in' ? 'in' : 'out') as Transaction['type'],
      amount: num(t.amount),
      cat: str(t.cat),
      date: str(t.date),
      note: str(t.note),
      ...(photos.has(num(t.id)) ? { photo: photos.get(num(t.id)) } : {}),
    }))
    .sort(byId);
  const goals: SavingsGoal[] = r.savings_goals.map((g) => ({ id: num(g.id), name: str(g.name), target: num(g.target) })).sort(byId);
  const savings: SavingsEntry[] = r.savings_entries
    .map((e) => ({
      id: num(e.id),
      goalId: e.goal_id === null || e.goal_id === undefined ? null : num(e.goal_id),
      type: (e.type === 'withdraw' ? 'withdraw' : 'deposit') as SavingsEntry['type'],
      amount: num(e.amount),
      date: str(e.date),
      note: str(e.note),
    }))
    .sort(byId);
  const budgets: Record<string, number> = {};
  r.budgets.forEach((b) => {
    budgets[str(b.cat)] = num(b.amount);
  });
  const recurring: RecurringRule[] = r.recurring_rules
    .map((x) => ({
      id: num(x.id),
      kind: (x.kind === 'in' || x.kind === 'save' ? x.kind : 'out') as RecurringRule['kind'],
      amount: num(x.amount),
      cat: str(x.cat),
      note: str(x.note),
      day: num(x.day),
      startMonth: str(x.start_month),
      lastApplied: x.last_applied ? str(x.last_applied) : null,
    }))
    .sort(byId);
  return {
    cats: cats.length ? cats : DEFAULT_CATS.map((c) => ({ ...c })),
    tx,
    theme: local.theme,
    savings,
    goals,
    budgets,
    recurring,
  };
}

/** Forme canonique : passer par l'état de l'app donne les mêmes lignes quel que soit l'ordre ou le type renvoyé par le serveur. */
export const canonical = (r: Rows): Rows => toRows(fromRows(r, { theme: 'auto', tx: [] }));

const sig = (row: Row) => JSON.stringify(row);

export function diffRows(prev: Rows | null, next: Rows): Diff {
  const out = {} as Diff;
  for (const t of TABLES) {
    const k = KEY[t];
    const before = new Map((prev?.[t] ?? []).map((row) => [row[k] as string | number, sig(row)]));
    const upsert = next[t].filter((row) => before.get(row[k] as string | number) !== sig(row));
    const keep = new Set(next[t].map((row) => row[k] as string | number));
    const remove = [...before.keys()].filter((key) => !keep.has(key));
    out[t] = { upsert, remove };
  }
  return out;
}

export const isDiffEmpty = (d: Diff) => TABLES.every((t) => d[t].upsert.length === 0 && d[t].remove.length === 0);

export const rowsEqual = (a: Rows, b: Rows) => isDiffEmpty(diffRows(a, b)) && isDiffEmpty(diffRows(b, a));

export const rowsEmpty = (r: Rows) => TABLES.every((t) => r[t].length === 0);

/** Aucune donnée de l'utilisateur : seulement les catégories par défaut. */
export const isBlankState = (s: AppState) => {
  const defaults = new Set(DEFAULT_CATS.map((c) => c.id));
  return (
    s.tx.length === 0 &&
    s.savings.length === 0 &&
    s.goals.length === 0 &&
    s.recurring.length === 0 &&
    Object.keys(s.budgets).length === 0 &&
    s.cats.every((c) => defaults.has(c.id))
  );
};
