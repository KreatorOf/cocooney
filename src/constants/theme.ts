/**
 * Design system de l'app.
 * Palette claire/sombre + tokens d'espacement, rayon et typographie.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11121A',
    textSecondary: '#6B7280',
    background: '#F4F5F7',
    card: '#FFFFFF',
    backgroundElement: '#EEF0F4',
    backgroundSelected: '#E3E6EC',
    border: '#E7E8EE',
    accent: '#6457F9',
    accentSoft: '#ECEBFE',
    onAccent: '#FFFFFF',
    track: '#E9EAF0',
    success: '#119A63',
    danger: '#E5484D',
    warning: '#E08A00',
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#9A9AA8',
    background: '#0B0B0F',
    card: '#16161C',
    backgroundElement: '#202028',
    backgroundSelected: '#2A2A33',
    border: '#26262E',
    accent: '#8B80FF',
    accentSoft: '#211F3A',
    onAccent: '#FFFFFF',
    track: '#26262E',
    success: '#34C759',
    danger: '#FF6168',
    warning: '#FFB020',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Palette de couleurs pour les catégories (icônes / pastilles). */
export const CategoryPalette = [
  '#6457F9', // indigo
  '#FF7A45', // orange
  '#1FA463', // vert
  '#E5484D', // rouge
  '#0EA5E9', // bleu ciel
  '#EAB308', // jaune
  '#EC4899', // rose
  '#14B8A6', // turquoise
  '#8B5CF6', // violet
] as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
