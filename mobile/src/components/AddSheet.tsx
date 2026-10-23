import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { CatPicker } from './CatPicker';
import { DateField } from './DateField';
import { Glyph } from './Icon';
import { PhotoViewer } from './PhotoViewer';
import { AmountInput, field, parseAmount, SheetFrame, useGuardedClose, useScrollToEnd } from './SheetFrame';
import { Button, Label, Segmented } from './ui';
import { inRange, mkey, today } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { photoUri, savePhoto } from '@/lib/photos';
import type { TxType } from '@/lib/types';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

function SheetBody({ closeRef }: { closeRef: React.MutableRefObject<() => void> }) {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { sheet, closeSheet, setMonth, period, showToast } = useUI();
  const editing = sheet.tx;

  const [type, setType] = useState<TxType>(editing?.type ?? 'out');
  const [cat, setCat] = useState(editing?.cat ?? '');
  const [photo, setPhoto] = useState<string | undefined>(editing?.photo);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [note, setNote] = useState(editing?.note ?? '');
  const [err, setErr] = useState('');

  // Only the categories of the chosen type. A category kept from before the split stays
  // selectable while editing, so saving never silently changes it.
  const kept = editing && type === editing.type ? state.cats.find((c) => c.id === editing.cat && c.kind !== type) : undefined;
  const options = [...state.cats.filter((c) => c.kind === type), ...(kept ? [kept] : [])];
  const catValue = options.some((c) => c.id === cat) ? cat : (options[0]?.id ?? 'autre');

  const dirty = editing
    ? amount !== String(editing.amount) ||
      note !== editing.note ||
      type !== editing.type ||
      catValue !== editing.cat ||
      date !== editing.date ||
      photo !== editing.photo
    : amount.trim() !== '' || note.trim() !== '' || photo !== undefined;
  const requestClose = useGuardedClose(dirty, closeSheet, closeRef);

  const save = () => {
    const n = parseAmount(amount);
    if (!(n > 0)) {
      setErr('Saisis un montant supérieur à 0.');
      return;
    }
    dispatch({
      type: 'saveTx',
      tx: { id: editing?.id ?? newId(), amount: n, type, cat: catValue, date: date || today(), note: note.trim(), ...(photo ? { photo } : {}) },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeSheet();
    // Jump to the month of the new operation only when it would not be visible otherwise.
    if (!inRange(date, period)) setMonth(mkey(date));
    showToast(editing ? 'Opération modifiée' : 'Opération enregistrée');
  };

  return (
    <SheetFrame title={editing ? 'Modifier l’opération' : 'Ajouter une opération'} onClose={requestClose}>
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
      <CatPicker cats={options} value={catValue} onChange={setCat} />

      <Label>Date</Label>
      <DateField value={date} onChange={setDate} />

      <Label>Note ou description</Label>
      <NoteInput value={note} onChange={setNote} />

      <Label>Photo (reçu, achat)</Label>
      <PhotoField photo={photo} onChange={setPhoto} onError={setErr} />

      <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
        {err}
      </Text>
      <Button label="Enregistrer" onPress={save} style={{ marginTop: 12, paddingVertical: 16 }} />
    </SheetFrame>
  );
}

/** Take or pick a photo and keep it on the device; the transaction stores only the file name. */
function PhotoField({ photo, onChange, onError }: { photo?: string; onChange: (p: string | undefined) => void; onError: (m: string) => void }) {
  const t = useTheme();
  const [view, setView] = useState<string | null>(null);

  const add = async (from: 'camera' | 'library') => {
    try {
      if (from === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return onError('Autorise l’appareil photo dans les réglages du téléphone.');
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const res = from === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      onChange(savePhoto(res.assets[0].uri));
      onError('');
    } catch {
      onError('Impossible d’ajouter la photo. Réessaie.');
    }
  };

  if (photo) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voir la photo" onPress={() => setView(photo)}>
          <Image source={{ uri: photoUri(photo) }} style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: t.line }} contentFit="cover" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(undefined)}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.outSoft }}>
          <Glyph name="trash" color={t.out} />
          <Text style={{ fontFamily: fonts.body600, color: t.out }}>Retirer</Text>
        </Pressable>
        <PhotoViewer name={view} onClose={() => setView(null)} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {(
        [
          ['camera', 'Prendre une photo'],
          ['library', 'Galerie'],
        ] as const
      ).map(([k, label]) => (
        <Pressable
          key={k}
          accessibilityRole="button"
          onPress={() => add(k)}
          style={[
            field(t),
            { flex: k === 'camera' ? 2 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, paddingVertical: 10 },
          ]}>
          <Glyph name={k === 'camera' ? 'camera' : 'plus'} color={t.brand} />
          <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: t.ink }}>{label}</Text>
        </Pressable>
      ))}
    </View>
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
