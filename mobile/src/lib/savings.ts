import { mkey, shiftMonth, today } from './dates';
import { net } from './selectors';
import type { AppState, SavingsEntry, Transaction } from './types';

const signedEntry = (e: SavingsEntry) => (e.type === 'deposit' ? e.amount : -e.amount);

/** Money currently in the savings pot. */
export const savingsBalance = (entries: SavingsEntry[]) => entries.reduce((t, e) => t + signedEntry(e), 0);

/** Spendable balance: all transactions minus what sits in the pot. */
export const availableBalance = (s: Pick<AppState, 'tx' | 'savings'>) => net(s.tx) - savingsBalance(s.savings);

/** Total wealth = available + savings (independent of transfers). */
export const totalWealth = (s: Pick<AppState, 'tx' | 'savings'>) => net(s.tx);

export const savedInMonth = (entries: SavingsEntry[], month: string) =>
  savingsBalance(entries.filter((e) => mkey(e.date) === month));

/** Net savings per month for the last `n` months, oldest first. */
export const monthlySaved = (entries: SavingsEntry[], current = mkey(today()), n = 6) =>
  Array.from({ length: n }, (_, i) => {
    const key = shiftMonth(current, i - (n - 1));
    return { key, value: savedInMonth(entries, key) };
  });

/** Money sitting in one bucket of the pot: a goal, or `null` for the part with no goal. */
export const bucketBalance = (entries: SavingsEntry[], goalId: number | null) =>
  savingsBalance(entries.filter((e) => e.goalId === goalId));

/** Overall progress across all goals: Σ min(saved, target) / Σ target, or null without goals. */
export const goalsProgress = (s: Pick<AppState, 'savings' | 'goals'>) => {
  const target = s.goals.reduce((t, g) => t + g.target, 0);
  if (!(target > 0)) return null;
  const saved = s.goals.reduce((t, g) => t + Math.min(Math.max(bucketBalance(s.savings, g.id), 0), g.target), 0);
  return { target, progress: saved / target };
};

/** Progress toward the goal in [0, 1], or null when no goal is set. */
export const goalProgress = (balance: number, goal: number | null) =>
  goal && goal > 0 ? Math.min(Math.max(balance, 0) / goal, 1) : null;

/** Returns a French error message when the transfer is not allowed, otherwise null. */
export const validateTransfer = (
  s: Pick<AppState, 'tx' | 'savings'>,
  type: SavingsEntry['type'],
  amount: number,
  goalId: number | null = null,
): string | null => {
  if (!(amount > 0)) return 'Saisis un montant supérieur à 0.';
  if (type === 'deposit' && amount > availableBalance(s)) return 'Le montant dépasse ton solde disponible.';
  if (type === 'withdraw' && amount > bucketBalance(s.savings, goalId)) {
    return goalId === null ? 'Le montant dépasse ce qu’il y a en caisse.' : 'Le montant dépasse ce qu’il y a dans cet objectif.';
  }
  return null;
};

/**
 * Transactions plus savings transfers expressed as transactions (deposit = money out of
 * the available balance, withdrawal = money back). Used for the available-balance curve.
 */
export const availableLedger = (s: Pick<AppState, 'tx' | 'savings'>): Transaction[] => [
  ...s.tx,
  ...s.savings.map<Transaction>((e) => ({
    id: e.id,
    amount: e.amount,
    type: e.type === 'deposit' ? 'out' : 'in',
    cat: '',
    date: e.date,
    note: e.note,
  })),
];
