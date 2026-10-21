import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useStore } from '@/store';

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  ink: string;
  mute: string;
  line: string;
  brand: string;
  brand2: string;
  brandSoft: string;
  inn: string;
  inSoft: string;
  sav: string;
  savSoft: string;
  savInk: string;
  out: string;
  outSoft: string;
  warn: string;
  warnInk: string;
  hero: [string, string, string];
  nav: string;
  shadowOpacity: number;
}

export const light: Theme = {
  dark: false,
  bg: '#F6F5FA',
  card: '#FFFFFF',
  ink: '#16151F',
  mute: '#6F6C88',
  line: '#ECEAF4',
  brand: '#6C63FF',
  brand2: '#9B8CFF',
  brandSoft: '#EEECFF',
  inn: '#12A150',
  inSoft: '#E3F6EB',
  sav: '#14B8A6',
  savSoft: '#DDF5F1',
  savInk: '#0F766E',
  out: '#E5384F',
  outSoft: '#FDE7EA',
  warn: '#F59E0B',
  warnInk: '#B45309',
  hero: ['#A99BFF', '#7C6CFF', '#5B52F0'],
  nav: 'rgba(255,255,255,0.92)',
  shadowOpacity: 0.08,
};

export const dark: Theme = {
  ...light,
  dark: true,
  bg: '#0A0A0F',
  card: '#141420',
  ink: '#F2F1FA',
  mute: '#8481A0',
  line: '#22223A',
  brandSoft: '#23214A',
  inn: '#3DD68C',
  inSoft: '#10281F',
  sav: '#2DD4BF',
  savSoft: '#0F2A2A',
  savInk: '#5EEAD4',
  out: '#FF6B7F',
  outSoft: '#33161C',
  warn: '#FBBF24',
  warnInk: '#FBBF24',
  hero: ['#4B43C8', '#3A33A8', '#1E1B5A'],
  nav: 'rgba(20,20,32,0.92)',
  shadowOpacity: 0.4,
};

export const fonts = {
  display500: 'BricolageGrotesque_500Medium',
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'Figtree_400Regular',
  body500: 'Figtree_500Medium',
  body600: 'Figtree_600SemiBold',
  body700: 'Figtree_700Bold',
};

const Ctx = createContext<Theme>(light);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { state } = useStore();
  const isDark = state.theme === 'dark' || (state.theme === 'auto' && system === 'dark');
  return <Ctx.Provider value={isDark ? dark : light}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
