import { DEFAULT_CATS } from './defaults';
import type { AppState, Category, RecurringRule, SavingsEntry, SavingsGoal, Transaction } from './types';

export const BACKUP_VERSION = 3;

const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown): v is string => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v: unknown): v is string => isStr(v) && /^\d{4}-\d{2}$/.test(v);
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Data saved before 1.4 has no `kind`: only the salary category was an income. */
const asCat = (v: unknown): Category | null =>
  isRec(v) && isStr(v.id) && isStr(v.name) && isStr(v.color) && isStr(v.icon)
    ? { id: v.id, kind: v.kind === 'in' || v.kind === 'out' ? v.kind : v.id === 'freelance' ? 'in' : 'out', name: v.name, color: v.color, icon: v.icon }
    : null;

const asTx = (v: unknown): Transaction | null =>
  isRec(v) && isNum(v.id) && isNum(v.amount) && v.amount > 0 && (v.type === 'in' || v.type === 'out') && isStr(v.cat) && isDate(v.date)
    ? { id: v.id, amount: v.amount, type: v.type, cat: v.cat, date: v.date, note: isStr(v.note) ? v.note : '', ...(isStr(v.photo) && v.photo !== '' ? { photo: v.photo } : {}) }
    : null;

const asGoal = (v: unknown): SavingsGoal | null =>
  isRec(v) && isNum(v.id) && isStr(v.name) && v.name.trim() !== '' && isNum(v.target) && v.target > 0
    ? { id: v.id, name: v.name, target: v.target }
    : null;

const asSaving = (v: unknown): SavingsEntry | null =>
  isRec(v) && isNum(v.id) && isNum(v.amount) && v.amount > 0 && (v.type === 'deposit' || v.type === 'withdraw') && isDate(v.date)
    ? { id: v.id, goalId: isNum(v.goalId) ? v.goalId : null, type: v.type, amount: v.amount, date: v.date, note: isStr(v.note) ? v.note : '' }
    : null;

/** Keeps only positive limits; strict mode rejects any other shape. */
const asBudgets = (v: unknown, strict: boolean): Record<string, number> | null => {
  if (v === undefined) return {};
  if (!isRec(v) || Array.isArray(v)) return null;
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) {
    if (isNum(n) && n > 0) out[k] = n;
    else if (strict) return null;
  }
  return out;
};

const asRule = (v: unknown): RecurringRule | null =>
  isRec(v) &&
  isNum(v.id) &&
  isNum(v.amount) &&
  v.amount > 0 &&
  (v.kind === 'in' || v.kind === 'out' || v.kind === 'save') &&
  isNum(v.day) &&
  v.day >= 1 &&
  v.day <= 28 &&
  isMonth(v.startMonth)
    ? {
        id: v.id,
        kind: v.kind,
        amount: v.amount,
        cat: isStr(v.cat) ? v.cat : 'autre',
        note: isStr(v.note) ? v.note : '',
        day: v.day,
        startMonth: v.startMonth,
        lastApplied: isMonth(v.lastApplied) ? v.lastApplied : null,
      }
    : null;

/** Maps a list through `parse`; returns null if `strict` and any item is invalid. */
const mapList = <T>(list: unknown, parse: (v: unknown) => T | null, strict: boolean): T[] | null => {
  if (list === undefined) return [];
  if (!Array.isArray(list)) return null;
  const out: T[] = [];
  for (const item of list) {
    const v = parse(item);
    if (v) out.push(v);
    else if (strict) return null;
  }
  return out;
};

/**
 * Turns unknown data (old `pocket.v1`, v2 or a backup payload) into a valid AppState.
 * Missing v2 fields get defaults. `strict` rejects the whole input on any invalid item
 * (used for imports); lenient mode drops invalid items (used for local storage).
 */
export function normalizeState(d: unknown, strict: boolean): AppState | null {
  if (!isRec(d)) return null;
  const cats = mapList(d.cats, asCat, strict);
  const tx = mapList(d.tx, asTx, strict);
  const savings = mapList(d.savings, asSaving, strict);
  const recurring = mapList(d.recurring, asRule, strict);
  const goalList = mapList(d.goals, asGoal, strict);
  const budgets = asBudgets(d.budgets, strict);
  if (!cats || !tx || !savings || !recurring || !goalList || !budgets) return null;
  if (!Array.isArray(d.cats) || !Array.isArray(d.tx) || cats.length === 0) return null;
  // Legacy data (no `kind`) gets the new income categories once; later deletions stay deleted.
  const legacy = (d.cats as unknown[]).some((c) => isRec(c) && c.kind === undefined);
  const have = new Set(cats.map((c) => c.id));
  const withKinds = legacy ? [...cats, ...DEFAULT_CATS.filter((c) => c.kind === 'in' && !have.has(c.id))] : cats;
  let goals = goalList;
  let entries = savings;
  if (d.goals === undefined && isNum(d.savingsGoal) && d.savingsGoal > 0) {
    // v2 single goal → one goal that owns the whole pot, so its progress is unchanged.
    goals = [{ id: 1, name: 'Objectif', target: d.savingsGoal }];
    entries = savings.map((e) => ({ ...e, goalId: 1 }));
  }
  const known = new Set(goals.map((g) => g.id));
  return {
    cats: withKinds,
    tx,
    savings: entries.map((e) => (e.goalId !== null && !known.has(e.goalId) ? { ...e, goalId: null } : e)),
    recurring,
    goals,
    budgets,
    theme: d.theme === 'light' || d.theme === 'dark' ? d.theme : 'auto',
  };
}

/** Photos stay on the device: the backup carries no reference to them. */
const withoutPhotos = (s: AppState): AppState => ({ ...s, tx: s.tx.map(({ photo: _photo, ...t }) => t) });

export const serializeBackup = (s: AppState, exportedAt = new Date()) =>
  JSON.stringify({ app: 'pocket', version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), data: withoutPhotos(s) }, null, 2);

export type ParsedBackup =
  | { ok: true; state: AppState; summary: { tx: number; savings: number; recurring: number } }
  | { ok: false; error: string };

export function parseBackup(raw: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas une sauvegarde Pocket valide.' };
  }
  const payload = isRec(json) && json.app === 'pocket' ? json.data : json;
  if (isRec(json) && json.app === 'pocket' && isNum(json.version) && json.version > BACKUP_VERSION) {
    return { ok: false, error: 'Cette sauvegarde vient d’une version plus récente de Pocket. Mets l’app à jour.' };
  }
  const parsed = normalizeState(payload, true);
  const state = parsed && withoutPhotos(parsed);
  if (!state) return { ok: false, error: 'Les données de ce fichier sont incomplètes ou corrompues.' };
  return { ok: true, state, summary: { tx: state.tx.length, savings: state.savings.length, recurring: state.recurring.length } };
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Transactions and savings transfers as a CSV (`;` separator, UTF-8 BOM for Excel). */
export function toCsv(s: AppState): string {
  const catName = (id: string) => (s.cats.find((c) => c.id === id) ?? DEFAULT_CATS[DEFAULT_CATS.length - 1]).name;
  const goalLabel = (e: SavingsEntry) => {
    const g = s.goals.find((x) => x.id === e.goalId);
    return g ? `Caisse économies · ${g.name}` : 'Caisse économies';
  };
  const rows: (string | number)[][] = [['date', 'type', 'catégorie', 'montant', 'note']];
  [...s.tx]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .forEach((t) => rows.push([t.date, t.type === 'in' ? 'entrée' : 'sortie', catName(t.cat), t.amount, t.note]));
  [...s.savings]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .forEach((e) => rows.push([e.date, e.type === 'deposit' ? 'versement caisse' : 'retrait caisse', goalLabel(e), e.amount, e.note]));
  return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n');
}

