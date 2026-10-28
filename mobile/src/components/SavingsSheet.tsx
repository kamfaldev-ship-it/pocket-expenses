import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { AmountInput, field, parseAmount, SheetFrame, useGuardedClose } from './SheetFrame';
import { Button, Label, Segmented } from './ui';
import { today } from '@/lib/dates';
import { fcfa } from '@/lib/format';
import { newId } from '@/lib/ids';
import { availableBalance, bucketBalance, validateTransfer } from '@/lib/savings';
import { useStore } from '@/store';
import { useUI, type TransferType } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

const QUICK = [1000, 5000, 10000];

function Body({ closeRef }: { closeRef: React.MutableRefObject<() => void> }) {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { savingsSheet, closeSavings, showToast } = useUI();
  const [type, setType] = useState<TransferType>(savingsSheet.type);
  const [goalId, setGoalId] = useState<number | null>(savingsSheet.goalId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const deposit = type === 'deposit';
  const max = deposit ? availableBalance(state) : bucketBalance(state.savings, goalId);
  const requestClose = useGuardedClose(amount.trim() !== '' || note.trim() !== '', closeSavings, closeRef);

  const save = () => {
    const n = parseAmount(amount);
    const error = validateTransfer(state, type, n, goalId);
    if (error) return setErr(error);
    const entry = { id: newId(), goalId, type, amount: n, date: today(), note: note.trim() };
    dispatch({ type: 'saveSaving', entry });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeSavings();
    showToast(deposit ? `${fcfa(n)} mis en caisse` : `${fcfa(n)} retirés de la caisse`, () =>
      dispatch({ type: 'deleteSaving', id: entry.id }),
    );
  };

  const chips = [...QUICK.filter((v) => v <= max), ...(max > 0 ? [max] : [])].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <SheetFrame title={deposit ? 'Verser dans la caisse' : 'Retirer de la caisse'} onClose={requestClose}>
      <Segmented
        value={type}
        onChange={(v) => {
          setType(v);
          setErr('');
        }}
        options={[
          { value: 'deposit', label: 'Verser' },
          { value: 'withdraw', label: 'Retirer' },
        ]}
      />
      <AmountInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setErr('');
        }}
        color={t.savInk}
        autoFocus
        onSubmit={save}
      />
      <Text style={{ textAlign: 'center', fontFamily: fonts.body500, fontSize: 14, color: t.mute }}>
        {deposit ? 'Disponible' : goalId === null ? 'En caisse' : 'Dans cet objectif'} : {fcfa(max)}
      </Text>

      {state.goals.length > 0 && (
        <>
          <Label>{deposit ? 'Pour quel objectif ?' : 'Depuis quel objectif ?'}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[{ id: null as number | null, name: 'Sans objectif' }, ...state.goals].map((g) => {
              const on = g.id === goalId;
              return (
                <Pressable
                  key={String(g.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setGoalId(g.id);
                    setErr('');
                  }}
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: on ? t.savInk : t.savSoft,
                  }}>
                  <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: on ? (t.dark ? '#04201C' : '#fff') : t.savInk }}>{g.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {chips.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          {chips.map((v) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              onPress={() => {
                setAmount(String(v));
                setErr('');
              }}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 16,
                borderRadius: 999,
                backgroundColor: t.savSoft,
              }}>
              <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: t.savInk }}>
                {v === max && !QUICK.includes(v) ? 'Tout' : v.toLocaleString('fr-FR').replace(/ /g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Label>Note (facultatif)</Label>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={80}
        placeholder={deposit ? 'Ex. : fin de mois, prime…' : 'Ex. : imprévu, voyage…'}
        placeholderTextColor={t.mute}
        style={[field(t), { fontFamily: fonts.body400, color: t.ink }]}
      />

      <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
        {err}
      </Text>
      <Button label={deposit ? 'Verser dans la caisse' : 'Retirer de la caisse'} onPress={save} style={{ marginTop: 12, paddingVertical: 16 }} />
    </SheetFrame>
  );
}

export function SavingsSheet() {
  const { savingsSheet, closeSavings } = useUI();
  const closeRef = useRef<() => void>(closeSavings);
  return (
    <Modal
      key={savingsSheet.nonce}
      visible={savingsSheet.open}
      transparent
      animationType="slide"
      onRequestClose={() => closeRef.current()}
      statusBarTranslucent>
      <Body key={savingsSheet.nonce} closeRef={closeRef} />
    </Modal>
  );
}
