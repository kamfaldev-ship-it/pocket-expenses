import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from '@/components/KeyboardDone';
import { Screen } from '@/components/Screen';
import { field, parseAmount } from '@/components/SheetFrame';
import { Button, Card, CatBadge } from '@/components/ui';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

export default function Budgets() {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { showToast } = useUI();
  const cats = state.cats.filter((c) => c.kind === 'out');
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(cats.map((c) => [c.id, state.budgets[c.id] ? String(state.budgets[c.id]) : ''])),
  );

  const save = () => {
    let changed = 0;
    cats.forEach((c) => {
      const raw = (texts[c.id] ?? '').trim();
      const next = raw ? parseAmount(raw) : null;
      const value = next && next > 0 ? next : null;
      if (value !== (state.budgets[c.id] ?? null)) {
        dispatch({ type: 'setBudget', cat: c.id, amount: value });
        changed++;
      }
    });
    Keyboard.dismiss();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Go back right away: the toast confirms on the screen the user lands on.
    router.back();
    showToast(changed ? 'Budgets enregistrés' : 'Aucun changement');
  };

  return (
    <Screen pushed>
      <KeyboardDoneBar />
      <Card style={{ marginTop: 0 }}>
        <Text style={{ fontFamily: fonts.body400, color: t.mute, marginBottom: 6 }}>
          Fixe une limite mensuelle pour les catégories où tu veux te surveiller. Tu es prévenu à 80 %.
        </Text>
        {cats.map((c, i) => (
          <View
            key={c.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
            <CatBadge cat={c} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>
              {c.name}
            </Text>
            <TextInput
              value={texts[c.id] ?? ''}
              inputAccessoryViewID={KEYBOARD_DONE_ID}
              onChangeText={(v) => setTexts((x) => ({ ...x, [c.id]: v.replace(/[^\d\s]/g, '') }))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={t.mute}
              accessibilityLabel={`Budget mensuel ${c.name} en FCFA`}
              style={[field(t), { width: 96, textAlign: 'right', fontFamily: fonts.body500, color: t.ink, paddingVertical: 11 }]}
            />
            <Text style={{ fontFamily: fonts.body500, fontSize: 13, color: t.mute }}>FCFA</Text>
          </View>
        ))}
        <Button label="Enregistrer" onPress={save} style={{ marginTop: 14 }} />
      </Card>
    </Screen>
  );
}
