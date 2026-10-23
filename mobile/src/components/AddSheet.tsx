import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { CatPicker } from './CatPicker';
import { AmountInput, field, parseAmount, SheetFrame, useGuardedClose, useScrollToEnd } from './SheetFrame';
import { Button, Label, Segmented } from './ui';
import { dayMonthShort, iso, mkey, parseDate, today } from '@/lib/dates';
import { newId } from '@/lib/ids';
import type { TxType } from '@/lib/types';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

function SheetBody({ closeRef }: { closeRef: React.MutableRefObject<() => void> }) {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { sheet, closeSheet, setMonth, showToast } = useUI();
  const editing = sheet.tx;

  const [type, setType] = useState<TxType>(editing?.type ?? 'out');
  const [cat, setCat] = useState(editing?.cat ?? (state.cats[1] ?? state.cats[0]).id);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [note, setNote] = useState(editing?.note ?? '');
  const [err, setErr] = useState('');

  const dirty = editing
    ? amount !== String(editing.amount) || note !== editing.note || type !== editing.type || cat !== editing.cat || date !== editing.date
    : amount.trim() !== '' || note.trim() !== '';
  const requestClose = useGuardedClose(dirty, closeSheet, closeRef);

  const save = () => {
    const n = parseAmount(amount);
    if (!(n > 0)) {
      setErr('Saisis un montant supérieur à 0.');
      return;
    }
    dispatch({
      type: 'saveTx',
      tx: { id: editing?.id ?? newId(), amount: n, type, cat, date: date || today(), note: note.trim() },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeSheet();
    setMonth(mkey(date));
    showToast(editing ? 'Transaction modifiée' : 'Transaction enregistrée');
  };

  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: parseDate(date),
      mode: 'date',
      onChange: (_, d) => d && setDate(iso(d)),
    });

  return (
    <SheetFrame title={editing ? 'Modifier la transaction' : 'Nouvelle transaction'} onClose={requestClose}>
      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'out', label: 'Sortie' },
          { value: 'in', label: 'Entrée' },
        ]}
      />
      <AmountInput
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setErr('');
        }}
        color={type === 'in' ? t.inn : t.out}
        autoFocus={!editing}
        onSubmit={save}
      />

      <Label>Catégorie</Label>
      <CatPicker cats={state.cats} value={cat} onChange={setCat} />

      <Label>Date</Label>
      {Platform.OS === 'ios' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <DateTimePicker
            value={parseDate(date)}
            mode="date"
            display="compact"
            locale="fr-FR"
            themeVariant={t.dark ? 'dark' : 'light'}
            onChange={(_, d) => d && setDate(iso(d))}
          />
        </View>
      ) : (
        <Pressable onPress={openAndroidPicker} style={field(t)}>
          <Text style={{ fontFamily: fonts.body500, color: t.ink }}>
            {dayMonthShort(date)} {date.slice(0, 4)}
          </Text>
        </Pressable>
      )}

      <Label>Note ou description</Label>
      <NoteInput value={note} onChange={setNote} />

      <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
        {err}
      </Text>
      <Button label="Enregistrer" onPress={save} style={{ marginTop: 12, paddingVertical: 16 }} />
    </SheetFrame>
  );
}

/** Child of SheetFrame so it can reach its scroll context. */
function NoteInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  const scrollToEnd = useScrollToEnd();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      onFocus={scrollToEnd}
      maxLength={300}
      placeholder="Ex. : paiement client, détail des courses, motif…"
      placeholderTextColor={t.mute}
      style={[field(t), { minHeight: 84, textAlignVertical: 'top', fontFamily: fonts.body400, color: t.ink }]}
    />
  );
}

export function AddSheet() {
  const { sheet, closeSheet } = useUI();
  const closeRef = useRef<() => void>(closeSheet);
  return (
    <Modal
      visible={sheet.open}
      transparent
      animationType="slide"
      onRequestClose={() => closeRef.current()}
      statusBarTranslucent>
      {/* A fresh form per opening, so no state leaks between sessions. */}
      <SheetBody key={sheet.nonce} closeRef={closeRef} />
    </Modal>
  );
}
