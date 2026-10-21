import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { CatGlyph } from './Icon';
import { fonts, useTheme, type Theme } from '@/theme';
import type { Category } from '@/lib/types';

export const shadow = (t: Theme): ViewStyle => ({
  shadowColor: t.dark ? '#000' : '#3C328C',
  shadowOpacity: t.shadowOpacity,
  shadowRadius: 15,
  shadowOffset: { width: 0, height: 8 },
  elevation: t.dark ? 0 : 3,
});

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[s.card, { backgroundColor: t.card, borderColor: t.line }, shadow(t), style]}>{children}</View>
  );
}

export function H3({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ fontFamily: fonts.display700, fontSize: 17, color: t.ink }, style]}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: fonts.display800, fontSize: 26, letterSpacing: -0.5, color: t.ink }}>{children}</Text>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[s.seg, { backgroundColor: t.line }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={[s.segBtn, on && { backgroundColor: t.card }, on && s.segOn]}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: on ? t.ink : t.mute }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CatBadge({ cat, size = 44 }: { cat: Category; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size > 30 ? 15 : size / 2,
        backgroundColor: cat.color + '22',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <CatGlyph name={cat.icon} color={cat.color} size={size > 30 ? 20 : 15} />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'solid',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === 'solid' ? t.brand : variant === 'ghost' ? t.brandSoft : t.outSoft;
  const fg = variant === 'solid' ? '#fff' : variant === 'ghost' ? (t.dark ? '#B9B3FF' : t.brand) : t.out;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }, style]}>
      <Text style={{ fontFamily: fonts.body700, fontSize: 16, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 }}>
      <Text style={{ fontFamily: fonts.display700, fontSize: 18, color: t.ink, marginBottom: 6 }}>{title}</Text>
      <Text style={{ fontFamily: fonts.body400, color: t.mute, textAlign: 'center' }}>{text}</Text>
      {children}
    </View>
  );
}

export const Label = ({ children }: { children: React.ReactNode }) => {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: t.mute, marginTop: 16, marginBottom: 8, marginLeft: 4 }}>
      {children}
    </Text>
  );
};

const s = StyleSheet.create({
  card: { borderRadius: 26, padding: 18, borderWidth: 1, marginTop: 16 },
  seg: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 12 },
  segOn: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16 },
});
