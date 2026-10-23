import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from '@/components/Icon';
import { LineChart } from '@/components/LineChart';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Screen } from '@/components/Screen';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, Card, Empty, H3, shadow } from '@/components/ui';
import { budgetRows } from '@/lib/budgets';
import { dailyAllowance } from '@/lib/daily';
import { mkey, today } from '@/lib/dates';
import { fcfa, fcfaSigned, nf } from '@/lib/format';
import { balanceSeries, cmp, demoTransactions, monthStats } from '@/lib/selectors';
import { availableBalance, availableLedger, goalsProgress, savingsBalance } from '@/lib/savings';
import { useDeleteTx } from '@/store/actions';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';
import { useMemo } from 'react';

function Stat({ kind, value }: { kind: 'in' | 'out'; value: number }) {
  const t = useTheme();
  const isIn = kind === 'in';
  return (
    <View
      style={[
        { flex: 1, backgroundColor: t.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: t.line },
        shadow(t),
      ]}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          backgroundColor: isIn ? t.inSoft : t.outSoft,
        }}>
        <Glyph name={isIn ? 'up' : 'down'} color={isIn ? t.inn : t.out} />
      </View>
      <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>{isIn ? 'Entrées' : 'Sorties'}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ fontFamily: fonts.display700, fontSize: 22, letterSpacing: -0.5, color: t.ink, marginTop: 2 }}>
        {fcfa(value)}
      </Text>
    </View>
  );
}

export default function Home() {
  const t = useTheme();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useStore();
  const { month, setMonth, openSheet } = useUI();
  const deleteTx = useDeleteTx();

  const { tx, savings } = state;
  const total = availableBalance(state);
  const pot = savingsBalance(state.savings);
  const potProgress = goalsProgress(state)?.progress ?? null;
  const stats = monthStats(state.tx, month);
  const series = useMemo(() => balanceSeries(availableLedger({ tx, savings })), [tx, savings]);
  const alerts = budgetRows(state, month).filter((b) => b.status !== 'ok');
  const over = alerts.filter((b) => b.status === 'over');
  const daily = month === mkey(today()) ? dailyAllowance(total) : null;
  const recent = [...state.tx].sort(cmp).slice(0, 4);

  const hero = (
    <LinearGradient
      colors={t.hero}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={{
        paddingTop: insets.top + 18,
        paddingHorizontal: 20,
        paddingBottom: 74,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
      }}>
      <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, right: -90, top: -80, backgroundColor: 'rgba(255,255,255,0.12)' }} />
      <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, left: -70, bottom: -60, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="wallet" color="#fff" />
          </View>
          <Text style={{ fontFamily: fonts.display800, fontSize: 20, letterSpacing: -0.4, color: '#fff' }}>Pocket</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MonthSwitcher month={month} onChange={setMonth} onHero />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            hitSlop={6}
            onPress={() => router.push('/settings')}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'transparent',
            })}>
            <Glyph name="settings" color="#fff" />
          </Pressable>
        </View>
      </View>
      <Animated.View entering={reduce ? undefined : FadeInDown.duration(800)} style={{ alignItems: 'center', marginTop: 30 }}>
        <Text style={{ fontFamily: fonts.body500, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Disponible</Text>
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={{ fontFamily: fonts.display800, fontSize: 48, letterSpacing: -1.7, color: '#fff', marginTop: 6 }}>
          {total < 0 ? '−' : ''}
          {nf(Math.abs(total))}
          <Text style={{ fontSize: 22, letterSpacing: 0, opacity: 0.55 }}>{' FCFA'}</Text>
        </Text>
        <View style={{ marginTop: 10, backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 }}>
          <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: '#fff' }}>
            {!daily
              ? `${fcfaSigned(stats.net)} sur le mois`
              : daily.empty
                ? 'Plus rien à dépenser ce mois-ci'
                : daily.daysLeft === 1
                  ? `${fcfa(daily.perDay)} à dépenser aujourd\u2019hui`
                  : `≈ ${fcfa(daily.perDay)} par jour jusqu\u2019à la fin du mois`}
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );

  return (
    <Screen header={hero}>
      <Text style={{ fontFamily: fonts.display700, fontSize: 19, color: t.ink, marginLeft: 4, marginBottom: 12 }}>Ce mois-ci</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat kind="in" value={stats.inn} />
        <Stat kind="out" value={stats.out} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Caisse économies, ${fcfa(pot)} en caisse. Ouvrir`}
        onPress={() => router.push('/savings')}
        style={({ pressed }) => [
          {
            marginTop: 12,
            backgroundColor: t.card,
            borderColor: t.line,
            borderWidth: 1,
            borderRadius: 24,
            padding: 16,
            opacity: pressed ? 0.85 : 1,
          },
          shadow(t),
        ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: t.savSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="jar" color={t.savInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>En caisse</Text>
            <Text style={{ fontFamily: fonts.display700, fontSize: 20, letterSpacing: -0.4, color: t.ink }}>{fcfa(pot)}</Text>
          </View>
          <Glyph name="right" color={t.mute} />
        </View>
        {potProgress !== null && (
          <View style={{ height: 6, borderRadius: 9, backgroundColor: t.line, overflow: 'hidden', marginTop: 12 }}>
            <View style={{ width: `${Math.round(potProgress * 100)}%`, height: '100%', borderRadius: 9, backgroundColor: t.sav }} />
          </View>
        )}
        {state.savings.length === 0 && (
          <Text style={{ fontFamily: fonts.body500, fontSize: 13, color: t.savInk, marginTop: 10 }}>
            Mets un peu d{'\u2019'}argent de côté pour commencer.
          </Text>
        )}
      </Pressable>
      {alerts.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Budgets : ${over.length} dépassé${over.length > 1 ? 's' : ''}, ${alerts.length - over.length} proche${alerts.length - over.length > 1 ? 's' : ''} de la limite. Ouvrir le rapport`}
          onPress={() => router.navigate('/report')}
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: over.length ? t.outSoft : t.card,
            borderColor: over.length ? t.out : t.warn,
            borderWidth: 1,
            borderRadius: 20,
            paddingVertical: 12,
            paddingHorizontal: 16,
            minHeight: 44,
          }}>
          <Text style={{ flex: 1, fontFamily: fonts.body600, fontSize: 14, color: over.length ? t.out : t.warnInk }}>
            {over.length
              ? `Budget dépassé : ${over.map((b) => b.cat.name).join(', ')}`
              : `Proche de la limite : ${alerts.map((b) => b.cat.name).join(', ')}`}
          </Text>
          <Glyph name="right" color={t.mute} />
        </Pressable>
      )}
      <Card>
        <H3>Solde sur 30 jours</H3>
        <LineChart series={series} />
      </Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12, marginHorizontal: 4 }}>
        <Text style={{ fontFamily: fonts.display700, fontSize: 19, color: t.ink }}>Dernières transactions</Text>
        <Pressable onPress={() => router.navigate('/history')} hitSlop={8}>
          <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>Tout voir</Text>
        </Pressable>
      </View>
      {recent.length ? (
        recent.map((x) => <TransactionRow key={x.id} tx={x} cats={state.cats} onEdit={openSheet} onDelete={deleteTx} />)
      ) : (
        <Card>
          <Empty title="Aucune transaction pour l'instant" text="Ajoute ta première entrée ou sortie avec le bouton +.">
            <Button
              label="Charger des exemples"
              onPress={() => dispatch({ type: 'addTxs', txs: demoTransactions(state.cats) })}
              style={{ marginTop: 16 }}
            />
          </Empty>
        </Card>
      )}
    </Screen>
  );
}
