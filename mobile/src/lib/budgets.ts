import { mkey } from './dates';
import type { AppState, Category } from './types';

export type BudgetStatus = 'ok' | 'warn' | 'over';

export interface BudgetRow {
  cat: Category;
  limit: number;
  spent: number;
  ratio: number; // spent / limit, may exceed 1
  status: BudgetStatus;
}

export const WARN_AT = 0.8;

export const budgetStatus = (ratio: number): BudgetStatus => (ratio > 1 ? 'over' : ratio >= WARN_AT ? 'warn' : 'ok');

/** Spending against each category limit for `month`, most consumed first. */
export const budgetRows = (s: Pick<AppState, 'tx' | 'cats' | 'budgets'>, month: string): BudgetRow[] => {
  const spent = new Map<string, number>();
  s.tx.forEach((t) => {
    if (t.type === 'out' && mkey(t.date) === month) spent.set(t.cat, (spent.get(t.cat) ?? 0) + t.amount);
  });
  return s.cats
    .filter((c) => s.budgets[c.id] > 0)
    .map((cat) => {
      const limit = s.budgets[cat.id];
      const used = spent.get(cat.id) ?? 0;
      const ratio = used / limit;
      return { cat, limit, spent: used, ratio, status: budgetStatus(ratio) };
    })
    .sort((a, b) => b.ratio - a.ratio);
};
