import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState as RNAppState } from 'react-native';

/** Device-level setting, deliberately outside the exportable app data. */
export const LOCK_KEY = 'pocket.lock';

interface LockValue {
  /** The saved preference has been read. */
  loaded: boolean;
  enabled: boolean;
  /** Content must be hidden: locked, or the app is not in the foreground (app switcher). */
  covered: boolean;
  /** Locked until the user authenticates (stays true across background trips). */
  locked: boolean;
  unlock: () => Promise<boolean>;
  /** Turns the lock on or off; turning it on requires a successful authentication. Returns an error message or null. */
  setEnabled: (on: boolean) => Promise<string | null>;
}

const Ctx = createContext<LockValue | null>(null);

const authenticate = (message: string) =>
  LocalAuthentication.authenticateAsync({ promptMessage: message, cancelLabel: 'Annuler' })
    .then((r) => r.success)
    .catch(() => false);

export function LockProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [active, setActive] = useState(RNAppState.currentState === 'active');

  useEffect(() => {
    AsyncStorage.getItem(LOCK_KEY)
      .then((v) => {
        const on = v === '1';
        setEnabledState(on);
        setLocked(on);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (st) => {
      setActive(st === 'active');
      // 'inactive' also fires while the system prompt is up, so only a real background trip locks.
      if (st === 'background') setLocked(true);
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(async () => {
    const ok = await authenticate('Déverrouiller Pocket');
    if (ok) setLocked(false);
    return ok;
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      const [hardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hardware || !enrolled) {
        return 'Configure Face ID, Touch ID ou un code dans les réglages du téléphone pour verrouiller Pocket.';
      }
      if (!(await authenticate('Activer le verrouillage de Pocket'))) return 'Verrouillage non activé.';
    }
    setEnabledState(on);
    setLocked(false);
    AsyncStorage.setItem(LOCK_KEY, on ? '1' : '0').catch(() => {});
    return null;
  }, []);

  const value: LockValue = { loaded, enabled, locked: enabled && locked, covered: enabled && (locked || !active), unlock, setEnabled };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLock() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLock must be used inside LockProvider');
  return v;
}
