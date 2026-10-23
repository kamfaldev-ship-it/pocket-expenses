import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph, ReportGlyph } from './Icon';
import { useUI } from '@/store/ui';
import { fonts, useTheme } from '@/theme';

const TABS: Record<string, { label: string; icon: 'home' | 'report' | 'history' }> = {
  index: { label: 'Accueil', icon: 'home' },
  report: { label: 'Rapport', icon: 'report' },
  history: { label: 'Historique', icon: 'history' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { openSheet } = useUI();

  const renderTab = (routeName: string) => {
    const idx = state.routes.findIndex((r) => r.name === routeName);
    const route = state.routes[idx];
    const focused = state.index === idx;
    const meta = TABS[routeName];
    const color = focused ? t.brand : t.mute;
    const fill = focused ? t.brandSoft : 'none';
    return (
      <Pressable
        key={routeName}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 2 }}>
        {meta.icon === 'report' ? (
          <ReportGlyph color={color} fill={fill} size={24} />
        ) : (
          <Glyph name={meta.icon} color={color} fill={fill} size={24} />
        )}
        <Text style={{ fontFamily: focused ? fonts.body700 : fonts.body500, fontSize: 11, color: focused ? t.brand : t.mute }}>
          {meta.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <BlurView
      intensity={40}
      tint={t.dark ? 'dark' : 'light'}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: t.nav,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: t.line,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 6),
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      {renderTab('index')}
      {renderTab('report')}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter une transaction"
          hitSlop={8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            openSheet();
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <LinearGradient
            colors={['#8F83FF', '#6C63FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name="plus" color="#fff" size={24} strokeWidth={2.4} />
          </LinearGradient>
        </Pressable>
      </View>
      {renderTab('history')}
    </BlurView>
  );
}
