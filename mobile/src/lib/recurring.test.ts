import { applyRecurring, dueOccurrences } from './recurring';
import { initialState } from './defaults';
import type { AppState, RecurringRule } from './types';

const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 1,
  kind: 'out',
  amount: 120000,
  cat: 'loyer',
  note: 'Loyer',
  day: 5,
  startMonth: '2026-08',
  lastApplied: null,
  ...over,
});

const state = (rules: RecurringRule[]): AppState => ({ ...initialState(), recurring: rules });

describe('recurring rules', () => {
  it('catches up on every missed month', () => {
    const due = dueOccurrences([rule()], '2026-10-19');
    expect(due.map((d) => d.date)).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
  });

  it('waits for the day in the current month', () => {
    expect(dueOccurrences([rule({ day: 25 })], '2026-10-19').map((d) => d.date)).toEqual(['2026-08-25', '2026-09-25']);
  });

  it('does not generate before startMonth', () => {
    expect(dueOccurrences([rule({ startMonth: '2026-11' })], '2026-10-19')).toEqual([]);
  });

  it('is idempotent', () => {
    const once = applyRecurring(state([rule()]), '2026-10-19');
    expect(once.tx).toHaveLength(3);
    expect(once.recurring[0].lastApplied).toBe('2026-10');
    const twice = applyRecurring(once, '2026-10-19');
    expect(twice).toBe(once);
    expect(twice.tx).toHaveLength(3);
  });

  it('generates the next month only once its day arrives', () => {
    const s1 = applyRecurring(state([rule()]), '2026-10-19');
    const s2 = applyRecurring(s1, '2026-11-04');
    expect(s2.tx).toHaveLength(3);
    const s3 = applyRecurring(s2, '2026-11-05');
    expect(s3.tx).toHaveLength(4);
    expect(s3.tx[3].date).toBe('2026-11-05');
  });

  it('creates savings deposits for kind "save" and no transaction', () => {
    const s = applyRecurring(state([rule({ kind: 'save', amount: 5000, note: 'Épargne', startMonth: '2026-10' })]), '2026-10-19');
    expect(s.tx).toHaveLength(0);
    expect(s.savings).toHaveLength(1);
    expect(s.savings[0]).toMatchObject({ type: 'deposit', amount: 5000, date: '2026-10-05' });
  });

  it('assigns unique ids', () => {
    const s = applyRecurring(state([rule(), rule({ id: 2, kind: 'in', cat: 'freelance', amount: 1 })]), '2026-10-19');
    const ids = s.tx.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
