import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { fcfa } from '@/lib/format';
import type { CatRow } from '@/lib/selectors';
import { fonts, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const R = 42;
const C = 2 * Math.PI * R;

function Segment({ row, total, offset, gap, dimmed, onPress }: {
  row: CatRow;
  total: number;
  offset: number;
  gap: number;
  dimmed: boolean;
  onPress: () => void;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.value = withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [p, reduce]);
  const len = Math.max((row.v / total) * C - gap, 0);
  const props = useAnimatedProps(() => ({ strokeDasharray: [len * p.value, C] }));
  return (
    <AnimatedCircle
      cx={50}
      cy={50}
      r={R}
      fill="none"
      stroke={row.cat.color}
      strokeWidth={15}
      strokeDashoffset={-offset}
      opacity={dimmed ? 0.3 : 1}
      onPress={onPress}
      animatedProps={props}
    />
  );
}

interface Props {
  rows: CatRow[];
  total: number;
  type: 'in' | 'out';
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function DonutChart({ rows, total, type, selected, onSelect }: Props) {
  const t = useTheme();
  const offsets = rows.map((_, i) => rows.slice(0, i).reduce((a, r) => a + (r.v / total) * C, 0));
  const gap = rows.length > 1 ? 1.6 : 0;
  const sel = selected ? rows.find((r) => r.id === selected) : undefined;
  return (
    <View style={{ width: '72%', maxWidth: 260, aspectRatio: 1, alignSelf: 'center', marginTop: 18, marginBottom: 6 }}>
      <Svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} accessibilityLabel="Répartition par catégorie">
        <G rotation={-90} origin="50, 50">
          <Circle cx={50} cy={50} r={R} fill="none" stroke={t.line} strokeWidth={15} />
          {rows.map((r, i) => {
            return (
              <Segment
                key={r.id}
                row={r}
                total={total}
                offset={offsets[i]}
                gap={gap}
                dimmed={!!selected && selected !== r.id}
                onPress={() => onSelect(selected === r.id ? null : r.id)}
              />
            );
          })}
        </G>
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.body400, fontSize: 13, color: t.mute }}>
          {sel ? sel.cat.name : type === 'out' ? 'Total dépenses' : 'Total entrées'}
        </Text>
        <Text style={{ fontFamily: fonts.display700, fontSize: 24, letterSpacing: -0.7, color: t.ink }}>
          {fcfa(sel ? sel.v : total)}
        </Text>
      </View>
    </View>
  );
}
