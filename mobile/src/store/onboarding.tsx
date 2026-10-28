import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/** Device-level flag, outside the exportable app data (like the lock). */
export const ONBOARDING_KEY = 'pocket.onboarded';

interface OnboardingValue {
  /** The saved flag has been read. */
  loaded: boolean;
  /** The presentation must be shown. */
  visible: boolean;
  finish: () => void;
}

const Ctx = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((v) => setVisible(v !== '1'))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const finish = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
  }, []);

  return <Ctx.Provider value={{ loaded, visible, finish }}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return v;
}
