import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';
import { DEFAULT_CATS, initialState, STORAGE_KEY } from '@/lib/defaults';
import { normalizeState } from '@/lib/backup';
import { today } from '@/lib/dates';
import { cleanupOrphans } from '@/lib/photos';
import { applyRecurring } from '@/lib/recurring';
import type { AppState, Category, RecurringRule, SavingsEntry, SavingsGoal, ThemePref, Transaction, TxType } from '@/lib/types';

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'import'; state: AppState }
  | { type: 'saveTx'; tx: Transaction }
  | { type: 'deleteTx'; id: number }
  | { type: 'addTxs'; txs: Transaction[] }
  | { type: 'addCat'; cat: Category }
  | { type: 'deleteCat'; id: string }
  | { type: 'restoreCat'; cat: Category; index: number; moved: number[]; budget?: number }
  | { type: 'setTheme'; theme: ThemePref }
  | { type: 'saveSaving'; entry: SavingsEntry }
  | { type: 'deleteSaving'; id: number }
  | { type: 'saveGoal'; goal: SavingsGoal }
  | { type: 'deleteGoal'; id: number }
  | { type: 'restoreGoal'; goal: SavingsGoal; entryIds: number[] }
  | { type: 'setBudget'; cat: string; amount: number | null }
  | { type: 'saveRule'; rule: RecurringRule }
  | { type: 'deleteRule'; id: number }
  | { type: 'applyRecurring'; today: string }
  | { type: 'wipe' };

/** Where the transactions of a deleted category go: the "other" category of the same kind. */
const fallbackId = (cats: Category[], kind: TxType) => {
  const same = cats.filter((c) => c.kind === kind);
  return (same.find((c) => c.id === (kind === 'in' ? 'autre_in' : 'autre')) ?? same[same.length - 1])?.id;
};

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'hydrate':
    case 'import':
      return a.state;
    case 'saveTx': {
      const exists = s.tx.some((t) => t.id === a.tx.id);
      return { ...s, tx: exists ? s.tx.map((t) => (t.id === a.tx.id ? a.tx : t)) : [...s.tx, a.tx] };
    }
    case 'deleteTx':
      return { ...s, tx: s.tx.filter((t) => t.id !== a.id) };
    case 'addTxs':
      return { ...s, tx: [...s.tx, ...a.txs] };
    case 'addCat':
      return { ...s, cats: [...s.cats, a.cat] };
    case 'deleteCat': {
      const gone = s.cats.find((c) => c.id === a.id);
      if (!gone) return s;
      const cats = s.cats.filter((c) => c.id !== a.id);
      const fb = fallbackId(cats, gone.kind);
      if (!fb) return s; // the last category of a kind cannot be deleted
      const budgets = { ...s.budgets };
      delete budgets[a.id];
      return {
        ...s,
        cats,
        budgets,
        tx: s.tx.map((t) => (t.cat === a.id ? { ...t, cat: fb } : t)),
        recurring: s.recurring.map((r) => (r.cat === a.id ? { ...r, cat: fb } : r)),
      };
    }
    case 'restoreCat': {
      const cats = [...s.cats];
      cats.splice(a.index, 0, a.cat);
      const budgets = a.budget ? { ...s.budgets, [a.cat.id]: a.budget } : s.budgets;
      return { ...s, cats, budgets, tx: s.tx.map((t) => (a.moved.includes(t.id) ? { ...t, cat: a.cat.id } : t)) };
    }
    case 'setTheme':
      return { ...s, theme: a.theme };
    case 'saveSaving': {
      const exists = s.savings.some((e) => e.id === a.entry.id);
      return { ...s, savings: exists ? s.savings.map((e) => (e.id === a.entry.id ? a.entry : e)) : [...s.savings, a.entry] };
    }
    case 'deleteSaving':
      return { ...s, savings: s.savings.filter((e) => e.id !== a.id) };
    case 'saveGoal': {
      const exists = s.goals.some((g) => g.id === a.goal.id);
      return { ...s, goals: exists ? s.goals.map((g) => (g.id === a.goal.id ? a.goal : g)) : [...s.goals, a.goal] };
    }
    case 'deleteGoal':
      // The money stays in the pot, it just no longer belongs to a goal.
      return {
        ...s,
        goals: s.goals.filter((g) => g.id !== a.id),
        savings: s.savings.map((e) => (e.goalId === a.id ? { ...e, goalId: null } : e)),
      };
    case 'restoreGoal':
      return {
        ...s,
        goals: [...s.goals, a.goal],
        savings: s.savings.map((e) => (a.entryIds.includes(e.id) ? { ...e, goalId: a.goal.id } : e)),
      };
    case 'setBudget': {
      const budgets = { ...s.budgets };
      if (a.amount && a.amount > 0) budgets[a.cat] = a.amount;
      else delete budgets[a.cat];
      return { ...s, budgets };
    }
    case 'saveRule': {
      const exists = s.recurring.some((r) => r.id === a.rule.id);
      return { ...s, recurring: exists ? s.recurring.map((r) => (r.id === a.rule.id ? a.rule : r)) : [...s.recurring, a.rule] };
    }
    case 'deleteRule':
      return { ...s, recurring: s.recurring.filter((r) => r.id !== a.id) };
    case 'applyRecurring':
      return applyRecurring(s, a.today);
    case 'wipe':
      return { ...initialState(), cats: DEFAULT_CATS.map((c) => ({ ...c })), theme: s.theme };
  }
}

/** Loads persisted data (v1 or v2); invalid items are dropped, bad input falls back to defaults. */
export function parseStored(raw: string | null): AppState {
  try {
    return (raw && normalizeState(JSON.parse(raw), false)) || initialState();
  } catch {
    return initialState();
  }
}

const isSavedState = (raw: string) => {
  try {
    return normalizeState(JSON.parse(raw), false) !== null;
  } catch {
    return false;
  }
};

interface StoreValue {
  state: AppState;
  dispatch: (a: Action) => void;
  ready: boolean;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const loaded = parseStored(raw);
        dispatch({ type: 'hydrate', state: loaded });
        // Housekeeping only from real saved data: a fallback state must never delete receipts.
        if (raw && isSavedState(raw)) cleanupOrphans(loaded.tx);
        dispatch({ type: 'applyRecurring', today: today() });
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
        setReady(true);
      });
  }, []);

  // Catch up on due recurring rules whenever the app returns to the foreground.
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active' && hydrated.current) dispatch({ type: 'applyRecurring', today: today() });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (hydrated.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  return <Ctx.Provider value={{ state, dispatch, ready }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
