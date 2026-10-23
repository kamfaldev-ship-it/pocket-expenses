import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { DonutChart } from '@/components/DonutChart';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Screen } from '@/components/Screen';
import { Button, Card, CatBadge, Empty, H3, Meter, Segmented, Title } from '@/components/ui';
import { budgetRows } from '@/lib/budgets';
import { fcfa } from '@/lib/format';
import { reportRows } from '@/lib/selectors';
import { useStore } from '@/store';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

export default function Report() {
  const t = useTheme();
  const { state } = useStore();
  const { month, setMonth, period, openBudget } = useUI();
  const [type, setType] = useState<'in' | 'out'>('out');
  const [selected, setSelected] = useState<string | null>(null);
  const { rows, total } = reportRows(state, period, type);
  const budgets = budgetRows(state, period);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginHorizontal: 4 }}>
        <Title>Rapport</Title>
        <MonthSwitcher
          month={month}
          onChange={(m) => {
            setSelected(null);
            setMonth(m);
          }}
        />
      </View>
      <Segmented
        value={type}
        onChange={(v) => {
          setSelected(null);
          setType(v);
        }}
        options={[
          { value: 'out', label: 'Dépenses' },
          { value: 'in', label: 'Entrées' },
        ]}
      />
      <Card>
        {rows.length ? (
          <>
            <DonutChart key={`${period.from}-${period.to}-${type}`} rows={rows} total={total} type={type} selected={selected} onSelect={setSelected} />
            <View style={{ marginTop: 14 }}>
              {rows.map((r, i) => {
                const on = selected === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelected(on ? null : r.id)}
                    style={[
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 12,
                        borderTopWidth: i && !on ? 1 : 0,
                        borderColor: t.line,
                      },
                      on && { backgroundColor: t.brandSoft, marginHorizontal: -10, paddingHorizontal: 10, borderRadius: 16 },
                    ]}>
                    <CatBadge cat={r.cat} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>{r.cat.name}</Text>
                        <Text style={{ fontFamily: fonts.display700, color: t.ink }}>{fcfa(r.v)}</Text>
                      </View>
                      <Text style={{ fontFamily: fonts.body400, fontSize: 12.5, color: t.mute }}>
                        {r.pct.toFixed(1).replace('.', ',')} % du total
                      </Text>
                      <Meter pct={r.pct} color={r.cat.color} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Empty title="Rien à afficher sur cette période" text="Ajoute une opération ou change de période." />
        )}
      </Card>

      {type === 'out' && !period.isMonth && (
        <Card>
          <H3>Budgets du mois</H3>
          <Text style={{ fontFamily: fonts.body400, color: t.mute, marginTop: 6 }}>
            Les limites sont mensuelles : choisis un mois entier pour voir où tu en es.
          </Text>
        </Card>
      )}

      {type === 'out' && period.isMonth && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H3>Budgets du mois</H3>
            {budgets.length > 0 && (
              <Pressable accessibilityRole="button" onPress={() => router.push('/budgets')} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: t.brand }}>Modifier</Text>
              </Pressable>
            )}
          </View>
          {budgets.length ? (
            budgets.map((b, i) => {
              const color = b.status === 'over' ? t.out : b.status === 'warn' ? t.warn : b.cat.color;
              const left = b.limit - b.spent;
              return (
                <Pressable
                  key={b.cat.id}
                  accessibilityRole="button"
                  accessibilityHint="Modifier la limite"
                  onPress={() => openBudget(b.cat.id)}
                  accessibilityLabel={`${b.cat.name} : ${fcfa(b.spent)} dépensés sur ${fcfa(b.limit)}, ${left >= 0 ? `reste ${fcfa(left)}` : `dépassé de ${fcfa(-left)}`}`}
                  style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.ink }}>{b.cat.name}</Text>
                    <Text style={{ fontFamily: fonts.display700, fontSize: 14, color: t.ink }}>
                      {fcfa(b.spent)} <Text style={{ fontFamily: fonts.body400, color: t.mute }}>/ {fcfa(b.limit)}</Text>
                    </Text>
                  </View>
                  <Meter pct={Math.min(b.ratio, 1) * 100} color={color} />
                  <Text
                    style={{
                      fontFamily: fonts.body500,
                      fontSize: 12.5,
                      marginTop: 4,
                      color: b.status === 'over' ? t.out : b.status === 'warn' ? t.warnInk : t.mute,
                    }}>
                    {left >= 0 ? `Reste ${fcfa(left)}` : `Dépassé de ${fcfa(-left)}`}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Empty title="Aucun budget" text="Fixe une limite par catégorie pour savoir où tu en es avant la fin du mois.">
              <Button label="Fixer des budgets" onPress={() => router.push('/budgets')} style={{ marginTop: 16 }} />
            </Empty>
          )}
        </Card>
      )}
    </Screen>
  );
}
