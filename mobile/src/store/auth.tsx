import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { frenchAuthError, normalizeEmail } from '@/lib/authForm';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/** `error` vide = succès. */
interface Result {
  error: string;
}

interface AuthValue {
  /** Supabase est configuré (.env.local rempli). Sinon aucun écran de compte n'est proposé. */
  configured: boolean;
  /** La session enregistrée a été lue. */
  loaded: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<Result>;
  /** `confirm` = un email de confirmation a été envoyé, pas encore de session. */
  signUp: (email: string, password: string, name: string) => Promise<Result & { confirm?: boolean }>;
  resetPassword: (email: string) => Promise<Result>;
  signOut: () => Promise<Result>;
  deleteAccount: () => Promise<Result>;
}

const Ctx = createContext<AuthValue | null>(null);

const NOT_CONFIGURED = 'Les comptes ne sont pas encore activés dans cette version.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setLoaded(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    // Le rafraîchissement du jeton ne tourne que l'app au premier plan (recommandation Supabase pour React Native).
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    supabase.auth.startAutoRefresh();
    return () => {
      sub.subscription.unsubscribe();
      appSub.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, []);

  const signIn = useCallback<AuthValue['signIn']>(async (email, password) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password }).catch((e) => ({ error: e }));
    return { error: frenchAuthError(error) };
  }, []);

  const signUp = useCallback<AuthValue['signUp']>(async (email, password, name) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: { data: name.trim() ? { display_name: name.trim() } : {} },
      });
      if (error) return { error: frenchAuthError(error) };
      // Adresse déjà inscrite avec la confirmation par email active : Supabase ne renvoie pas d'erreur
      // (pour ne pas révéler quels emails existent), mais `identities` est vide.
      if (data.user && data.user.identities?.length === 0) return { error: frenchAuthError({ code: 'user_already_exists' }) };
      return { error: '', confirm: !data.session };
    } catch (e) {
      return { error: frenchAuthError(e as Error) };
    }
  }, []);

  const resetPassword = useCallback<AuthValue['resetPassword']>(async (email) => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email)).catch((e) => ({ error: e }));
    return { error: frenchAuthError(error) };
  }, []);

  const signOut = useCallback<AuthValue['signOut']>(async () => {
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.signOut().catch((e) => ({ error: e }));
    return { error: frenchAuthError(error) };
  }, []);

  const deleteAccount = useCallback<AuthValue['deleteAccount']>(async () => {
    if (!supabase) return { error: NOT_CONFIGURED };
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) return { error: 'Impossible de supprimer le compte. Réessaie.' };
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return { error: '' };
    } catch {
      return { error: 'Impossible de supprimer le compte. Réessaie.' };
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ configured: supabaseConfigured, loaded, user: session?.user ?? null, signIn, signUp, resetPassword, signOut, deleteAccount }),
    [loaded, session, signIn, signUp, resetPassword, signOut, deleteAccount],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
