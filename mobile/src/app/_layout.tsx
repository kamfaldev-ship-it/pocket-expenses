import { BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, useFonts } from '@expo-google-fonts/figtree';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AddSheet } from '@/components/AddSheet';
import { LockScreen } from '@/components/LockScreen';
import { SavingsSheet } from '@/components/SavingsSheet';
import { Toast } from '@/components/Toast';
import { StoreProvider, useStore } from '@/store';
import { LockProvider, useLock } from '@/store/lock';
import { UIProvider, useUI } from '@/store/ui';
import { fonts, ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Native header for screens pushed on top of the tabs (provides the back arrow). */
const pushed = (t: ReturnType<typeof useTheme>, title: string) => ({
  headerShown: true,
  title,
  headerBackTitle: 'Retour',
  headerTintColor: t.brand,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: t.bg },
  headerTitleStyle: { fontFamily: fonts.display700, color: t.ink },
});

function Shell() {
  const t = useTheme();
  const { ready } = useStore();
  const lock = useLock();
  const { closeSheet, closeSavings } = useUI();
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const loaded = ready && fontsLoaded && lock.loaded;
  // Sheets are native modals that would sit above the lock cover, so close them when locking.
  useEffect(() => {
    if (lock.locked) {
      closeSheet();
      closeSavings();
    }
  }, [lock.locked, closeSheet, closeSavings]);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="savings" options={pushed(t, 'Caisse économies')} />
        <Stack.Screen name="recurring" options={pushed(t, 'Récurrences')} />
        <Stack.Screen name="budgets" options={pushed(t, 'Budgets')} />
        <Stack.Screen name="settings" options={pushed(t, 'Réglages')} />
      </Stack>
      <Toast />
      <AddSheet />
      <SavingsSheet />
      <LockScreen />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>
          <LockProvider>
            <UIProvider>
              <Shell />
            </UIProvider>
          </LockProvider>
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
