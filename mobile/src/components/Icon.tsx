import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ICONS } from '@/lib/defaults';

// Interface glyphs (24x24, stroked) taken from the web version.
export const GLYPHS = {
  wallet: 'M4 8a3 3 0 0 1 3-3h11v4M4 8v9a3 3 0 0 0 3 3h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H7a3 3 0 0 1-3-2zM16 14h.01',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3',
  close: 'M6 6l12 12M18 6L6 18',
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
  history: 'M12 8v4l3 2',
  settings: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4',
  chevron: 'M6 9l6 6 6-6',
  minus: 'M5 12h14',
  jar: 'M8 3h8M7 6h10v12a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3zM7 11h10',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const;

interface Props {
  size?: number;
  color: string;
  strokeWidth?: number;
  fill?: string;
}

export function Glyph({ name, size = 20, color, strokeWidth = 1.9, fill = 'none' }: Props & { name: keyof typeof GLYPHS }) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={GLYPHS[name]} {...common} />
      {name === 'history' ? <Circle cx={12} cy={12} r={8} {...common} /> : null}
      {name === 'settings' ? <Circle cx={12} cy={12} r={3} {...common} /> : null}
    </Svg>
  );
}

export function ReportGlyph({ size = 20, color, strokeWidth = 1.9, fill = 'none' }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={4} y={4} width={16} height={16} rx={4} {...common} />
      <Path d="M9 16v-4M12 16V8M15 16v-6" {...common} fill="none" />
    </Svg>
  );
}

/** Category icon drawn from the ICONS shape table. */
export function CatGlyph({ name, size = 20, color, strokeWidth = 1.9 }: Props & { name: string }) {
  const shapes = ICONS[name] ?? ICONS.dots;
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {shapes.map((s, i) =>
        s.t === 'path' ? (
          <Path key={i} d={s.d} {...common} />
        ) : s.t === 'rect' ? (
          <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...common} />
        ) : (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...common} />
        ),
      )}
    </Svg>
  );
}
