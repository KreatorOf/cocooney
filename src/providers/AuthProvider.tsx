import * as AppleAuthentication from 'expo-apple-authentication';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { GOOGLE_WEB_CLIENT_ID, hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  household_id: string | null;
  display_name: string;
  emoji: string;
  monthly_income_cents: number | null;
  onboarding_completed: boolean;
  share_personal: boolean;
  is_premium: boolean;
}

interface AuthValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  signInApple: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setSharePersonal: (value: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const refreshStarted = useRef(false);

  const loadProfile = async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, household_id, display_name, emoji, monthly_income_cents, onboarding_completed, share_personal, is_premium')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? null);
  };

  // Initialisation : session existante + écoute des changements d'auth.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Rafraîchissement automatique des tokens selon l'état de l'app.
  useEffect(() => {
    if (!supabase) return;
    const onChange = (state: string) => {
      if (!supabase) return;
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    if (!refreshStarted.current && AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
      refreshStarted.current = true;
    }
    const s = AppState.addEventListener('change', onChange);
    return () => s.remove();
  }, []);

  const signInApple = async () => {
    if (!supabase) throw new Error('Supabase non configuré');
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Token Apple manquant');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
    // Apple ne renvoie le nom qu'à la première connexion.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');
    if (fullName) await supabase.auth.updateUser({ data: { full_name: fullName } });
  };

  const signInGoogle = async () => {
    if (!supabase) throw new Error('Supabase non configuré');
    // Import paresseux : le module natif n'existe pas dans Expo Go.
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    const idToken = response?.data?.idToken ?? response?.idToken;
    if (!idToken) throw new Error('Token Google manquant');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;
  };

  // Connexion par email/mot de passe : se connecte, ou crée le compte s'il
  // n'existe pas encore (pratique pour valider la sync sans dev build).
  const signInEmail = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase non configuré');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return;
    if (error.message.toLowerCase().includes('invalid')) {
      const { data, error: signErr } = await supabase.auth.signUp({ email, password });
      if (signErr) throw signErr;
      if (!data.session) {
        throw new Error(
          'Compte créé. Désactive « Confirm email » dans Supabase (Authentication → Sign In → Email) puis réessaie.',
        );
      }
      return;
    }
    throw error;
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };

  const completeOnboarding = async () => {
    if (!supabase || !session) return;
    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', session.user.id);
    await loadProfile(session.user.id);
  };

  const setSharePersonal = async (value: boolean) => {
    if (!supabase || !session) return;
    setProfile((p) => (p ? { ...p, share_personal: value } : p)); // optimiste
    await supabase.from('profiles').update({ share_personal: value }).eq('id', session.user.id);
  };

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      profile,
      signInApple,
      signInGoogle,
      signInEmail,
      signOut,
      refreshProfile,
      completeOnboarding,
      setSharePersonal,
    }),
    [loading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

/** Plateforme où Sign in with Apple est disponible nativement. */
export const appleAuthAvailable = Platform.OS === 'ios';
export { hasSupabase };
