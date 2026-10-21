import { normalizeState } from '@/lib/backup';
import { initialState } from '@/lib/defaults';
import type { AppState } from '@/lib/types';
import { parseStored, reducer } from '@/store';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const full = (): AppState => ({
  ...initialState(),
  tx: [{ id: 1, type: 'out', amount: 1500, cat: 'courses', date: '2026-10-02', note: '' }],
  savings: [{ id: 2, goalId: null, type: 'deposit', amount: 5000, date: '2026-10-03', note: '' }],
  goals: [{ id: 7, name: 'Voyage', target: 100000 }],
  budgets: { courses: 20000 },
  recurring: [{ id: 3, kind: 'save', amount: 5000, cat: 'autre', note: '', day: 1, startMonth: '2026-10', lastApplied: null }],
});

describe('persistence compatibility', () => {
  it('loads an old pocket.v1 save without losing data', () => {
    const v1 = { cats: initialState().cats, tx: [{ id: 9, type: 'in', amount: 1000, cat: 'freelance', date: '2026-09-01', note: '' }], theme: 'dark' };
    const s = parseStored(JSON.stringify(v1));
    expect(s.tx).toHaveLength(1);
    expect(s.theme).toBe('dark');
    expect(s.savings).toEqual([]);
    expect(s.goals).toEqual([]);
    expect(s.budgets).toEqual({});
    expect(s.recurring).toEqual([]);
  });

  it('falls back to defaults on corrupt storage', () => {
    expect(parseStored('{{{')).toEqual(initialState());
    expect(parseStored(null)).toEqual(initialState());
  });

  it('drops invalid items in lenient mode only', () => {
    const d = { ...full(), tx: [...full().tx, { id: 'x' }] };
    expect(normalizeState(d, false)?.tx).toHaveLength(1);
    expect(normalizeState(d, true)).toBeNull();
  });
});

describe('store reducer', () => {
  it('wipe resets data including savings and rules but keeps the theme', () => {
    const s = reducer({ ...full(), theme: 'dark' }, { type: 'wipe' });
    expect(s.tx).toEqual([]);
    expect(s.savings).toEqual([]);
    expect(s.recurring).toEqual([]);
    expect(s.goals).toEqual([]);
    expect(s.budgets).toEqual({});
    expect(s.theme).toBe('dark');
  });

  it('deleting a category moves transactions and rules to the fallback', () => {
    const s0 = { ...full(), recurring: [{ ...full().recurring[0], kind: 'out' as const, cat: 'courses' }] };
    const s = reducer(s0, { type: 'deleteCat', id: 'courses' });
    expect(s.tx[0].cat).toBe('autre');
    expect(s.recurring[0].cat).toBe('autre');
  });
});
