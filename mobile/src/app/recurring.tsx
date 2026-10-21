import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { confirmAction } from '@/components/confirm';
import { Glyph } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { field, parseAmount } from '@/components/SheetFrame';
import { Button, Card, CatBadge, Empty, H3, Label, Segmented } from '@/components/ui';
import { dayMonthShort, mkey, today } from '@/lib/dates';
import { fcfa } from '@/lib/format';
import { newId } from '@/lib/ids';
import { nextDate } from '@/lib/recurring';
import { findCat } from '@/lib/selectors';
import type { RecurringRule, RuleKind } from '@/lib/types';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';
import { CatPicker } from '@/components/CatPicker';

const KIND_LABEL: Record<RuleKind, string> = { out: 'Sortie', in: 'Entrée', save: 'Caisse' };

export default function Recurring() {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { showToast } = useUI();

  const [kind, setKind] = useState<RuleKind>('save');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState(state.cats[0].id);
  const [err, setErr] = useState('');

  const add = () => {
    const n = parseAmount(amount);
    const d = parseInt(day, 10);
    if (!(n > 0)) return setErr('Saisis un montant supérieur à 0.');
    if (!(d >= 1 && d <= 28)) return setErr('Choisis un jour entre 1 et 28.');
    const rule: RecurringRule = {
      id: newId(),
      kind,
      amount: n,
      cat: kind === 'save' ? 'autre' : cat,
      note: note.trim() || (kind === 'save' ? 'Épargne automatique' : ''),
      day: d,
      startMonth: mkey(today()),
      lastApplied: null,
    };
    dispatch({ type: 'saveRule', rule });
    // Generate this month's occurrence right away if the day has already passed.
    dispatch({ type: 'applyRecurring', today: today() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setAmount('');
    setNote('');
    setErr('');
    showToast('Règle ajoutée');
  };

  const remove = (r: RecurringRule) => {
    const doDelete = () => {
      dispatch({ type: 'deleteRule', id: r.id });
      showToast('Règle supprimée', () => dispatch({ type: 'saveRule', rule: r }));
    };
    confirmAction('Supprimer cette règle ?', 'Les mouvements déjà créés sont conservés.', 'Supprimer', doDelete);
  };

  return (
    <Screen pushed>
      <Text style={{ fontFamily: fonts.body400, fontSize: 15, color: t.mute, marginHorizontal: 4, marginBottom: 12 }}>
        Ces règles créent chaque mois une transaction ou un versement en caisse, à la date choisie.
      </Text>

      {state.recurring.length === 0 ? (
        <Card style={{ marginTop: 0 }}>
          <Empty title="Aucune règle pour l'instant" text="Ajoute ton loyer, un abonnement ou un versement mensuel en caisse." />
        </Card>
      ) : (
        state.recurring.map((r) => {
          const c = findCat(state.cats, r.cat);
          return (
            <View
              key={r.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: t.card,
                borderColor: t.line,
                borderWidth: 1,
                borderRadius: 22,
                paddingVertical: 10,
                paddingLeft: 14,
                paddingRight: 4,
                marginBottom: 8,
              }}>
              {r.kind === 'save' ? (
                <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: t.savSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph name="jar" color={t.savInk} />
                </View>
              ) : (
                <CatBadge cat={c} />
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>
                  {r.note || c.name}
                </Text>
                <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>
                  {KIND_LABEL[r.kind]} · le {r.day} du mois · prochain {dayMonthShort(nextDate(r, today()))}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.display700, fontSize: 16, color: r.kind === 'in' ? t.inn : r.kind === 'save' ? t.savInk : t.out }}>
                {r.kind === 'in' ? '+' : r.kind === 'save' ? '' : '−'}
                {fcfa(r.amount)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Supprimer la règle ${r.note || c.name}`}
                onPress={() => remove(r)}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Glyph name="trash" color={t.mute} size={18} />
              </Pressable>
            </View>
          );
        })
      )}

      <Card>
        <H3 style={{ marginBottom: 12 }}>Nouvelle règle</H3>
        <Segmented<RuleKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'save', label: 'Caisse' },
            { value: 'out', label: 'Sortie' },
            { value: 'in', label: 'Entrée' },
          ]}
        />
        <Label>Montant (FCFA)</Label>
        <TextInput
          value={amount}
          onChangeText={(v) => {
            setAmount(v.replace(/[^\d\s]/g, ''));
            setErr('');
          }}
          keyboardType="number-pad"
          placeholder="Ex. : 5 000"
          placeholderTextColor={t.mute}
          accessibilityLabel="Montant mensuel en FCFA"
          style={[field(t), { fontFamily: fonts.body500, color: t.ink }]}
        />
        <Label>Jour du mois (1 à 28)</Label>
        <TextInput
          value={day}
          onChangeText={(v) => {
            setDay(v.replace(/\D/g, '').slice(0, 2));
            setErr('');
          }}
          keyboardType="number-pad"
          accessibilityLabel="Jour du mois"
          style={[field(t), { fontFamily: fonts.body500, color: t.ink, width: 96 }]}
        />
        {kind !== 'save' && (
          <>
            <Label>Catégorie</Label>
            <CatPicker cats={state.cats} value={cat} onChange={setCat} />
          </>
        )}
        <Label>Libellé (facultatif)</Label>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={60}
          placeholder={kind === 'save' ? 'Épargne automatique' : 'Ex. : loyer, abonnement…'}
          placeholderTextColor={t.mute}
          style={[field(t), { fontFamily: fonts.body400, color: t.ink }]}
        />
        <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
          {err}
        </Text>
        <Button label="Ajouter la règle" onPress={add} style={{ marginTop: 10 }} />
      </Card>
    </Screen>
  );
}
