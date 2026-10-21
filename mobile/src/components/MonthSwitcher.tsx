import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Glyph } from './Icon';
import { monthName, shiftMonth } from '@/lib/dates';
import { fonts, useTheme } from '@/theme';

function ArrowBtn({ icon, label, color, onPress }: { icon: 'left' | 'right'; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
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
      <Glyph name={icon} color={color} />
    </Pressable>
  );
}

export function MonthSwitcher({ month, onChange, onHero }: { month: string; onChange: (m: string) => void; onHero?: boolean }) {
  const t = useTheme();
  const color = onHero ? '#fff' : t.ink;
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 3 }}>
      <ArrowBtn icon="left" label="Mois précédent" color={color} onPress={() => onChange(shiftMonth(month, -1))} />
      <Text
        style={{ minWidth: 112, textAlign: 'center', fontFamily: fonts.body600, fontSize: 14, color, textTransform: 'capitalize' }}>
        {monthName(month)}
      </Text>
      <ArrowBtn icon="right" label="Mois suivant" color={color} onPress={() => onChange(shiftMonth(month, 1))} />
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
