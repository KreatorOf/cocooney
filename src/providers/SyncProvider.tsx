import { useEffect } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { resetSyncHandlers } from '@/lib/syncBridge';
import { pullAll, registerWriters, startRealtime } from '@/lib/sync';
import { supabase } from '@/lib/supabase';

/**
 * Active la synchronisation dès qu'un utilisateur est connecté ET rattaché à
 * un foyer. Charge l'instantané, branche les écritures et écoute le Realtime.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const householdId = profile?.household_id ?? null;
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase || !householdId || !userId) return;

    registerWriters(householdId);
    void pullAll(householdId, userId);

    // Realtime : un changement distant → pull complet (anti-rebond léger).
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = startRealtime(householdId, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void pullAll(householdId, userId), 250);
    });

    return () => {
      if (timer) clearTimeout(timer);
      if (channel) void supabase?.removeChannel(channel);
      resetSyncHandlers();
    };
  }, [householdId, userId]);

  return <>{children}</>;
}
