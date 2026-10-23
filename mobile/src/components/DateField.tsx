import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { field } from './SheetFrame';
import { dayMonthShort, iso, parseDate } from '@/lib/dates';
import { fonts, useTheme } from '@/theme';

/** Native date picker: compact inline on iOS, a tappable field opening the dialog on Android. */
export function DateField({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const t = useTheme();
  if (Platform.OS === 'ios') {
    return (
      <View style={{ alignItems: 'flex-start' }}>
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="compact"
          locale="fr-FR"
          themeVariant={t.dark ? 'dark' : 'light'}
          onChange={(_, d) => d && onChange(iso(d))}
        />
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        DateTimePickerAndroid.open({ value: parseDate(value), mode: 'date', onChange: (_, d) => d && onChange(iso(d)) })
      }
      style={field(t)}>
      <Text style={{ fontFamily: fonts.body500, color: t.ink }}>
        {dayMonthShort(value)} {value.slice(0, 4)}
      </Text>
    </Pressable>
  );
}
