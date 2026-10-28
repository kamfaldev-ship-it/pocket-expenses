import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Keyboard, Modal, Text } from 'react-native';
import { AmountInput, parseAmount, SheetFrame, useGuardedClose } from './SheetFrame';
import { Button } from './ui';
import { fcfa } from '@/lib/format';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

function Body({ closeRef }: { closeRef: React.MutableRefObject<() => void> }) {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { budgetSheet, closeBudget, showToast } = useUI();
  const cat = state.cats.find((c) => c.id === budgetSheet.catId);
  const current = cat ? state.budgets[cat.id] : undefined;
  const [amount, setAmount] = useState(current ? String(current) : '');
  const [err, setErr] = useState('');
  const requestClose = useGuardedClose(amount !== (current ? String(current) : ''), closeBudget, closeRef);

  const commit = (value: number | null, msg: string) => {
    if (!cat) return;
    Keyboard.dismiss();
    dispatch({ type: 'setBudget', cat: cat.id, amount: value });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeBudget();
    showToast(msg);
  };

  const save = () => {
    const n = parseAmount(amount);
    if (!(n > 0)) return setErr('Saisis un montant supérieur à 0.');
    commit(n, 'Budget enregistré');
  };

  if (!cat) return null;
  return (
    <SheetFrame title={`Budget · ${cat.name}`} onClose={requestClose}>
      <Text style={{ fontFamily: fonts.body400, color: t.mute, marginLeft: 2 }}>
        Limite mensuelle pour cette catégorie. Tu es prévenu à 80 %.
        {current ? ` Actuellement : ${fcfa(current)}.` : ''}
      </Text>
      <AmountInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setErr('');
        }}
        color={t.brand}
        autoFocus
        onSubmit={save}
      />
      <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
        {err}
      </Text>
      <Button label="Enregistrer" onPress={save} style={{ marginTop: 12, paddingVertical: 16 }} />
      {current ? <Button label="Retirer la limite" variant="ghost" onPress={() => commit(null, 'Budget retiré')} style={{ marginTop: 10 }} /> : null}
    </SheetFrame>
  );
}

/** Quick editor for one category limit, opened from the report. */
export function BudgetSheet() {
  const { budgetSheet, closeBudget } = useUI();
  const closeRef = useRef<() => void>(closeBudget);
  return (
    <Modal key={budgetSheet.nonce} visible={budgetSheet.open} transparent animationType="slide" onRequestClose={() => closeRef.current()} statusBarTranslucent>
      <Body key={budgetSheet.nonce} closeRef={closeRef} />
    </Modal>
  );
}
