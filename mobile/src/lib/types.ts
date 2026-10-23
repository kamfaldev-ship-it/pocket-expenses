export type TxType = 'in' | 'out';
export type ThemePref = 'auto' | 'light' | 'dark';

export interface Category {
  id: string;
  /** Which kind of transaction can use this category. */
  kind: TxType;
  name: string;
  color: string;
  icon: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: TxType;
  cat: string;
  date: string; // YYYY-MM-DD
  note: string;
  /** File name of a receipt photo kept on the device (never a full path). */
  photo?: string;
}

/** A named target inside the savings pot (trip, emergency fund…). */
export interface SavingsGoal {
  id: number;
  name: string;
  target: number;
}

/** A transfer to (deposit) or from (withdraw) the savings pot. */
export interface SavingsEntry {
  id: number;
  goalId: number | null; // null = money in the pot not assigned to a goal
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
}

export type RuleKind = TxType | 'save';

/** A monthly rule that generates a transaction or a savings deposit. */
export interface RecurringRule {
  id: number;
  kind: RuleKind;
  amount: number;
  cat: string; // ignored for kind 'save'
  note: string;
  day: number; // 1-28
  startMonth: string; // YYYY-MM, first month the rule applies
  lastApplied: string | null; // YYYY-MM of the latest month generated
}

export interface AppState {
  cats: Category[];
  tx: Transaction[];
  theme: ThemePref;
  savings: SavingsEntry[];
  goals: SavingsGoal[];
  /** Monthly spending limit per category id. */
  budgets: Record<string, number>;
  recurring: RecurringRule[];
}
