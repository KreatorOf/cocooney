/** Helpers de date. */

import i18n from '@/lib/i18n';

/** Locale BCP-47 courante pour `toLocaleDateString` (suit la langue de l'app). */
export function dateLocale(): string {
  return i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';
}

/** Clé de mois 'YYYY-MM' à partir d'une date ISO ou d'un Date. */
export function monthKey(date: string | Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Libellé lisible : 'Juin 2026'. */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Nombre de jours restants dans le mois courant. */
export function daysLeftInMonth(now: Date = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate();
}

/** Décale une clé de mois 'YYYY-MM' de `delta` mois. */
export function addMonths(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Nombre total de jours dans le mois. */
export function daysInMonth(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/** Jours écoulés dans le mois (au moins 1). */
export function daysElapsed(now: Date = new Date()): number {
  return Math.max(1, now.getDate());
}

/** Prochaine date de prélèvement pour un jour du mois donné (écrêté). */
export function nextOccurrence(dayOfMonth: number, from: Date = new Date()): Date {
  const todayMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const clampDay = (y: number, m: number) =>
    Math.min(dayOfMonth, new Date(y, m + 1, 0).getDate());
  let d = new Date(from.getFullYear(), from.getMonth(), clampDay(from.getFullYear(), from.getMonth()));
  if (d < todayMidnight) {
    const ny = from.getMonth() === 11 ? from.getFullYear() + 1 : from.getFullYear();
    const nm = (from.getMonth() + 1) % 12;
    d = new Date(ny, nm, clampDay(ny, nm));
  }
  return d;
}

/** « Aujourd'hui », « Demain », « Dans 3 jours », sinon « 12 juil. ». */
export function relativeDay(date: Date, now: Date = new Date()): string {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (diff <= 0) return i18n.t('common.today');
  if (diff === 1) return i18n.t('common.tomorrow');
  if (diff < 7) return i18n.t('common.inDays', { count: diff });
  return date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}

/** Libellé relatif court d'une transaction : "Aujourd'hui", "Hier", "12 juin". */
export function shortDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return i18n.t('common.today');
  if (diffDays === 1) return i18n.t('common.yesterday');
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}
