/**
 * v1 keeps the app to one loop: note an expense, see what is left.
 * Features switched off here are hidden from the UI but their code and tests stay.
 * A hidden feature still shows if the user already has data for it (see usages).
 */
export const FEATURES = {
  recurring: false,
  csvExport: false,
  appLock: false,
  historySearch: false,
  multiGoals: false,
};
