import { compact, fcfa, fcfaSigned, nf } from './format';
import { dayLong, iso, monthName, shiftMonth } from './dates';
import { balanceSeries, groupByDay, monthStats, reportRows } from './selectors';
import { initialState } from './defaults';
import type { Transaction } from './types';

const tx = (id: number, date: string, type: 'in' | 'out', amount: number, cat = 'courses'): Transaction => ({
  id,
  date,
  type,
  amount,
  cat,
  note: '',
});

describe('format', () => {
  it('groups thousands fr-FR style', () => {
    expect(nf(1234567)).toBe('1 234 567');
    expect(nf(-1500)).toBe('−1 500');
    expect(fcfa(500)).toBe('500 FCFA');
    expect(fcfaSigned(-2000)).toBe('−2 000 FCFA');
    expect(compact(950)).toBe('950');
    expect(compact(5000)).toBe('5\u00a0k');
    expect(compact(12500)).toBe('12,5\u00a0k');
    expect(compact(2000000)).toBe('2\u00a0M');
  });
});

describe('dates', () => {
  it('formats and shifts months', () => {
    expect(monthName('2026-02')).toBe('février 2026');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(dayLong('2026-10-19')).toBe('lundi 19 octobre');
    expect(iso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('selectors', () => {
  const now = new Date(2026, 9, 19);
  const data = [
    tx(1, '2026-09-01', 'in', 10000),
    tx(2, '2026-10-19', 'out', 3000),
    tx(3, '2026-10-19', 'in', 500),
    tx(4, '2026-10-10', 'out', 2000, 'transport'),
  ];

  it('computes month stats', () => {
    expect(monthStats(data, '2026-10')).toEqual({ inn: 500, out: 5000, net: -4500 });
  });

  it('builds a 30-day balance series', () => {
    const s = balanceSeries(data, now);
    expect(s.days).toHaveLength(30);
    expect(s.days[29]).toBe('2026-10-19');
    expect(s.pts[29]).toBe(10000 - 3000 + 500 - 2000);
    expect(s.start).toBe(10000);
    expect(s.diff).toBe(-4500);
    expect(s.path.startsWith('M')).toBe(true);
  });

  it('groups report rows by category', () => {
    const { rows, total } = reportRows({ ...initialState(), tx: data }, '2026-10', 'out');
    expect(total).toBe(5000);
    expect(rows.map((r) => r.id)).toEqual(['courses', 'transport']);
    expect(rows[0].pct).toBeCloseTo(60);
  });

  it('groups by day with net', () => {
    const g = groupByDay([data[1], data[2], data[3]]);
    expect(g).toHaveLength(2);
    expect(g[0].net).toBe(-2500);
  });
});
