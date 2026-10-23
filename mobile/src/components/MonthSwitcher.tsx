import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Glyph } from './Icon';
import { monthName, shiftMonth } from '@/lib/dates';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

function ArrowBtn({ icon, label, color, onPress }: { icon: 'left' | 'right' | 'close'; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'transparent',
      })}>
      <Glyph name={icon} color={color} size={icon === 'close' ? 16 : undefined} />
    </Pressable>
  );
}

/**
 * Month arrows, or the custom range with a × to go back to the month.
 * Tapping the label opens the period sheet (any start and end day, or a single day).
 */
export function MonthSwitcher({ month, onChange, onHero }: { month: string; onChange: (m: string) => void; onHero?: boolean }) {
  const t = useTheme();
  const { range, period, openPeriodSheet } = useUI();
  const color = onHero ? '#fff' : t.ink;
  const label = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Période : ${range ? period.label : monthName(month)}. Choisir une autre période`}
      onPress={openPeriodSheet}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{ minHeight: 32, justifyContent: 'center', paddingHorizontal: range ? 8 : 0 }}>
      <Text
        numberOfLines={1}
        style={{
          minWidth: range ? 0 : 112,
          textAlign: 'center',
          fontFamily: fonts.body600,
          fontSize: range ? 13 : 14,
          color,
          textTransform: 'capitalize',
        }}>
        {range ? period.label : monthName(month)}
      </Text>
    </Pressable>
  );
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 3 }}>
      {range ? (
        <>
          {label}
          <ArrowBtn icon="close" label="Revenir au mois" color={color} onPress={() => onChange(month)} />
        </>
      ) : (
        <>
          <ArrowBtn icon="left" label="Mois précédent" color={color} onPress={() => onChange(shiftMonth(month, -1))} />
          {label}
          <ArrowBtn icon="right" label="Mois suivant" color={color} onPress={() => onChange(shiftMonth(month, 1))} />
        </>
      )}
    </View>
  );
  if (onHero) {
    return (
      <BlurView intensity={20} tint="light" style={{ borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' }}>
        {inner}
      </BlurView>
    );
  }
  return (
    <View style={{ borderRadius: 999, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>{inner}</View>
  );
}
