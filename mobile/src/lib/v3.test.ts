import { normalizeState } from './backup';
import { budgetRows, budgetStatus } from './budgets';
import { initialState } from './defaults';
import { bucketBalance, goalsProgress, validateTransfer } from './savings';
import { matchesQuery } from './selectors';
import type { AppState, SavingsEntry, Transaction } from './types';
import { reducer } from '@/store';

const tx = (id: number, cat: string, amount: number, note = '', type: 'in' | 'out' = 'out', date = '2026-10-05'): Transaction => ({
  id,
  cat,
  amount,
  note,
  type,
  date,
});
const sv = (id: number, type: 'deposit' | 'withdraw', amount: number, goalId: number | null): SavingsEntry => ({
  id,
  type,
  amount,
  goalId,
  date: '2026-10-05',
  note: '',
});

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('budgets', () => {
  const cats = initialState().cats;
  it('computes spent, ratio and status per category for the month', () => {
    const rows = budgetRows(
      {
        cats,
        budgets: { courses: 10000, loyer: 50000, loisirs: 0 },
        tx: [tx(1, 'courses', 8500), tx(2, 'courses', 2000), tx(3, 'loyer', 10000), tx(4, 'courses', 999, '', 'out', '2026-09-30'), tx(5, 'courses', 500, '', 'in')],
      },
      '2026-10',
    );
    expect(rows.map((r) => [r.cat.id, r.spent, r.status])).toEqual([
      ['courses', 10500, 'over'],
      ['loyer', 10000, 'ok'],
    ]);
  });
  it('thresholds: 80 % warns, 100 % is still ok, above is over', () => {
    expect(budgetStatus(0.79)).toBe('ok');
    expect(budgetStatus(0.8)).toBe('warn');
    expect(budgetStatus(1)).toBe('warn');
    expect(budgetStatus(1.01)).toBe('over');
  });
});

describe('search', () => {
  const cats = initialState().cats;
  const t = tx(1, 'courses', 12500, 'Marché de Dakar');
  it('matches note, category and amount, ignoring case and accents', () => {
    expect(matchesQuery(t, cats, 'marche')).toBe(true);
    expect(matchesQuery(t, cats, 'NOURRITURE')).toBe(true);
    expect(matchesQuery(t, cats, '12500')).toBe(true);
    expect(matchesQuery(t, cats, 'marché dakar')).toBe(true);
    expect(matchesQuery(t, cats, 'loyer')).toBe(false);
    expect(matchesQuery(t, cats, '   ')).toBe(true);
  });
});

describe('savings goals', () => {
  const base = { tx: [tx(1, 'freelance', 100000, '', 'in')], goals: [{ id: 1, name: 'Voyage', target: 20000 }, { id: 2, name: 'Urgence', target: 40000 }] };
  it('tracks each bucket and the overall progress', () => {
    const savings = [sv(1, 'deposit', 10000, 1), sv(2, 'deposit', 5000, null), sv(3, 'withdraw', 2000, 1)];
    expect(bucketBalance(savings, 1)).toBe(8000);
    expect(bucketBalance(savings, null)).toBe(5000);
    expect(goalsProgress({ ...base, savings })?.progress).toBeCloseTo(8000 / 60000);
    expect(goalsProgress({ savings, goals: [] })).toBeNull();
  });
  it('refuses withdrawing more than a bucket holds', () => {
    const s = { ...base, savings: [sv(1, 'deposit', 10000, 1), sv(2, 'deposit', 5000, null)] };
    expect(validateTransfer(s, 'withdraw', 10000, 1)).toBeNull();
    expect(validateTransfer(s, 'withdraw', 10001, 1)).toMatch(/objectif/);
    expect(validateTransfer(s, 'withdraw', 6000, null)).toMatch(/caisse/);
  });
  it('deleting a goal keeps the money in the pot and undo re-attaches it', () => {
    const s: AppState = { ...initialState(), ...base, savings: [sv(1, 'deposit', 10000, 1), sv(2, 'deposit', 500, 2)] };
    const gone = reducer(s, { type: 'deleteGoal', id: 1 });
    expect(gone.goals.map((g) => g.id)).toEqual([2]);
    expect(gone.savings.map((e) => e.goalId)).toEqual([null, 2]);
    const back = reducer(gone, { type: 'restoreGoal', goal: s.goals[0], entryIds: [1] });
    expect(back.savings.map((e) => e.goalId)).toEqual([1, 2]);
  });
});

describe('v2 → v3 migration', () => {
  it('turns the single goal into a goal that owns the whole pot', () => {
    const v2 = {
      cats: initialState().cats,
      tx: [],
      savings: [{ id: 1, type: 'deposit', amount: 5000, date: '2026-10-01', note: '' }],
      savingsGoal: 20000,
    };
    const s = normalizeState(v2, true)!;
    expect(s.goals).toEqual([{ id: 1, name: 'Objectif', target: 20000 }]);
    expect(s.savings[0].goalId).toBe(1);
    expect(s.budgets).toEqual({});
  });
  it('detaches movements pointing at an unknown goal and validates budgets', () => {
    const d = { cats: initialState().cats, tx: [], savings: [{ id: 1, goalId: 99, type: 'deposit', amount: 5, date: '2026-10-01' }], goals: [], budgets: { courses: 5000, bad: -1 } };
    expect(normalizeState(d, false)!.savings[0].goalId).toBeNull();
    expect(normalizeState(d, false)!.budgets).toEqual({ courses: 5000 });
    expect(normalizeState(d, true)).toBeNull();
  });
  it('setBudget sets and clears a limit', () => {
    const a = reducer(initialState(), { type: 'setBudget', cat: 'courses', amount: 9000 });
    expect(a.budgets).toEqual({ courses: 9000 });
    expect(reducer(a, { type: 'setBudget', cat: 'courses', amount: null }).budgets).toEqual({});
  });
});
