import { mkey, shiftMonth } from './dates';
import { newId } from './ids';
import type { AppState, RecurringRule, SavingsEntry, Transaction } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export interface Occurrence {
  rule: RecurringRule;
  month: string;
  date: string;
}

/** Occurrences that should exist by `todayStr` but have not been generated yet. */
export const dueOccurrences = (rules: RecurringRule[], todayStr: string): Occurrence[] => {
  const current = mkey(todayStr);
  const out: Occurrence[] = [];
  rules.forEach((rule) => {
    let month = rule.lastApplied ? shiftMonth(rule.lastApplied, 1) : rule.startMonth;
    if (month < rule.startMonth) month = rule.startMonth;
    for (; month <= current; month = shiftMonth(month, 1)) {
      const date = `${month}-${pad(rule.day)}`;
      if (date > todayStr) break; // day not reached yet in the current month
      out.push({ rule, month, date });
    }
  });
  return out;
};

/**
 * Generates everything that is due. Returns the same state object when nothing is
 * due, so callers can skip re-saving. Idempotent thanks to `lastApplied`.
 */
export const applyRecurring = (s: AppState, todayStr: string): AppState => {
  const due = dueOccurrences(s.recurring, todayStr);
  if (!due.length) return s;
  const tx: Transaction[] = [];
  const savings: SavingsEntry[] = [];
  const lastApplied = new Map<number, string>();
  due.forEach(({ rule, month, date }) => {
    if (rule.kind === 'save') {
      savings.push({ id: newId(), goalId: null, type: 'deposit', amount: rule.amount, date, note: rule.note });
    } else {
      tx.push({ id: newId(), type: rule.kind, amount: rule.amount, cat: rule.cat, date, note: rule.note });
    }
    lastApplied.set(rule.id, month);
  });
  return {
    ...s,
    tx: [...s.tx, ...tx],
    savings: [...s.savings, ...savings],
    recurring: s.recurring.map((r) => (lastApplied.has(r.id) ? { ...r, lastApplied: lastApplied.get(r.id)! } : r)),
  };
};

/** Month label helper for rule lists: first applicable date. */
export const nextDate = (rule: RecurringRule, todayStr: string) => {
  const thisMonth = `${mkey(todayStr)}-${pad(rule.day)}`;
  const applied = rule.lastApplied === mkey(todayStr);
  if (thisMonth > todayStr && !applied) return thisMonth;
  return `${shiftMonth(mkey(todayStr), 1)}-${pad(rule.day)}`;
};
