import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { fonts, useTheme } from '@/theme';

/** The iOS number pad has no Return key: this bar above it gives an "OK" to close the keyboard. */
export const KEYBOARD_DONE_ID = 'pocket-keyboard-done';

export function KeyboardDoneBar() {
  const t = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: t.card, borderTopWidth: 1, borderColor: t.line }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le clavier" onPress={Keyboard.dismiss} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: fonts.body700, fontSize: 16, color: t.brand }}>OK</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
