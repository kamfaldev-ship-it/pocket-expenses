import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { AppState, Modal, Text, View } from 'react-native';
import { Glyph } from './Icon';
import { Button } from './ui';
import { useLock } from '@/store/lock';
import { fonts, useTheme } from '@/theme';

/** Full-screen cover shown while the app is locked or out of the foreground. */
export function LockScreen() {
  const t = useTheme();
  const { covered, locked, unlock } = useLock();

  // Prompt right away when the app comes back to the foreground.
  useEffect(() => {
    if (locked && AppState.currentState === 'active') unlock();
  }, [locked, unlock]);
  useEffect(() => {
    if (!locked) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') unlock();
    });
    return () => sub.remove();
  }, [locked, unlock]);

  return (
    <Modal visible={covered} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <LinearGradient colors={t.hero} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name="wallet" color="#fff" size={34} />
        </View>
        <Text style={{ fontFamily: fonts.display800, fontSize: 30, letterSpacing: -0.6, color: '#fff', marginTop: 20 }}>Pocket</Text>
        <Text style={{ fontFamily: fonts.body500, fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center' }}>
          Tes données sont verrouillées.
        </Text>
        {locked && <Button label="Déverrouiller" variant="ghost" onPress={() => unlock()} style={{ marginTop: 28, minWidth: 200 }} />}
      </LinearGradient>
    </Modal>
  );
}
