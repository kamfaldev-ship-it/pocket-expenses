import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glyph, type GLYPHS } from './Icon';
import { Button } from './ui';
import { useOnboarding } from '@/store/onboarding';
import { fonts, useTheme } from '@/theme';

const STEPS: { icon: keyof typeof GLYPHS; title: string; text: string }[] = [
  {
    icon: 'wallet',
    title: 'Bienvenue sur Pocket',
    text: 'Note chaque entrée et chaque sortie d’argent, et vois tout de suite ce qu’il te reste à dépenser.',
  },
  {
    icon: 'plus',
    title: 'Un geste, une opération',
    text: 'Touche le « + » pour ajouter une dépense ou une entrée. Choisis une catégorie, ajoute une photo du reçu si tu veux.',
  },
  {
    icon: 'jar',
    title: 'Tes données t’appartiennent',
    text: 'Tout reste sur ton téléphone pour l’instant. Bientôt, un compte te permettra de les sauvegarder et de les retrouver sur un autre téléphone.',
  },
];

/** First-launch presentation. A plain overlay (not a Modal) so it never fights with the native sheets. */
export function Onboarding() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { visible, finish } = useOnboarding();
  const [step, setStep] = useState(0);

  if (!visible) return null;
  const last = step === STEPS.length - 1;
  const cur = STEPS[step];
  const done = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStep(0);
    finish();
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }]}>
      <View style={{ minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
        {!last && (
          <Pressable accessibilityRole="button" onPress={done} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: fonts.body600, fontSize: 15, color: t.mute }}>Passer</Text>
          </Pressable>
        )}
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: t.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph name={cur.icon} color={t.brand} size={44} />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.display800, fontSize: 28, letterSpacing: -0.5, color: t.ink, textAlign: 'center', marginTop: 28 }}>
          {cur.title}
        </Text>
        <Text style={{ fontFamily: fonts.body500, fontSize: 16, lineHeight: 24, color: t.mute, textAlign: 'center', marginTop: 12, maxWidth: 320 }}>
          {cur.text}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }} accessibilityLabel={`Étape ${step + 1} sur ${STEPS.length}`}>
        {STEPS.map((_, i) => (
          <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? t.brand : t.line }} />
        ))}
      </View>
      <Button label={last ? 'Commencer' : 'Suivant'} onPress={last ? done : () => setStep(step + 1)} style={{ paddingVertical: 16 }} />
    </View>
  );
}
