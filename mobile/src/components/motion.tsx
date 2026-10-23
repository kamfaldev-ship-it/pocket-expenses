import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/** One spring for every press so the whole app shares the same feel. */
const PRESS_SPRING = { damping: 20, stiffness: 380, mass: 0.6 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that shrinks slightly under the finger and springs back.
 * With reduced motion the scale is skipped and only the opacity dips.
 */
export function PressScale({
  scaleTo = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style'> & { scaleTo?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ opacity: dim.value, transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduce) scale.set(withSpring(scaleTo, PRESS_SPRING));
        dim.set(withTiming(0.85, { duration: 80 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, PRESS_SPRING));
        dim.set(withTiming(1, { duration: 160 }));
        onPressOut?.(e);
      }}
      style={[style, anim]}
    />
  );
}

let introPlayed = false;

/**
 * Eases a number toward `value` instead of jumping, so a new expense visibly moves the balance.
 * `intro` also counts up from 0 the first time it mounts in this session.
 */
export function useCountUp(value: number, intro = false) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(() => (intro && !introPlayed && !reduce ? 0 : value));
  const from = useRef(shown);
  useEffect(() => {
    if (intro) introPlayed = true;
    if (reduce || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    const DURATION = 650;
    let raf = 0;
    const tick = () => {
      const p = Math.min((Date.now() - t0) / DURATION, 1);
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf); // a new value takes over from where this one stopped
  }, [value, reduce, intro]);
  return shown;
}

/** Text that rolls to its new number. Only this node re-renders during the animation. */
export function CountText({
  value,
  format,
  intro,
  children,
  ...rest
}: TextProps & { value: number; format: (n: number) => string; intro?: boolean }) {
  const shown = useCountUp(value, intro);
  return (
    <Text accessibilityLabel={format(value)} {...rest}>
      {format(shown)}
      {children}
    </Text>
  );
}

/** Gives its child a small spring bump each time `trigger` changes (not on first render). */
export function Bump({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reduce) scale.value = withSequence(withTiming(1.07, { duration: 120, easing: Easing.out(Easing.quad) }), withSpring(1, PRESS_SPRING));
  }, [trigger, reduce, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
