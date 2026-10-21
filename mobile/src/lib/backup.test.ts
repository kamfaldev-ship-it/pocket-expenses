import { parseBackup, serializeBackup, toCsv } from './backup';
import { initialState } from './defaults';
import type { AppState } from './types';

const full = (): AppState => ({
  ...initialState(),
  tx: [{ id: 1, type: 'out', amount: 1500, cat: 'courses', date: '2026-10-02', note: 'a;b "c"' }],
  savings: [{ id: 2, goalId: null, type: 'deposit', amount: 5000, date: '2026-10-03', note: '' }],
  goals: [{ id: 7, name: 'Voyage', target: 100000 }],
  budgets: { courses: 20000 },
  recurring: [{ id: 3, kind: 'save', amount: 5000, cat: 'autre', note: '', day: 1, startMonth: '2026-10', lastApplied: null }],
});

describe('backup', () => {
  it('round-trips through export and import', () => {
    const res = parseBackup(serializeBackup(full()));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state).toEqual(full());
      expect(res.summary).toEqual({ tx: 1, savings: 1, recurring: 1 });
    }
  });

  it('rejects garbage, partial and corrupted files', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"hello":1}').ok).toBe(false);
    const bad = JSON.parse(serializeBackup(full()));
    bad.data.tx[0].amount = -5;
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
  });

  it('rejects backups from a newer version', () => {
    const newer = JSON.parse(serializeBackup(full()));
    newer.version = 99;
    const res = parseBackup(JSON.stringify(newer));
    expect(res.ok).toBe(false);
  });

  it('exports CSV with escaping and BOM', () => {
    const csv = toCsv(full());
    expect(csv.startsWith('﻿date;type;')).toBe(true);
    expect(csv).toContain('"a;b ""c"""');
    expect(csv).toContain('versement caisse');
  });
});
