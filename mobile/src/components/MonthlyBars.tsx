import { Text, View } from 'react-native';
import { compact, fcfa } from '@/lib/format';
import { monthName, monthShort } from '@/lib/dates';
import { fonts, useTheme } from '@/theme';

/** Six-month savings bars; values are labelled directly so color is never the only cue. */
export function MonthlyBars({ data }: { data: { key: string; value: number }[] }) {
  const t = useTheme();
  const max = Math.max(...data.map((d) => d.value), 1);
  const last = data[data.length - 1]?.key;
  return (
    <View
      accessible
      accessibilityLabel={`Épargne des ${data.length} derniers mois : ${data.map((d) => `${monthName(d.key)} ${fcfa(d.value)}`).join(', ')}`}
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 112, marginTop: 8 }}>
      {data.map((d) => {
        const h = d.value > 0 ? Math.max((d.value / max) * 64, 6) : 3;
        const current = d.key === last;
        return (
          <View key={d.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 11, color: d.value > 0 ? t.ink : t.mute }}>
              {d.value > 0 ? compact(d.value) : '0'}
            </Text>
            <View
              style={{
                width: '100%',
                height: h,
                borderRadius: 6,
                backgroundColor: d.value > 0 ? (current ? t.sav : t.savSoft) : t.line,
                borderWidth: d.value > 0 && !current ? 1 : 0,
                borderColor: t.sav,
              }}
            />
            <Text style={{ fontFamily: current ? fonts.body700 : fonts.body500, fontSize: 11, color: current ? t.ink : t.mute }}>
              {monthShort(d.key)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
