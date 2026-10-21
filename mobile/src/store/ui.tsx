import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { mkey, today } from '@/lib/dates';
import type { Transaction } from '@/lib/types';

interface ToastState {
  msg: string;
  undo?: () => void;
}

export type TransferType = 'deposit' | 'withdraw';

interface UIValue {
  month: string;
  setMonth: (m: string) => void;
  sheet: { open: boolean; tx?: Transaction; nonce: number };
  openSheet: (tx?: Transaction) => void;
  closeSheet: () => void;
  savingsSheet: { open: boolean; type: TransferType; goalId: number | null; nonce: number };
  openSavings: (type: TransferType, goalId?: number | null) => void;
  closeSavings: () => void;
  toast: ToastState | null;
  showToast: (msg: string, undo?: () => void) => void;
  hideToast: () => void;
}

const Ctx = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(mkey(today()));
  const [sheet, setSheet] = useState<UIValue['sheet']>({ open: false, nonce: 0 });
  const [savingsSheet, setSavingsSheet] = useState<UIValue['savingsSheet']>({ open: false, type: 'deposit', goalId: null, nonce: 0 });
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

  const value: UIValue = {
    month,
    setMonth,
    sheet,
    openSheet: (tx) => setSheet((s) => ({ open: true, tx, nonce: s.nonce + 1 })),
    closeSheet: () => setSheet((s) => ({ ...s, open: false })),
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
