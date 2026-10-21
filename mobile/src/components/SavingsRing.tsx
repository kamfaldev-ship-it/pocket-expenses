import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { fcfa, nf } from '@/lib/format';
import { fonts, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 44;
const C = 2 * Math.PI * R;

/** The pot's gauge: balance in the middle, arc fills toward the goal when one is set. */
export function SavingsRing({ balance, goal, progress }: { balance: number; goal: number | null; progress: number | null }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const target = progress ?? 0; // no goal: nothing to fill, only the calm track is shown
  const p = useSharedValue(reduce ? target : 0);
  useEffect(() => {
    p.value = reduce ? target : withTiming(target, { duration: 1100, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [target, reduce, p]);
  const props = useAnimatedProps(() => ({ strokeDasharray: [C * p.value, C] }));
  const pct = progress === null ? null : Math.round(progress * 100);

  return (
    <View
      accessible
      accessibilityLabel={
        goal ? `En caisse : ${fcfa(balance)}, ${pct} % des objectifs atteints (${fcfa(goal)} au total)` : `En caisse : ${fcfa(balance)}`
      }
      style={{ width: 230, height: 230, alignSelf: 'center' }}>
      <Svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <G rotation={-90} origin="50, 50">
          <Circle cx={50} cy={50} r={R} fill="none" stroke={progress === null ? t.savSoft : t.line} strokeWidth={8} />
          <AnimatedCircle
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke={t.sav}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={target > 0 ? 1 : 0}
            animatedProps={props}
          />
        </G>
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 }}>
        <Text style={{ fontFamily: fonts.body500, fontSize: 13, color: t.mute }}>En caisse</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          numberOfLines={1}
          style={{ fontFamily: fonts.display800, fontSize: 36, letterSpacing: -1, color: t.ink, marginTop: 2 }}>
          {nf(balance)}
        </Text>
        <Text style={{ fontFamily: fonts.display700, fontSize: 14, color: t.mute }}>FCFA</Text>
        {goal ? (
          <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: t.savInk, marginTop: 4 }}>{pct} % atteint</Text>
        ) : null}
      </View>
    </View>
  );
}
