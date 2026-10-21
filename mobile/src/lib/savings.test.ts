import { availableBalance, availableLedger, goalProgress, monthlySaved, savingsBalance, totalWealth, validateTransfer } from './savings';
import type { SavingsEntry, Transaction } from './types';

const tx = (id: number, type: 'in' | 'out', amount: number, date = '2026-10-01'): Transaction => ({
  id,
  type,
  amount,
  cat: 'courses',
  date,
  note: '',
});
const sv = (id: number, type: 'deposit' | 'withdraw', amount: number, date = '2026-10-05', goalId: number | null = null): SavingsEntry => ({
  id,
  goalId,
  type,
  amount,
  date,
  note: '',
});

describe('savings pot', () => {
  const base = { tx: [tx(1, 'in', 50000), tx(2, 'out', 10000)], savings: [] as SavingsEntry[] };

  it('moves money from available to the pot without changing wealth', () => {
    expect(availableBalance(base)).toBe(40000);
    const after = { ...base, savings: [sv(1, 'deposit', 5000)] };
    expect(savingsBalance(after.savings)).toBe(5000);
    expect(availableBalance(after)).toBe(35000);
    expect(totalWealth(after)).toBe(totalWealth(base));
  });

  it('gives money back on withdrawal', () => {
    const s = { ...base, savings: [sv(1, 'deposit', 5000), sv(2, 'withdraw', 2000)] };
    expect(savingsBalance(s.savings)).toBe(3000);
    expect(availableBalance(s)).toBe(37000);
  });

  it('validates transfers', () => {
    expect(validateTransfer(base, 'deposit', 0)).toMatch(/supérieur à 0/);
    expect(validateTransfer(base, 'deposit', 40001)).toMatch(/solde disponible/);
    expect(validateTransfer(base, 'deposit', 40000)).toBeNull();
    expect(validateTransfer(base, 'withdraw', 1)).toMatch(/en caisse/);
    const s = { ...base, savings: [sv(1, 'deposit', 5000)] };
    expect(validateTransfer(s, 'withdraw', 5000)).toBeNull();
    expect(validateTransfer(s, 'withdraw', 5001)).toMatch(/en caisse/);
  });

  it('summarises the last 6 months', () => {
    const entries = [sv(1, 'deposit', 5000, '2026-10-05'), sv(2, 'deposit', 5000, '2026-09-05'), sv(3, 'withdraw', 1000, '2026-09-20')];
    const m = monthlySaved(entries, '2026-10', 6);
    expect(m.map((x) => x.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(m.map((x) => x.value)).toEqual([0, 0, 0, 0, 4000, 5000]);
  });

  it('exposes an available-balance ledger consistent with availableBalance', () => {
    const s = { ...base, savings: [sv(1, 'deposit', 5000), sv(2, 'withdraw', 1000)] };
    const total = availableLedger(s).reduce((t, x) => t + (x.type === 'in' ? x.amount : -x.amount), 0);
    expect(total).toBe(availableBalance(s));
  });

  it('computes goal progress', () => {
    expect(goalProgress(2500, 10000)).toBe(0.25);
    expect(goalProgress(20000, 10000)).toBe(1);
    expect(goalProgress(100, null)).toBeNull();
  });
});
