/**
 * Notifications locales pour les crédits du foyer.
 * Chaque appareil planifie ses propres rappels mensuels (2 j avant le
 * prélèvement, 9h). Les crédits étant partagés et synchronisés, les deux
 * membres reçoivent leurs rappels. Nécessite un dev build (module natif).
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isCreditDone } from '@/domain/selectors';
import type { Credit } from '@/domain/types';
import i18n from '@/lib/i18n';
import { formatCents } from '@/utils/money';

const CHANNEL_ID = 'credits';
const NOTIFY_DAYS_BEFORE = 2;
const NOTIFY_HOUR = 9;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionRequested = false;

/** Demande la permission (une fois) et crée le canal Android. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Crédits',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

/** Replanifie tous les rappels de crédits (annule puis reprogramme). */
export async function syncCreditReminders(credits: Credit[]): Promise<void> {
  try {
    const granted = await ensurePermission();
    if (!granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    const active = credits.filter((c) => c.active && !isCreditDone(c));
    for (const c of active) {
      // Écrêté à 28 pour rester valide sur tous les mois ; jamais avant le 1er.
      const day = Math.max(1, Math.min(28, c.dayOfMonth - NOTIFY_DAYS_BEFORE));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t('notifications.creditReminderTitle'),
          body: i18n.t('notifications.creditReminderBody', {
            name: c.name,
            amount: formatCents(c.monthlyPaymentCents),
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day,
          hour: NOTIFY_HOUR,
          minute: 0,
          channelId: CHANNEL_ID,
        },
      });
    }
  } catch {
    // Notifications indisponibles (Expo Go / permission refusée) → silencieux.
  }
}
