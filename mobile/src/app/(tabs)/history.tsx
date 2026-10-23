import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { PickerField } from '@/components/PickerField';
import { Screen } from '@/components/Screen';
import { TransactionRow } from '@/components/TransactionRow';
import { Button, Card, Empty, Title } from '@/components/ui';
import { FEATURES } from '@/lib/features';
import { dayLong, mkey, monthName } from '@/lib/dates';
import { fcfaSigned } from '@/lib/format';
import { field } from '@/components/SheetFrame';
import { cmp, demoTransactions, groupByDay, historyMonths, matchesQuery, net } from '@/lib/selectors';
import { useStore } from '@/store';
import { useDeleteTx } from '@/store/actions';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function History() {
  const t = useTheme();
  const { state, dispatch } = useStore();
  const { month, openSheet } = useUI();
  const deleteTx = useDeleteTx();
  const [fMonth, setFMonth] = useState('all');
  const [fCat, setFCat] = useState('all');
  const [query, setQuery] = useState('');

  const months = useMemo(() => historyMonths(state.tx, month), [state.tx, month]);
  const monthValue = fMonth !== 'all' && !months.includes(fMonth) ? 'all' : fMonth;
  const catValue = fCat !== 'all' && !state.cats.some((c) => c.id === fCat) ? 'all' : fCat;

  const list = state.tx
    .filter((x) => (monthValue === 'all' || mkey(x.date) === monthValue) && (catValue === 'all' || x.cat === catValue) && matchesQuery(x, state.cats, query))
    .sort(cmp);
  const groups = groupByDay(list);

  return (
    <Screen>
      <View style={{ marginHorizontal: 4, marginBottom: 16 }}>
        <Title>Historique</Title>
      </View>
      {FEATURES.historySearch && (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une note, une catégorie, un montant"
          placeholderTextColor={t.mute}
          accessibilityLabel="Rechercher dans l’historique"
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          style={[field(t), { fontFamily: fonts.body400, color: t.ink, marginBottom: 10 }]}
        />
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PickerField
          label="Filtrer par mois"
          value={monthValue}
          onChange={setFMonth}
          options={[{ value: 'all', label: 'Tous les mois' }, ...months.map((k) => ({ value: k, label: cap(monthName(k)) }))]}
        />
        <PickerField
          label="Filtrer par catégorie"
          value={catValue}
          onChange={setFCat}
          options={[{ value: 'all', label: 'Toutes catégories' }, ...state.cats.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </View>
      {query.trim() !== '' && list.length > 0 && (
        <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.body500, fontSize: 13, color: t.mute, marginTop: 14, marginLeft: 4 }}>
          {list.length} résultat{list.length > 1 ? 's' : ''} · {fcfaSigned(net(list))}
        </Text>
      )}
      {!groups.length ? (
        state.tx.length ? (
          <Empty title="Aucun résultat" text={query.trim() ? 'Essaie un autre mot, ou change le mois ou la catégorie.' : "Change le mois ou la catégorie pour voir d'autres transactions."} />
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
        )
      ) : (
        groups.map((g) => (
          <View key={g.date}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 8, marginHorizontal: 4 }}>
              <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute, textTransform: 'capitalize' }}>{dayLong(g.date)}</Text>
              <Text style={{ fontFamily: fonts.display700, fontSize: 13, color: t.ink }}>{fcfaSigned(g.net)}</Text>
            </View>
            {g.items.map((x) => (
              <TransactionRow key={x.id} tx={x} cats={state.cats} onEdit={openSheet} onDelete={deleteTx} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
