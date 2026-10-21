import { FALLBACK_CAT } from './defaults';
import { iso, mkey } from './dates';
import type { AppState, Category, Transaction } from './types';

export const signed = (t: Transaction) => (t.type === 'in' ? t.amount : -t.amount);
export const sum = (a: Transaction[]) => a.reduce((t, x) => t + x.amount, 0);
export const net = (a: Transaction[]) => a.reduce((t, x) => t + signed(x), 0);
export const cmp = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.id - a.id;

export const findCat = (cats: Category[], id: string): Category => cats.find((c) => c.id === id) ?? FALLBACK_CAT;

export const monthStats = (tx: Transaction[], month: string) => {
  const m = tx.filter((t) => mkey(t.date) === month);
  const inn = sum(m.filter((t) => t.type === 'in'));
  const out = sum(m.filter((t) => t.type === 'out'));
  return { inn, out, net: inn - out };
};

export interface LineSeries {
  days: string[];
  pts: number[];
  start: number;
  path: string;
  area: string;
  last: { x: number; y: number };
  diff: number;
  /** Upper bound of the curve length, used for the draw-in animation. */
  len: number;
}

export const LINE_W = 300;
export const LINE_H = 130;
const LINE_P = 8;

export const balanceSeries = (tx: Transaction[], now = new Date()): LineSeries => {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(iso(d));
  }
  let bal = net(tx.filter((t) => t.date < days[0]));
  const pts = days.map((d) => {
    bal += net(tx.filter((t) => t.date === d));
    return bal;
  });
  const start = pts[0] - net(tx.filter((t) => t.date === days[0]));
  const mn = Math.min(...pts, start);
  const mx = Math.max(...pts, start);
  const rg = mx - mn || 1;
  const X = (i: number) => LINE_P + (i * (LINE_W - 2 * LINE_P)) / 29;
  const Y = (v: number) => LINE_H - LINE_P - ((v - mn) / rg) * (LINE_H - 2 * LINE_P);
  let path = '';
  pts.forEach((v, i) => {
    if (!i) {
      path = `M${X(0)},${Y(v)}`;
      return;
    }
    const x0 = X(i - 1);
    const y0 = Y(pts[i - 1]);
    const x1 = X(i);
    const y1 = Y(v);
    const cx = (x0 + x1) / 2;
    path += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  });
  const area = `${path} L${X(29)},${LINE_H} L${X(0)},${LINE_H} Z`;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(X(i) - X(i - 1), Y(pts[i]) - Y(pts[i - 1]));
  return { days, pts, start, path, area, last: { x: X(29), y: Y(pts[29]) }, diff: pts[29] - start, len: Math.ceil(len * 1.3) };
};

export interface CatRow {
  id: string;
  cat: Category;
  v: number;
  pct: number;
}

export const reportRows = (state: AppState, month: string, type: 'in' | 'out') => {
  const m = state.tx.filter((t) => mkey(t.date) === month && t.type === type);
  const total = sum(m);
  const by: Record<string, number> = {};
  m.forEach((t) => (by[t.cat] = (by[t.cat] || 0) + t.amount));
  const rows: CatRow[] = Object.entries(by)
    .map(([id, v]) => ({ id, cat: findCat(state.cats, id), v, pct: (v / total) * 100 }))
    .sort((a, b) => b.v - a.v);
  return { rows, total };
};

export const historyMonths = (tx: Transaction[], cur: string) =>
  [...new Set(tx.map((t) => mkey(t.date)).concat(cur))].sort().reverse();

export interface DayGroup {
  date: string;
  net: number;
  items: Transaction[];
}

export const groupByDay = (list: Transaction[]): DayGroup[] => {
  const groups: DayGroup[] = [];
  list.forEach((t) => {
    const g = groups[groups.length - 1];
    if (g && g.date === t.date) {
      g.items.push(t);
      g.net += signed(t);
    } else groups.push({ date: t.date, net: signed(t), items: [t] });
  });
  return groups;
};

let demoCounter = 0;
export const demoTransactions = (cats: Category[], now = new Date()): Transaction[] => {
  const rnd = (a: number, b: number) => Math.round((a + Math.random() * (b - a)) / 500) * 500;
  const out: Transaction[] = [];
  const base = Date.now() * 1000;
  const id = () => base + demoCounter++;
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = iso(d);
    if (i % 11 === 3) out.push({ id: id(), amount: rnd(150000, 450000), type: 'in', cat: 'freelance', date: ds, note: 'Mission client' });
    if (i % 9 === 1) out.push({ id: id(), amount: rnd(5000, 25000), type: 'out', cat: 'courses', date: ds, note: '' });
    if (i % 6 === 2) out.push({ id: id(), amount: rnd(500, 4000), type: 'out', cat: 'transport', date: ds, note: '' });
    if (i % 13 === 5) out.push({ id: id(), amount: rnd(3000, 15000), type: 'out', cat: 'loisirs', date: ds, note: 'Sortie' });
    if (i % 17 === 7) out.push({ id: id(), amount: rnd(2000, 9000), type: 'out', cat: 'outils', date: ds, note: 'Abonnement' });
    if (d.getDate() === 1) out.push({ id: id(), amount: 120000, type: 'out', cat: 'loyer', date: ds, note: 'Loyer' });
  }
  return out.filter((x) => cats.some((c) => c.id === x.cat));
};

const fold = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Search in note, category name and amount; every word must match (accents and case ignored). */
export const matchesQuery = (t: Transaction, cats: Category[], query: string): boolean => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${fold(t.note)} ${fold(findCat(cats, t.cat).name)} ${t.amount}`;
  return words.every((w) => hay.includes(w.replace(/[\s\u00a0\u202f]/g, '')));
};
