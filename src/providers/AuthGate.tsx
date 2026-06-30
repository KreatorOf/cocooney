import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { hasSupabase } from '@/lib/env';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Redirige selon l'état d'authentification :
 *  - pas connecté                       → /sign-in
 *  - connecté sans foyer                 → /setup-household
 *  - connecté, foyer, onboarding à faire → /onboarding
 *  - connecté, foyer, onboarding fait    → app (onglets)
 * Sans config Supabase, ne fait rien (mais l'app exige désormais un compte).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, session, profile } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabase || loading) return;
    const first = segments[0];
    const inSignIn = first === 'sign-in';
    const inSetup = first === 'setup-household';
    const inOnboarding = first === 'onboarding';

    if (!session) {
      if (!inSignIn) router.replace('/sign-in');
    } else if (!profile?.household_id) {
      if (!inSetup) router.replace('/setup-household');
    } else if (!profile?.onboarding_completed) {
      if (!inOnboarding) router.replace('/onboarding');
    } else if (inSignIn || inSetup || inOnboarding) {
      router.replace('/');
    }
  }, [loading, session, profile, segments]);

  return <>{children}</>;
}
