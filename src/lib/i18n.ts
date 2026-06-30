/**
 * Internationalisation (FR / EN).
 * - Détection de la langue de l'appareil via expo-localization.
 * - Préférence utilisateur persistée (AsyncStorage) prioritaire sur l'appareil.
 * - `setLanguage` change la langue à chaud ET persiste le choix.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'app.language';
const FALLBACK: Language = 'fr';

function normalize(code?: string | null): Language {
  const lng = (code ?? '').slice(0, 2).toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng) ? (lng as Language) : FALLBACK;
}

/** Langue de l'appareil, ramenée à une langue supportée. */
const deviceLanguage = normalize(getLocales()[0]?.languageCode);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: deviceLanguage,
  fallbackLng: FALLBACK,
  supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
  load: 'languageOnly',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Restaure la préférence persistée (asynchrone) si elle diffère de l'appareil.
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (saved && saved !== i18n.language && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
      void i18n.changeLanguage(saved);
    }
  })
  .catch(() => {});

/** Change la langue et persiste le choix. */
export async function setLanguage(lng: Language): Promise<void> {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // best-effort
  }
}

export default i18n;
