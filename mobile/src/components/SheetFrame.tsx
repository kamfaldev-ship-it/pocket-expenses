import type React from 'react';
import { createContext, useContext, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph } from './Icon';
import { KeyboardDoneBar, KEYBOARD_DONE_ID } from './KeyboardDone';
import { fonts, useTheme, type Theme } from '@/theme';

export const field = (t: Theme) => ({
  backgroundColor: t.card,
  borderWidth: 1,
  borderColor: t.line,
  borderRadius: 16,
  paddingVertical: 13,
  paddingHorizontal: 14,
});

/**
 * Returns a close handler that asks for confirmation when the form holds unsaved input,
 * and registers itself so the Modal's hardware-back handler uses it too.
 */
export function useGuardedClose(dirty: boolean, close: () => void, ref: MutableRefObject<() => void>) {
  const request = () => {
    // Alert is a no-op on web; never trap the user there.
    if (!dirty || Platform.OS === 'web') return close();
    Alert.alert('Abandonner la saisie ?', 'Ce que tu as saisi ne sera pas enregistré.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: close },
    ]);
  };
  useEffect(() => {
    ref.current = request;
  });
  return request;
}

/** Lets a field near the bottom of a sheet scroll itself above the keyboard when focused. */
const SheetScrollContext = createContext<() => void>(() => {});
export const useScrollToEnd = () => useContext(SheetScrollContext);

/** Bottom sheet chrome: scrim (tap to close), grabber, title and a 44pt close button. */
export function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // Wait for the keyboard to finish resizing the sheet before scrolling.
  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  return (
    // A Modal on Android is not resized by the system (statusBarTranslucent), so 'padding' is needed there too.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Pressable
        accessibilityLabel="Fermer"
        onPress={onClose}
        style={{ flex: 1, minHeight: 60, backgroundColor: 'rgba(10,8,30,0.5)' }}
      />
      <View
        style={{
          maxHeight: '92%',
          backgroundColor: t.bg,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          paddingTop: 10,
          paddingHorizontal: 18,
          paddingBottom: 22 + insets.bottom,
        }}>
        <View style={{ width: 42, height: 5, borderRadius: 9, backgroundColor: t.line, alignSelf: 'center', marginBottom: 8 }} />
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text accessibilityRole="header" style={{ fontFamily: fonts.display700, fontSize: 21, color: t.ink, marginLeft: 2, flexShrink: 1 }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
                <Glyph name="close" color={t.mute} size={18} />
              </View>
            </Pressable>
          </View>
          <KeyboardDoneBar />
          <SheetScrollContext.Provider value={scrollToEnd}>{children}</SheetScrollContext.Provider>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Large centered numeric input with the FCFA unit. */
export function AmountInput({
  value,
  onChange,
  color,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 20, marginBottom: 6 }}>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^\d.,\s]/g, ''))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={t.mute}
        accessibilityLabel="Montant en FCFA"
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        inputAccessoryViewID={KEYBOARD_DONE_ID}
        style={{
          width: Math.max(80, (value.length + 1) * 30),
          textAlign: 'center',
          fontFamily: fonts.display800,
          fontSize: 48,
          letterSpacing: -2,
          color,
          padding: 0,
        }}
      />
      <Text style={{ fontFamily: fonts.display700, fontSize: 20, color: t.mute }}>FCFA</Text>
    </View>
  );
}

export const parseAmount = (raw: string) => Math.round(parseFloat(raw.replace(/\s/g, '').replace(',', '.')));
