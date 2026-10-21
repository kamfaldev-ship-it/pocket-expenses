import { Pressable, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

export function Toast() {
  const { toast, hideToast } = useUI();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <Animated.View
      key={toast.msg}
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        alignSelf: 'center',
        bottom: 70 + insets.bottom,
        maxWidth: '92%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: t.ink,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        zIndex: 50,
      }}>
      <Text style={{ fontFamily: fonts.body600, color: t.bg, flexShrink: 1 }}>{toast.msg}</Text>
      {toast.undo ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            toast.undo?.();
            hideToast();
          }}>
          <Text style={{ fontFamily: fonts.body700, color: t.brand2 }}>Annuler</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}
