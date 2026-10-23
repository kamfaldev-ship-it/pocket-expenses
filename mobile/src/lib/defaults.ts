import type { AppState, Category } from './types';

// 24x24 stroke icons; each entry is a list of SVG primitives.
export type IconShape =
  | { t: 'path'; d: string }
  | { t: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { t: 'circle'; cx: number; cy: number; r: number };

const p = (d: string): IconShape => ({ t: 'path', d });
const c = (cx: number, cy: number, r: number): IconShape => ({ t: 'circle', cx, cy, r });
const r = (x: number, y: number, w: number, h: number, rx: number): IconShape => ({ t: 'rect', x, y, w, h, r: rx });

export const ICONS: Record<string, IconShape[]> = {
  briefcase: [r(3, 7, 18, 13, 3), p('M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18')],
  cart: [c(9, 20, 1.5), c(18, 20, 1.5), p('M3 4h2.5l2.2 11h10.6L20 8H6.5')],
  car: [p('M5 16v-5l2-5h10l2 5v5M3 16h18v3H3zM7.5 13h.01M16.5 13h.01')],
  home: [p('M4 11l8-7 8 7v9H4zM10 20v-6h4v6')],
  tool: [p('M14.5 6.5a4 4 0 0 0 5 5L11 20a2.1 2.1 0 0 1-3-3z'), p('M14.5 6.5l-2-2')],
  game: [r(3, 8, 18, 10, 5), p('M8 11v4M6 13h4M16 12h.01M18 14h.01')],
  dots: [c(6, 12, 1), c(12, 12, 1), c(18, 12, 1)],
  heart: [p('M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z')],
  coffee: [p('M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3')],
  gift: [
    r(4, 9, 16, 11, 2),
    p('M12 9v11M3 9h18M12 9c-3 0-4-4-1.5-4S12 9 12 9zm0 0c3 0 4-4 1.5-4S12 9 12 9z'),
  ],
  book: [p('M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11')],
  phone: [r(7, 3, 10, 18, 3), p('M11 18h2')],
};

export const COLORS = ['#6C63FF', '#F97316', '#22C55E', '#3B82F6', '#EC4899', '#EAB308', '#14B8A6', '#8B8AA3'];

export const FALLBACK_CAT: Category = { id: 'autre', name: 'Autre', color: '#8B8AA3', icon: 'dots' };

// Ids stay stable across renames: tests and saved data refer to them.
export const DEFAULT_CATS: Category[] = [
  { id: 'freelance', name: 'Salaire', color: '#22C55E', icon: 'briefcase' },
  { id: 'courses', name: 'Nourriture', color: '#F97316', icon: 'cart' },
  { id: 'transport', name: 'Transport', color: '#3B82F6', icon: 'car' },
  { id: 'loyer', name: 'Loyer', color: '#6C63FF', icon: 'home' },
  { id: 'factures', name: 'Eau et électricité', color: '#14B8A6', icon: 'tool' },
  { id: 'data', name: 'Crédit et data', color: '#EAB308', icon: 'phone' },
  { id: 'famille', name: 'Famille', color: '#EC4899', icon: 'heart' },
  { id: 'social', name: 'Cotisations', color: '#8B5CF6', icon: 'gift' },
  { id: 'loisirs', name: 'Sorties', color: '#F43F5E', icon: 'coffee' },
  { id: 'frais', name: 'Frais', color: '#64748B', icon: 'dots' },
  { id: 'autre', name: 'Autre', color: '#8B8AA3', icon: 'dots' },
];

export const initialState = (): AppState => ({
  cats: DEFAULT_CATS.map((x) => ({ ...x })),
  tx: [],
  theme: 'auto',
  savings: [],
  goals: [],
  budgets: {},
  recurring: [],
});

export const STORAGE_KEY = 'pocket.v1';
