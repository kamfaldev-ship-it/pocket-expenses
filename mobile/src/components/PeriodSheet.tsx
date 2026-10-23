import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { DateField } from './DateField';
import { SheetFrame, useGuardedClose } from './SheetFrame';
import { Button, Label } from './ui';
import { addDays, mkey, shiftMonth, today } from '@/lib/dates';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999, backgroundColor: t.card, borderWidth: 1.5, borderColor: t.line }}>
      <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: t.ink }}>{label}</Text>
    </Pressable>
  );
}

function Body({ closeRef }: { closeRef: React.MutableRefObject<() => void> }) {
  const t = useTheme();
  const { period, setRange, setMonth, closePeriodSheet } = useUI();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  const [err, setErr] = useState('');
  const requestClose = useGuardedClose(false, closePeriodSheet, closeRef);

  const apply = (a: string, b: string) => {
    if (a > b) return setErr('La date de fin doit être après la date de début.');
    Haptics.selectionAsync().catch(() => {});
    setRange({ from: a, to: b });
    closePeriodSheet();
  };

  const now = today();
  return (
    <SheetFrame title="Choisir une période" onClose={requestClose}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Aujourd’hui" onPress={() => apply(now, now)} />
        <Chip label="7 derniers jours" onPress={() => apply(addDays(now, -6), now)} />
        <Chip label="30 derniers jours" onPress={() => apply(addDays(now, -29), now)} />
        <Chip
          label="Ce mois"
          onPress={() => {
            setMonth(mkey(now));
            closePeriodSheet();
          }}
        />
        <Chip
          label="Mois dernier"
          onPress={() => {
            setMonth(shiftMonth(mkey(now), -1));
            closePeriodSheet();
          }}
        />
      </View>

      <Label>Du</Label>
      <DateField
        value={from}
        onChange={(d) => {
          setFrom(d);
          if (d > to) setTo(d);
          setErr('');
        }}
      />
      <Label>Au (même jour pour une seule journée)</Label>
      <DateField
        value={to}
        onChange={(d) => {
          setTo(d);
          setErr('');
        }}
      />

      <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
        {err}
      </Text>
      <Button label="Appliquer" onPress={() => apply(from, to)} style={{ marginTop: 12, paddingVertical: 16 }} />
    </SheetFrame>
  );
}

export function PeriodSheet() {
  const { periodSheet, closePeriodSheet } = useUI();
  const closeRef = useRef<() => void>(closePeriodSheet);
  return (
    <Modal visible={periodSheet} transparent animationType="slide" onRequestClose={() => closeRef.current()} statusBarTranslucent>
      {/* Mounted only while open so the dates restart from the active period each time. */}
      {periodSheet && <Body closeRef={closeRef} />}
    </Modal>
  );
}
