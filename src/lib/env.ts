/**
 * Variables d'environnement publiques (préfixe EXPO_PUBLIC_ → embarquées
 * dans le bundle). À définir dans un fichier `.env` à la racine.
 *
 * Si Supabase n'est pas configuré, l'app tourne en MODE DÉMO LOCAL
 * (données d'exemple, pas d'authentification ni de sync).
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Client ID « Web » de Google OAuth (audience du token, cf. runbook). */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** true → mode connecté + sync. false → mode démo local. */
export const hasSupabase = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Clés RevenueCat (monétisation). Absentes → Premium désactivé proprement. */
export const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
export const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
export const hasRevenueCat = REVENUECAT_IOS_KEY.length > 0 || REVENUECAT_ANDROID_KEY.length > 0;
