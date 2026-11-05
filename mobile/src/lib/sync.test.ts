import { initialState } from './defaults';
import { canonical, diffRows, fromRows, isBlankState, isDiffEmpty, rowsEqual, rowsEmpty, toRows } from './sync';
import type { AppState } from './types';

const full = (): AppState => ({
  ...initialState(),
  tx: [
    { id: 1, type: 'out', amount: 1500, cat: 'courses', date: '2026-10-02', note: 'riz', photo: 'a.jpg' },
    { id: 2, type: 'in', amount: 250000, cat: 'freelance', date: '2026-10-01', note: '' },
  ],
  savings: [{ id: 4, goalId: 7, type: 'deposit', amount: 5000, date: '2026-10-03', note: '' }],
  goals: [{ id: 7, name: 'Voyage', target: 100000 }],
  budgets: { courses: 20000 },
  recurring: [{ id: 3, kind: 'save', amount: 5000, cat: 'autre', note: '', day: 1, startMonth: '2026-10', lastApplied: '2026-10' }],
});

describe('sync rows', () => {
  it('aller-retour sans perte (photo reprise depuis l’appareil, thème gardé)', () => {
    const s = { ...full(), theme: 'dark' as const };
    const back = fromRows(toRows(s), s);
    expect(back).toEqual({ ...s, tx: [...s.tx].sort((a, b) => a.id - b.id) });
  });

  it('ne met pas la photo dans les lignes', () => {
    expect(JSON.stringify(toRows(full()).transactions)).not.toContain('a.jpg');
  });

  it('une photo locale est perdue seulement si l’opération disparaît', () => {
    const rows = toRows(full());
    const noTx1 = { ...rows, transactions: rows.transactions.filter((t) => t.id !== 1) };
    expect(fromRows(noTx1, full()).tx.map((t) => t.photo)).toEqual([undefined]);
  });

  it('garde l’ordre des catégories', () => {
    const s = full();
    const reversed = { ...s, cats: [...s.cats].reverse() };
    expect(fromRows(toRows(reversed), s).cats.map((c) => c.id)).toEqual(reversed.cats.map((c) => c.id));
  });

  it('nettoie ce que le schéma refuserait', () => {
    const s = full();
    s.cats[0] = { ...s.cats[0], color: 'red', name: 'x'.repeat(80) };
    s.tx[0] = { ...s.tx[0], amount: 10.456, note: 'n'.repeat(900) };
    const r = toRows(s);
    expect(r.categories[0].color).toBe('#8B8AA3');
    expect(String(r.categories[0].name)).toHaveLength(40);
    expect(r.transactions[0].amount).toBe(10.46);
    expect(String(r.transactions[0].note)).toHaveLength(500);
  });

  it('canonical ignore l’ordre et le type renvoyés par le serveur', () => {
    const r = toRows(full());
    const shuffled = { ...r, transactions: [...r.transactions].reverse().map((t) => ({ ...t, amount: String(t.amount) as unknown as number })) };
    expect(rowsEqual(canonical(shuffled), canonical(r))).toBe(true);
  });
});

describe('diffRows', () => {
  it('tout envoyer quand il n’y a pas d’état précédent', () => {
    const d = diffRows(null, toRows(full()));
    expect(d.transactions.upsert).toHaveLength(2);
    expect(d.transactions.remove).toEqual([]);
  });

  it('rien à envoyer si rien n’a changé', () => {
    expect(isDiffEmpty(diffRows(toRows(full()), toRows(full())))).toBe(true);
  });

  it('envoie seulement la ligne modifiée', () => {
    const next = full();
    next.tx[0] = { ...next.tx[0], amount: 2000 };
    const d = diffRows(toRows(full()), toRows(next));
    expect(d.transactions.upsert.map((r) => r.id)).toEqual([1]);
    expect(d.categories.upsert).toEqual([]);
  });

  it('une suppression locale devient une suppression distante', () => {
    const next = full();
    next.tx = next.tx.filter((t) => t.id !== 2);
    next.budgets = {};
    const d = diffRows(toRows(full()), toRows(next));
    expect(d.transactions.remove).toEqual([2]);
    expect(d.budgets.remove).toEqual(['courses']);
  });

  it('supprimer un objectif remet goal_id à null avant la suppression', () => {
    const next = full();
    next.goals = [];
    next.savings = next.savings.map((e) => ({ ...e, goalId: null }));
    const d = diffRows(toRows(full()), toRows(next));
    expect(d.savings_entries.upsert[0].goal_id).toBeNull();
    expect(d.savings_goals.remove).toEqual([7]);
  });
});

describe('états vides', () => {
  it('reconnaît un téléphone sans donnée', () => {
    expect(isBlankState(initialState())).toBe(true);
    expect(isBlankState(full())).toBe(false);
    const custom = initialState();
    custom.cats.push({ id: 'c1', kind: 'out', name: 'Santé', color: '#6C63FF', icon: 'heart' });
    expect(isBlankState(custom)).toBe(false);
  });

  it('rowsEmpty', () => {
    expect(rowsEmpty(toRows({ ...initialState(), cats: [] }))).toBe(true);
    expect(rowsEmpty(toRows(initialState()))).toBe(false);
  });
});
