import { dailyAllowance, daysLeftInMonth } from './daily';

describe('daily allowance', () => {
  it('counts today until the last day of the month', () => {
    expect(daysLeftInMonth(new Date(2026, 9, 1))).toBe(31);
    expect(daysLeftInMonth(new Date(2026, 9, 23))).toBe(9);
    expect(daysLeftInMonth(new Date(2026, 9, 31))).toBe(1);
    expect(daysLeftInMonth(new Date(2028, 1, 29))).toBe(1);
  });

  it('splits the balance over the remaining days, rounded down', () => {
    expect(dailyAllowance(90000, new Date(2026, 9, 23))).toEqual({ daysLeft: 9, perDay: 10000, empty: false });
    expect(dailyAllowance(100, new Date(2026, 9, 23)).perDay).toBe(11);
  });

  it('is empty with no or negative balance', () => {
    expect(dailyAllowance(0, new Date(2026, 9, 23))).toEqual({ daysLeft: 9, perDay: 0, empty: true });
    expect(dailyAllowance(-5000, new Date(2026, 9, 23)).empty).toBe(true);
  });
});
