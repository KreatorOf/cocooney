import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabase } from './env';

/**
 * Client Supabase. `null` en mode démo local (pas de config).
 * Persiste la session via AsyncStorage et rafraîchit les tokens
 * automatiquement (voir AuthProvider qui gère le cycle AppState).
 */
export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
