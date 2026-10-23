import { inRange, toPeriod, type PeriodInput } from './dates';
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

/** Spending against each category limit for a month key or period, most consumed first. */
export const budgetRows = (s: Pick<AppState, 'tx' | 'cats' | 'budgets'>, period: PeriodInput): BudgetRow[] => {
  const p = toPeriod(period);
  const spent = new Map<string, number>();
  s.tx.forEach((t) => {
    if (t.type === 'out' && inRange(t.date, p)) spent.set(t.cat, (spent.get(t.cat) ?? 0) + t.amount);
  });
  return s.cats
    .filter((c) => c.kind === 'out' && s.budgets[c.id] > 0)
    .map((cat) => {
      const limit = s.budgets[cat.id];
      const used = spent.get(cat.id) ?? 0;
      const ratio = used / limit;
      return { cat, limit, spent: used, ratio, status: budgetStatus(ratio) };
    })
    .sort((a, b) => b.ratio - a.ratio);
};

export interface BudgetSummary {
  limit: number;
  spent: number;
  ratio: number;
  status: BudgetStatus;
  rows: BudgetRow[];
}

/** All category limits added up, for the home card; null when no limit is set. */
export const budgetSummary = (rows: BudgetRow[]): BudgetSummary | null => {
  if (!rows.length) return null;
  const limit = rows.reduce((t, r) => t + r.limit, 0);
  const spent = rows.reduce((t, r) => t + r.spent, 0);
  const ratio = spent / limit;
  return { limit, spent, ratio, status: budgetStatus(ratio), rows };
};
