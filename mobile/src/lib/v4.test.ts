import { normalizeState, parseBackup, serializeBackup } from './backup';
import { budgetRows, budgetSummary } from './budgets';
import { addDays, inRange, isFullMonth, monthRange, periodLabel } from './dates';
import { DEFAULT_CATS, initialState } from './defaults';
import { orphanNames } from './photos';
import { monthStats, reportRows } from './selectors';
import type { AppState, Transaction } from './types';
import { reducer } from '@/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const tx = (id: number, cat: string, amount: number, date: string, type: 'in' | 'out' = 'out', photo?: string): Transaction => ({
  id,
  cat,
  amount,
  type,
  date,
  note: '',
  ...(photo ? { photo } : {}),
});

describe('categories by kind', () => {
  it('default income and expense categories are separate', () => {
    const inc = DEFAULT_CATS.filter((c) => c.kind === 'in').map((c) => c.id);
    expect(inc).toEqual(['freelance', 'ventes', 'aide', 'prime', 'autre_in']);
    expect(DEFAULT_CATS.filter((c) => c.kind === 'out').every((c) => !inc.includes(c.id))).toBe(true);
  });

  it('migrates old categories: only the salary is an income, new incomes are added once', () => {
    const old = DEFAULT_CATS.filter((c) => ['freelance', 'courses', 'autre'].includes(c.id)).map(({ kind: _k, ...c }) => c);
    const s = normalizeState({ cats: old, tx: [] }, false) as AppState;
    expect(s.cats.find((c) => c.id === 'freelance')?.kind).toBe('in');
    expect(s.cats.find((c) => c.id === 'courses')?.kind).toBe('out');
    expect(s.cats.filter((c) => c.kind === 'in').map((c) => c.id)).toEqual(['freelance', 'ventes', 'aide', 'prime', 'autre_in']);
    // Already migrated data is left alone: a deleted income category stays deleted.
    const again = normalizeState({ ...s, cats: s.cats.filter((c) => c.id !== 'prime') }, false) as AppState;
    expect(again.cats.some((c) => c.id === 'prime')).toBe(false);
  });

  it('a custom category from before the split becomes an expense', () => {
    const cats = [{ id: 'c1', name: 'Santé', color: '#fff', icon: 'heart' }, ...DEFAULT_CATS.map(({ kind: _k, ...c }) => c)];
    const s = normalizeState({ cats, tx: [] }, false) as AppState;
    expect(s.cats.find((c) => c.id === 'c1')?.kind).toBe('out');
  });

  it('deleting a category moves its operations to the "other" of the same kind and drops its budget', () => {
    const s: AppState = {
      ...initialState(),
      tx: [tx(1, 'prime', 500, '2026-10-02', 'in'), tx(2, 'courses', 700, '2026-10-02')],
      budgets: { courses: 10000 },
    };
    const a = reducer(s, { type: 'deleteCat', id: 'prime' });
    expect(a.tx.find((t) => t.id === 1)?.cat).toBe('autre_in');
    const b = reducer(s, { type: 'deleteCat', id: 'courses' });
    expect(b.tx.find((t) => t.id === 2)?.cat).toBe('autre');
    expect(b.budgets.courses).toBeUndefined();
  });

  it('the last category of a kind cannot be deleted', () => {
    let s = initialState();
    for (const id of ['ventes', 'aide', 'prime', 'autre_in']) s = reducer(s, { type: 'deleteCat', id });
    expect(reducer(s, { type: 'deleteCat', id: 'freelance' })).toBe(s);
  });

  it('undoing a category deletion restores its budget', () => {
    const s: AppState = { ...initialState(), budgets: { loyer: 50000 } };
    const index = s.cats.findIndex((c) => c.id === 'loyer');
    const cat = s.cats[index];
    const gone = reducer(s, { type: 'deleteCat', id: 'loyer' });
    expect(reducer(gone, { type: 'restoreCat', cat, index, moved: [], budget: 50000 }).budgets.loyer).toBe(50000);
  });

  it('budgets only list expense categories', () => {
    const s = { ...initialState(), tx: [], budgets: { courses: 1000, freelance: 5000 } };
    expect(budgetRows(s, '2026-10').map((r) => r.cat.id)).toEqual(['courses']);
  });
});

describe('free period', () => {
  const data = [
    tx(1, 'courses', 1000, '2026-09-12'),
    tx(2, 'courses', 2000, '2026-09-13'),
    tx(3, 'transport', 500, '2026-10-01', 'out'),
    tx(4, 'freelance', 9000, '2026-10-15', 'in'),
    tx(5, 'courses', 700, '2026-10-16'),
  ];

  it('monthRange, inRange and isFullMonth', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(inRange('2026-10-15', { from: '2026-09-13', to: '2026-10-15' })).toBe(true);
    expect(inRange('2026-10-16', { from: '2026-09-13', to: '2026-10-15' })).toBe(false);
    expect(isFullMonth(monthRange('2026-10'))).toBe(true);
    expect(isFullMonth({ from: '2026-10-01', to: '2026-10-15' })).toBe(false);
  });

  it('labels a range, a single day and a range across years', () => {
    expect(periodLabel({ from: '2026-09-13', to: '2026-10-15' })).toBe('13 sept. → 15 oct.');
    expect(periodLabel({ from: '2026-09-13', to: '2026-09-13' })).toBe('13 sept.');
    expect(periodLabel({ from: '2026-12-20', to: '2027-01-05' })).toBe('20 déc. 2026 → 5 janv. 2027');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });

  it('stats and report cover exactly the chosen days, ends included', () => {
    const p = { from: '2026-09-13', to: '2026-10-15' };
    expect(monthStats(data, p)).toEqual({ inn: 9000, out: 2500, net: 6500 });
    const one = { from: '2026-09-13', to: '2026-09-13' };
    expect(monthStats(data, one).out).toBe(2000);
    const s = { ...initialState(), tx: data };
    expect(reportRows(s, p, 'out').total).toBe(2500);
    expect(monthStats(data, '2026-10').out).toBe(1200);
  });

  it('budgets follow the period and add up in a summary', () => {
    const s = { ...initialState(), tx: data, budgets: { courses: 2000, transport: 1000 } };
    const rows = budgetRows(s, '2026-10');
    // Most consumed first: transport 500/1000 before courses 700/2000.
    expect(rows.map((r) => [r.cat.id, r.spent])).toEqual([
      ['transport', 500],
      ['courses', 700],
    ]);
    const sum = budgetSummary(rows);
    expect(sum).toMatchObject({ limit: 3000, spent: 1200 });
    expect(budgetSummary([])).toBeNull();
  });
});

describe('photos', () => {
  it('lists only files no operation refers to', () => {
    const txs = [tx(1, 'courses', 1, '2026-10-01', 'out', 'a.jpg'), tx(2, 'courses', 1, '2026-10-02')];
    expect(orphanNames(['a.jpg', 'b.jpg'], txs)).toEqual(['b.jpg']);
  });

  it('keeps the photo name in local storage but not in a backup', () => {
    const s: AppState = { ...initialState(), tx: [tx(1, 'courses', 100, '2026-10-01', 'out', 'a.jpg')] };
    expect((normalizeState(JSON.parse(JSON.stringify(s)), false) as AppState).tx[0].photo).toBe('a.jpg');
    expect(serializeBackup(s)).not.toContain('a.jpg');
    const withPhoto = JSON.stringify({ app: 'pocket', version: 3, data: s });
    const parsed = parseBackup(withPhoto);
    expect(parsed.ok && parsed.state.tx[0].photo).toBeFalsy();
  });
});
