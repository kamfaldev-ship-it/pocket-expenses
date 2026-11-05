import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState as RNAppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  canonical,
  diffRows,
  emptyRows,
  fromRows,
  isBlankState,
  isDiffEmpty,
  KEY,
  rowsEmpty,
  rowsEqual,
  TABLES,
  toRows,
  type Diff,
  type Rows,
} from '@/lib/sync';
import { useAuth } from '@/store/auth';
import { useStore } from '@/store';

/** off = pas de compte · paused = l'utilisateur n'a pas tranché entre deux jeux de données. */
export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error' | 'paused';

interface SyncValue {
  status: SyncStatus;
  /** Date (ms) de la dernière synchronisation réussie, ou null. */
  lastSync: number | null;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<SyncValue | null>(null);

/** Dernier état connu du serveur pour ce compte sur cet appareil : sert à calculer ce qu'il reste à envoyer. */
const baselineKey = (uid: string) => `pocket.sync.${uid}`;

const PAGE = 1000; // limite de lignes par requête de Supabase
const UPSERT_CHUNK = 500;
const DELETE_CHUNK = 200;

async function fetchRemote(uid: string): Promise<Rows> {
  if (!supabase) throw new Error('no client');
  const out = emptyRows();
  for (const t of TABLES) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(t)
        .select('*')
        .eq('user_id', uid)
        .order(KEY[t])
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      out[t].push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
  }
  return out;
}

async function push(uid: string, diff: Diff) {
  if (!supabase) throw new Error('no client');
  // Ajouts et modifications dans l'ordre des dépendances (objectifs avant versements)…
  for (const t of TABLES) {
    const rows = diff[t].upsert;
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK).map((r) => ({ ...r, user_id: uid }));
      const { error } = await supabase.from(t).upsert(chunk, { onConflict: `user_id,${KEY[t]}` });
      if (error) throw new Error(`${t}: ${error.message}`);
    }
  }
  // …puis les suppressions dans l'ordre inverse.
  for (const t of [...TABLES].reverse()) {
    const keys = diff[t].remove;
    for (let i = 0; i < keys.length; i += DELETE_CHUNK) {
      const { error } = await supabase.from(t).delete().eq('user_id', uid).in(KEY[t], keys.slice(i, i + DELETE_CHUNK));
      if (error) throw new Error(`${t}: ${error.message}`);
    }
  }
}

type Choice = 'local' | 'remote' | 'cancel';

/** Premier lancement sur cet appareil : le téléphone et le compte ont chacun des données différentes. */
const askConflict = (phone: number, account: number) =>
  new Promise<Choice>((resolve) => {
    const n = (k: number) => `${k} opération${k > 1 ? 's' : ''}`;
    Alert.alert(
      'Quelles données garder ?',
      `Ce téléphone contient ${n(phone)}, ton compte en contient ${n(account)}. Les deux ne sont pas fusionnés : l’un remplace l’autre.`,
      [
        { text: 'Garder ce téléphone', onPress: () => resolve('local') },
        { text: 'Garder le compte', style: 'destructive', onPress: () => resolve('remote') },
        { text: 'Plus tard', style: 'cancel', onPress: () => resolve('cancel') },
      ],
      { cancelable: true, onDismiss: () => resolve('cancel') },
    );
  });

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { state, dispatch, ready } = useStore();
  const uid = user?.id ?? null;
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<number | null>(null);

  const stateRef = useRef(state);
  const baseline = useRef<Rows | null>(null);
  const armed = useRef(false); // une première synchronisation a réussi pour ce compte
  const paused = useRef(false);
  const running = useRef(false);
  const queued = useRef<null | { full: boolean }>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const saveBaseline = useCallback(
    (id: string, rows: Rows) => {
      baseline.current = rows;
      AsyncStorage.setItem(baselineKey(id), JSON.stringify(rows)).catch(() => {});
    },
    [],
  );

  const adopt = useCallback(
    (id: string, remote: Rows) => {
      const next = fromRows(remote, stateRef.current);
      // Mis à jour tout de suite : le prochain tour ne doit jamais relire l'ancien état avant le rendu.
      stateRef.current = next;
      dispatch({ type: 'import', state: next });
      saveBaseline(id, remote);
    },
    [dispatch, saveBaseline],
  );

  /** Un tour de synchronisation. `full` relit aussi le serveur (retour au premier plan, connexion). */
  const cycle = useCallback(
    async (id: string, full: boolean) => {
      const local = toRows(stateRef.current);

      if (!baseline.current) {
        // Premier passage de ce compte sur cet appareil.
        const remote = canonical(await fetchRemote(id));
        if (rowsEmpty(remote)) {
          await push(id, diffRows(null, local));
          saveBaseline(id, local);
        } else if (isBlankState(stateRef.current)) {
          adopt(id, remote);
        } else if (rowsEqual(remote, local)) {
          saveBaseline(id, local);
        } else {
          const choice = await askConflict(local.transactions.length, remote.transactions.length);
          if (choice === 'cancel') {
            paused.current = true;
            return false;
          }
          if (choice === 'remote') adopt(id, remote);
          else {
            await push(id, diffRows(remote, local));
            saveBaseline(id, local);
          }
        }
        return true;
      }

      let base = baseline.current;
      if (full) {
        const remote = canonical(await fetchRemote(id));
        if (!rowsEqual(remote, base)) {
          // Un autre appareil a modifié le compte. Sans modification ici : on reprend. Sinon, ce téléphone gagne.
          if (rowsEqual(local, base)) {
            adopt(id, remote);
            return true;
          }
          base = remote;
        }
      }
      const diff = diffRows(base, local);
      if (!isDiffEmpty(diff)) await push(id, diff);
      saveBaseline(id, local);
      return true;
    },
    [adopt, saveBaseline],
  );

  const run = useCallback(
    async (full: boolean) => {
      if (!supabase || !uid || !ready) return;
      if (running.current) {
        queued.current = { full: full || Boolean(queued.current?.full) };
        return;
      }
      running.current = true;
      setStatus('syncing');
      try {
        let next: { full: boolean } | null = { full };
        let ok = true;
        while (next && ok) {
          queued.current = null;
          ok = await cycle(uid, next.full);
          next = queued.current;
        }
        if (ok) armed.current = true;
        setStatus(ok ? 'idle' : 'paused');
        if (ok) setLastSync(Date.now());
      } catch (e) {
        console.warn('[sync]', e instanceof Error ? e.message : e);
        setStatus('error');
      } finally {
        running.current = false;
      }
    },
    [uid, ready, cycle],
  );

  // Connexion ou changement de compte : on recharge le dernier état connu du serveur, puis on synchronise.
  useEffect(() => {
    armed.current = false;
    paused.current = false;
    baseline.current = null;
    if (!uid || !ready) return;
    let cancelled = false;
    AsyncStorage.getItem(baselineKey(uid))
      .then((raw) => {
        if (raw) baseline.current = JSON.parse(raw) as Rows;
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) run(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, ready, run]);

  // Chaque modification locale est envoyée peu après (on regroupe les saisies rapprochées).
  useEffect(() => {
    if (!uid || !ready || !armed.current || paused.current) return;
    const timer = setTimeout(() => run(false), 1500);
    return () => clearTimeout(timer);
  }, [state, uid, ready, run]);

  // Retour au premier plan : on reprend aussi ce que d'autres appareils ont écrit.
  useEffect(() => {
    if (!uid) return;
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active' && !paused.current) run(true);
    });
    return () => sub.remove();
  }, [uid, run]);

  const syncNow = useCallback(async () => {
    paused.current = false;
    await run(true);
  }, [run]);

  const value = useMemo<SyncValue>(() => ({ status: uid ? status : 'off', lastSync, syncNow }), [uid, status, lastSync, syncNow]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSync must be used inside SyncProvider');
  return v;
}
