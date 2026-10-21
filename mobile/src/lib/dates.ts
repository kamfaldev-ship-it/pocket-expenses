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
