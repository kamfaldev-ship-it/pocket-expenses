import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import type { SavingsEntry, SavingsGoal, Transaction } from '@/lib/types';
import { useStore } from '.';
import { useUI } from './ui';

/** Delete a transaction with an undo toast. */
export function useDeleteTx() {
  const { dispatch } = useStore();
  const { showToast } = useUI();
  return useCallback(
    (tx: Transaction) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      dispatch({ type: 'deleteTx', id: tx.id });
      showToast('Transaction supprimée', () => dispatch({ type: 'saveTx', tx }));
    },
    [dispatch, showToast],
  );
}

/** Delete a savings movement with an undo toast. */
export function useDeleteSaving() {
  const { dispatch } = useStore();
  const { showToast } = useUI();
  return useCallback(
    (entry: SavingsEntry) => {
      dispatch({ type: 'deleteSaving', id: entry.id });
      showToast('Mouvement supprimé', () => dispatch({ type: 'saveSaving', entry }));
    },
    [dispatch, showToast],
  );
}

/** Delete a goal (its money stays in the pot) with an undo toast that re-attaches the movements. */
export function useDeleteGoal() {
  const { state, dispatch } = useStore();
  const { showToast } = useUI();
  return useCallback(
    (goal: SavingsGoal) => {
      const entryIds = state.savings.filter((e) => e.goalId === goal.id).map((e) => e.id);
      dispatch({ type: 'deleteGoal', id: goal.id });
      showToast('Objectif supprimé', () => dispatch({ type: 'restoreGoal', goal, entryIds }));
    },
    [state.savings, dispatch, showToast],
  );
}
