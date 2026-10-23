/** Days from `now` to the end of its month, today included (always >= 1). */
export const daysLeftInMonth = (now = new Date()) =>
  new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;

/** What can be spent each day until the month ends, given the available balance. */
export const dailyAllowance = (available: number, now = new Date()) => {
  const daysLeft = daysLeftInMonth(now);
  return { daysLeft, perDay: available > 0 ? Math.floor(available / daysLeft) : 0, empty: available <= 0 };
};
