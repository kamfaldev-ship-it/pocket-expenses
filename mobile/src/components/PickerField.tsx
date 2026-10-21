import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from './Icon';
import { fonts, useTheme } from '@/theme';

export interface Option {
  value: string;
  label: string;
}

/** Native-feeling replacement for the web <select>: a field opening a bottom list. */
export function PickerField({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: 16,
          paddingVertical: 13,
          paddingHorizontal: 14,
        }}>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.body500, color: t.ink }}>
          {current}
        </Text>
        <Glyph name="chevron" color={t.mute} size={16} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,8,30,0.5)' }} onPress={() => setOpen(false)} />
        <View
          style={{
            maxHeight: '60%',
            backgroundColor: t.bg,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingTop: 16,
            paddingBottom: 12 + insets.bottom,
          }}>
          <Text style={{ fontFamily: fonts.display700, fontSize: 18, color: t.ink, marginLeft: 20, marginBottom: 8 }}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => {
              const on = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 14, paddingHorizontal: 20, backgroundColor: on ? t.brandSoft : 'transparent' }}>
                  <Text
                    style={{
                      fontFamily: on ? fonts.body700 : fonts.body500,
                      fontSize: 16,
                      color: on ? t.brand : t.ink,
                    }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </>
  );
}
