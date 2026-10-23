import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Glyph } from '@/components/Icon';
import { MonthlyBars } from '@/components/MonthlyBars';
import { Screen } from '@/components/Screen';
import { SavingsRing } from '@/components/SavingsRing';
import { parseAmount, field } from '@/components/SheetFrame';
import { Button, Card, Empty, H3, Label } from '@/components/ui';
import { dayMonthShort, mkey, today } from '@/lib/dates';
import { FEATURES } from '@/lib/features';
import { fcfa } from '@/lib/format';
import { newId } from '@/lib/ids';
import { bucketBalance, goalProgress, goalsProgress, monthlySaved, savedInMonth, savingsBalance } from '@/lib/savings';
import { useStore } from '@/store';
import { useDeleteGoal, useDeleteSaving } from '@/store/actions';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

export default function Savings() {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { openSavings, showToast } = useUI();
  const deleteSaving = useDeleteSaving();
  const deleteGoal = useDeleteGoal();

  const balance = savingsBalance(state.savings);
  const overall = goalsProgress(state);
  const month = mkey(today());
  const thisMonth = savedInMonth(state.savings, month);
  const bars = monthlySaved(state.savings, month, 6);
  const entries = [...state.savings].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 30);

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalErr, setGoalErr] = useState('');
  const canAddGoal = FEATURES.multiGoals || state.goals.length === 0;
  const goalLabel = (id: number | null) => state.goals.find((g) => g.id === id)?.name;

  const addGoal = () => {
    const name = goalName.trim();
    const target = parseAmount(goalTarget);
    if (!name) return setGoalErr('Donne un nom à ton objectif.');
    if (state.goals.some((g) => g.name.toLowerCase() === name.toLowerCase())) return setGoalErr('Cet objectif existe déjà.');
    if (!(target > 0)) return setGoalErr('Saisis un montant à atteindre supérieur à 0.');
    dispatch({ type: 'saveGoal', goal: { id: newId(), name, target } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setGoalName('');
    setGoalTarget('');
    setGoalErr('');
    showToast('Objectif créé');
  };

  return (
    <Screen pushed>
      <Card style={{ marginTop: 0, alignItems: 'stretch' }}>
        <SavingsRing balance={balance} goal={overall?.target ?? null} progress={overall?.progress ?? null} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Button label="Verser" onPress={() => openSavings('deposit')} style={{ flex: 1 }} />
          <Button
            label="Retirer"
            variant="ghost"
            onPress={() => (balance > 0 ? openSavings('withdraw') : showToast('La caisse est vide'))}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <H3>Épargné ces 6 mois</H3>
          <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: t.savInk }}>
            {thisMonth >= 0 ? '+' : '−'}
            {fcfa(Math.abs(thisMonth))} ce mois-ci
          </Text>
        </View>
        <MonthlyBars data={bars} />
      </Card>

      <Card>
        <H3 style={{ marginBottom: 4 }}>Objectifs</H3>
        <Text style={{ fontFamily: fonts.body400, color: t.mute, marginBottom: 6 }}>
          Réserve une partie de la caisse à un projet : voyage, urgence, achat. C{'’'}est facultatif.
        </Text>
        {state.goals.map((g, i) => {
          const saved = bucketBalance(state.savings, g.id);
          const p = goalProgress(saved, g.target) ?? 0;
          const done = saved >= g.target;
          return (
            <View key={g.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${g.name} : ${fcfa(saved)} sur ${fcfa(g.target)}. Verser dans cet objectif`}
                  onPress={() => openSavings('deposit', g.id)}
                  style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>
                      {g.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.display700, fontSize: 15, color: done ? t.savInk : t.ink }}>
                      {fcfa(saved)} <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>/ {fcfa(g.target)}</Text>
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 9, backgroundColor: t.line, overflow: 'hidden', marginTop: 8 }}>
                    <View style={{ width: `${Math.round(p * 100)}%`, height: '100%', borderRadius: 9, backgroundColor: t.sav }} />
                  </View>
                  <Text style={{ fontFamily: fonts.body500, fontSize: 12.5, color: done ? t.savInk : t.mute, marginTop: 4 }}>
                    {done ? 'Objectif atteint' : `${Math.round(p * 100)} % · reste ${fcfa(g.target - Math.max(saved, 0))}`}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer l’objectif ${g.name}`}
                  onPress={() => deleteGoal(g)}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Glyph name="trash" color={t.mute} size={18} />
                </Pressable>
              </View>
            </View>
          );
        })}
        {canAddGoal && (
          <>
            <Label>Nouvel objectif</Label>
            <TextInput
              value={goalName}
              onChangeText={(v) => {
                setGoalName(v);
                setGoalErr('');
              }}
              maxLength={24}
              placeholder="Nom (ex. Voyage)"
              placeholderTextColor={t.mute}
              accessibilityLabel="Nom de l’objectif"
              style={[field(t), { fontFamily: fonts.body500, color: t.ink }]}
            />
            <TextInput
              value={goalTarget}
              onChangeText={(v) => {
                setGoalTarget(v.replace(/[^\d\s]/g, ''));
                setGoalErr('');
              }}
              keyboardType="number-pad"
              placeholder="Montant à atteindre (ex. 200 000)"
              placeholderTextColor={t.mute}
              accessibilityLabel="Montant de l’objectif en FCFA"
              style={[field(t), { fontFamily: fonts.body500, color: t.ink, marginTop: 10 }]}
            />
            <Text accessibilityRole="alert" style={{ color: t.out, fontSize: 13, marginTop: 8, marginLeft: 4, minHeight: 16 }}>
              {goalErr}
            </Text>
            <Button label="Créer l’objectif" variant="ghost" onPress={addGoal} style={{ marginTop: 6 }} />
          </>
        )}
      </Card>

      <Text accessibilityRole="header" style={{ fontFamily: fonts.display700, fontSize: 19, color: t.ink, marginTop: 22, marginBottom: 12, marginLeft: 4 }}>
        Mouvements
      </Text>
      {entries.length === 0 ? (
        <Card style={{ marginTop: 0 }}>
          <Empty title="La caisse est vide" text="Mets de côté une petite somme chaque mois : elle sera retirée de ton solde disponible.">
            <Button label="Faire un premier versement" onPress={() => openSavings('deposit')} style={{ marginTop: 16 }} />
          </Empty>
        </Card>
      ) : (
        entries.map((e) => {
          const dep = e.type === 'deposit';
          return (
            <View
              key={e.id}
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
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: t.savSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Glyph name={dep ? 'down' : 'up'} color={t.savInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>{dep ? 'Versement' : 'Retrait'}</Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>
                  {dayMonthShort(e.date)}
                  {goalLabel(e.goalId) ? ` · ${goalLabel(e.goalId)}` : ''}
                  {e.note ? ` · ${e.note}` : ''}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.display700, fontSize: 16, color: dep ? t.savInk : t.ink }}>
                {dep ? '+' : '−'}
                {fcfa(e.amount)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Supprimer le ${dep ? 'versement' : 'retrait'} de ${fcfa(e.amount)}`}
                onPress={() => deleteSaving(e)}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Glyph name="trash" color={t.mute} size={18} />
              </Pressable>
            </View>
          );
        })
      )}
    </Screen>
  );
}
