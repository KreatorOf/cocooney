/** Helpers de formatage monétaire (EUR), localisés selon la langue de l'app. */

import i18n from '@/lib/i18n';

/** Locale BCP-47 courante pour `Intl.NumberFormat` (suit la langue de l'app). */
function moneyLocale(): string {
  return i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
}

/** 123456 (centimes) -> "1 234,56 €" (FR) / "€1,234.56" (EN) */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat(moneyLocale(), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Sans les centimes : 123456 -> "1 235 €" */
export function formatCentsRounded(cents: number): string {
  return new Intl.NumberFormat(moneyLocale(), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** "12,50" ou "12.5" -> 1250 (centimes). Retourne 0 si invalide. */
export function parseAmountToCents(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
