const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local-timezone YYYY-MM-DD. */
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const mkey = (s: string) => s.slice(0, 7);

/** Parse YYYY-MM-DD as a local date. */
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const shiftMonth = (k: string, n: number) => {
  const [y, m] = k.split('-').map(Number);
  return iso(new Date(y, m - 1 + n, 1)).slice(0, 7);
};

export const monthName = (k: string) => {
  const [y, m] = k.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/** "12 janv." */
export const dayMonthShort = (s: string) => {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

/** "mardi 12 janvier" */
export const dayLong = (s: string) => {
  const d = parseDate(s);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "oct." from "2026-10" */
export const monthShort = (k: string) => MONTHS_SHORT[Number(k.split('-')[1]) - 1];

/** An inclusive range of days, YYYY-MM-DD on both ends. */
export interface Period {
  from: string;
  to: string;
}

/** A month key ("2026-10") or an explicit range. */
export type PeriodInput = string | Period;

export const monthRange = (k: string): Period => {
  const [y, m] = k.split('-').map(Number);
  return { from: `${k}-01`, to: iso(new Date(y, m, 0)) };
};

export const toPeriod = (p: PeriodInput): Period => (typeof p === 'string' ? monthRange(p) : p);

export const inRange = (date: string, p: Period) => date >= p.from && date <= p.to;

/** True when the range is exactly one calendar month (monthly budgets apply). */
export const isFullMonth = (p: Period) => {
  const full = monthRange(mkey(p.from));
  return p.from === full.from && p.to === full.to;
};

/** "13 sept. → 15 oct." or "13 sept." for a single day; years appear only when they differ. */
export const periodLabel = (p: Period) => {
  if (p.from === p.to) return dayMonthShort(p.from);
  const y1 = p.from.slice(0, 4);
  const y2 = p.to.slice(0, 4);
  const withYear = y1 !== y2;
  return `${dayMonthShort(p.from)}${withYear ? ` ${y1}` : ''} → ${dayMonthShort(p.to)}${withYear ? ` ${y2}` : ''}`;
};

/** The day `n` days from `date`. */
export const addDays = (date: string, n: number) => {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return iso(d);
};
