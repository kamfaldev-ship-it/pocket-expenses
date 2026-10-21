import { Pressable, Text, View } from 'react-native';
import { CatBadge } from './ui';
import type { Category } from '@/lib/types';
import { fonts, useTheme } from '@/theme';

/** Wrapping category chips, shared by the add sheet and the recurring-rule form. */
export function CatPicker({ cats, value, onChange }: { cats: Category[]; value: string; onChange: (id: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {cats.map((c) => {
        const on = c.id === value;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(c.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 8,
              paddingLeft: 8,
              paddingRight: 14,
              borderRadius: 999,
              backgroundColor: on ? t.brandSoft : t.card,
              borderWidth: 1.5,
              borderColor: on ? t.brand : t.line,
            }}>
            <CatBadge cat={c} size={28} />
            <Text style={{ fontFamily: fonts.body600, fontSize: 14, color: t.ink }}>{c.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
