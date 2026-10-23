import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { isFullMonth, mkey, monthRange, periodLabel, today, type Period } from '@/lib/dates';
import type { Transaction } from '@/lib/types';

interface ToastState {
  msg: string;
  undo?: () => void;
}

export type TransferType = 'deposit' | 'withdraw';

/** What the home, report and history screens show: a calendar month or a custom range. */
export interface ActivePeriod extends Period {
  isMonth: boolean;
  label: string;
}

interface UIValue {
  month: string;
  /** Switches to a calendar month and leaves any custom range. */
  setMonth: (m: string) => void;
  range: Period | null;
  setRange: (r: Period | null) => void;
  period: ActivePeriod;
  periodSheet: boolean;
  openPeriodSheet: () => void;
  closePeriodSheet: () => void;
  sheet: { open: boolean; tx?: Transaction; nonce: number };
  openSheet: (tx?: Transaction) => void;
  closeSheet: () => void;
  budgetSheet: { open: boolean; catId: string; nonce: number };
  openBudget: (catId: string) => void;
  closeBudget: () => void;
  savingsSheet: { open: boolean; type: TransferType; goalId: number | null; nonce: number };
  openSavings: (type: TransferType, goalId?: number | null) => void;
  closeSavings: () => void;
  toast: ToastState | null;
  showToast: (msg: string, undo?: () => void) => void;
  hideToast: () => void;
}

const Ctx = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState(mkey(today()));
  const [range, setRange] = useState<Period | null>(null);
  const [periodSheet, setPeriodSheet] = useState(false);
  const [sheet, setSheet] = useState<UIValue['sheet']>({ open: false, nonce: 0 });
  const [savingsSheet, setSavingsSheet] = useState<UIValue['savingsSheet']>({ open: false, type: 'deposit', goalId: null, nonce: 0 });
  const [budgetSheet, setBudgetSheet] = useState<UIValue['budgetSheet']>({ open: false, catId: '', nonce: 0 });
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hideToast = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    clearTimeout(timer.current);
    setToast({ msg, undo });
    timer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const setMonth = useCallback((m: string) => {
    setMonthState(m);
    setRange(null);
  }, []);

  const base = range ?? monthRange(month);
  const period: ActivePeriod = {
    ...base,
    isMonth: isFullMonth(base),
    label: periodLabel(base),
  };

  const value: UIValue = {
    month,
    setMonth,
    range,
    setRange,
    period,
    periodSheet,
    openPeriodSheet: () => setPeriodSheet(true),
    closePeriodSheet: () => setPeriodSheet(false),
    sheet,
    openSheet: (tx) => setSheet((s) => ({ open: true, tx, nonce: s.nonce + 1 })),
    closeSheet: () => setSheet((s) => ({ ...s, open: false })),
    budgetSheet,
    openBudget: (catId) => setBudgetSheet((x) => ({ open: true, catId, nonce: x.nonce + 1 })),
    closeBudget: () => setBudgetSheet((x) => ({ ...x, open: false })),
    savingsSheet,
    openSavings: (type, goalId = null) => setSavingsSheet((x) => ({ open: true, type, goalId, nonce: x.nonce + 1 })),
    closeSavings: () => setSavingsSheet((x) => ({ ...x, open: false })),
    toast,
    showToast,
    hideToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI must be used inside UIProvider');
  return v;
}
