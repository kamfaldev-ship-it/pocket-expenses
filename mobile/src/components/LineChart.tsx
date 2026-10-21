import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { dayMonthShort } from '@/lib/dates';
import { fcfa, fcfaSigned } from '@/lib/format';
import { LINE_H, LINE_W, type LineSeries } from '@/lib/selectors';
import { fonts, useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function LineChart({ series }: { series: LineSeries }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const draw = useSharedValue(reduce ? 1 : 0);
  const fade = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    draw.value = withDelay(100, withTiming(1, { duration: 1300, easing: Easing.bezier(0.2, 0.7, 0.2, 1) }));
    fade.value = withDelay(900, withTiming(1, { duration: 800 }));
  }, [draw, fade, reduce]);

  const lineProps = useAnimatedProps(() => ({
    strokeDasharray: [series.len, series.len],
    strokeDashoffset: series.len * (1 - draw.value),
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: fade.value }));
  const up = series.diff >= 0;
  const pts = series.pts;

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontFamily: fonts.display700, fontSize: 22, color: t.ink }}>{fcfa(pts[pts.length - 1])}</Text>
        <Text style={{ fontFamily: fonts.body600, fontSize: 13, color: up ? t.inn : t.out }}>{fcfaSigned(series.diff)}</Text>
      </View>
      <Svg
        viewBox={`0 0 ${LINE_W} ${LINE_H}`}
        style={{ width: '100%', aspectRatio: LINE_W / LINE_H, overflow: 'visible' }}
        accessibilityLabel="Évolution du solde sur 30 jours">
        <Defs>
          <LinearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6C63FF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#6C63FF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <AnimatedPath d={series.area} fill="url(#lg)" animatedProps={areaProps} />
        <AnimatedPath
          d={series.path}
          fill="none"
          stroke="#6C63FF"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          animatedProps={lineProps}
        />
        <Circle cx={series.last.x} cy={series.last.y} r={5} fill="#6C63FF" stroke={t.card} strokeWidth={3} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontFamily: fonts.body400, fontSize: 12, color: t.mute }}>{dayMonthShort(series.days[0])}</Text>
        <Text style={{ fontFamily: fonts.body400, fontSize: 12, color: t.mute }}>{dayMonthShort(series.days[14])}</Text>
        <Text style={{ fontFamily: fonts.body400, fontSize: 12, color: t.mute }}>{"Aujourd'hui"}</Text>
      </View>
    </View>
  );
}
