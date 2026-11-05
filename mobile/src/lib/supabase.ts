import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Valeurs publiques (clé « anon » / publishable) : la sécurité vient des policies RLS
// de supabase/schema.sql, pas du secret de cette clé. Ne jamais mettre la clé service_role ici.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** False tant que `.env.local` n'est pas rempli : l'app marche alors sans compte, comme avant. */
export const supabaseConfigured = Boolean(url && key);

export const supabase = supabaseConfigured
  ? createClient(url as string, key as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
