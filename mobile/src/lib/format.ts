const NNBSP = ' ';
const NBSP = ' ';

/** fr-FR integer grouping without relying on Intl (Hermes/Android safe). */
export const nf = (n: number) => {
  const v = Math.round(Math.abs(n));
  const s = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return (n < 0 && v !== 0 ? '−' : '') + s;
};

export const fcfa = (n: number) => `${nf(n)}${NBSP}FCFA`;

/** Unsigned amount with FCFA suffix. */
export const fcfaAbs = (n: number) => fcfa(Math.abs(n));

/** "+1 000 FCFA" / "−1 000 FCFA" */
export const fcfaSigned = (n: number) => `${n >= 0 ? '+' : '−'}${fcfaAbs(n)}`;

/** Compact amount for tight spaces: 5 k, 1,2 M. */
export const compact = (n: number) => {
  const v = Math.abs(n);
  const sign = n < 0 ? '\u2212' : '';
  if (v >= 1e6) return `${sign}${(v / 1e6).toFixed(1).replace('.', ',').replace(',0', '')}\u00a0M`;
  if (v >= 1e3) return `${sign}${(v / 1e3).toFixed(1).replace('.', ',').replace(',0', '')}\u00a0k`;
  return `${sign}${Math.round(v)}`;
};
