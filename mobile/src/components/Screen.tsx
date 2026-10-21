import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/** Scrollable screen that leaves room for the floating tab bar. */
export function Screen({
  children,
  header,
  style,
  pushed,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Screen pushed on the root stack: native header on top, no tab bar below. */
  pushed?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {focused ? <StatusBar style={header ? 'light' : t.dark ? 'light' : 'dark'} /> : null}
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (pushed ? 32 : 90) + insets.bottom }}>
        {header}
        <View
          style={[
            header
              ? { marginTop: -44, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 22 }
              : { paddingTop: pushed ? 12 : insets.top + 22 },
            { backgroundColor: t.bg, paddingHorizontal: 16 },
            style,
          ]}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
