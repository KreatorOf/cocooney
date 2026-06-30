import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/BottomBar';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SubscriptionSheet } from '@/components/SubscriptionSheet';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { subscriptionsTotal, upcomingSubscriptions } from '@/domain/selectors';
import type { Subscription } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { usePremium } from '@/providers/PremiumProvider';
import { useBudgetStore } from '@/store/useBudgetStore';
import { dateLocale, relativeDay } from '@/utils/date';
import { formatCents } from '@/utils/money';

const FREE_SUB_LIMIT = 3;

export default function SubscriptionsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    subscriptions, accounts, currentUserId,
    addSubscription, updateSubscription, deleteSubscription, addTransaction,
  } = useBudgetStore();

  const { isPremium } = usePremium();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const total = subscriptionsTotal(subscriptions);
  const upcoming = upcomingSubscriptions(subscriptions);

  const openAdd = () => {
    if (!isPremium && subscriptions.length >= FREE_SUB_LIMIT) {
      router.push('/paywall');
      return;
    }
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (sub: Subscription) => { setEditing(sub); setSheetOpen(true); };

  const pay = (sub: Subscription) => {
    const account = accounts.find((a) =>
      sub.scope === 'shared' ? a.scope === 'shared' : a.scope === 'personal' && a.ownerId === currentUserId,
    );
    addTransaction({
      amountCents: -sub.amountCents,
      label: sub.name,
      scope: sub.scope,
      ownerId: currentUserId,
      categoryId: sub.categoryId ?? '',
      accountId: account?.id,
      splitRule: sub.scope === 'shared' ? { kind: 'fiftyFifty' } : undefined,
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" style={{ flex: 1, textAlign: 'center' }}>{t('subscriptions.title')}</ThemedText>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: BOTTOM_BAR_SPACE }]}
        showsVerticalScrollIndicator={false}>
        {/* Total mensuel */}
        <Card style={{ gap: Spacing.xs }}>
          <ThemedText type="small" themeColor="textSecondary">{t('subscriptions.monthlyTotal')}</ThemedText>
          <ThemedText style={styles.hero}>{formatCents(total)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('subscriptions.activeCount', { count: subscriptions.filter((s) => s.active).length })}
          </ThemedText>
        </Card>

        {upcoming.length > 0 && (
          <>
            <SectionTitle>{t('subscriptions.upcoming')}</SectionTitle>
            <Card style={{ gap: Spacing.md }}>
              {upcoming.slice(0, 8).map(({ sub, nextDate }) => (
                <View key={sub.id} style={styles.row}>
                  <View style={[styles.dateBadge, { backgroundColor: sub.color + '22' }]}>
                    <ThemedText type="smallBold" style={{ color: sub.color, fontSize: 16 }}>
                      {nextDate.getDate()}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: sub.color, fontSize: 10 }}>
                      {nextDate.toLocaleDateString(dateLocale(), { month: 'short' })}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: '600' }} numberOfLines={1}>{sub.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                      {relativeDay(nextDate)} · {formatCents(sub.amountCents)}
                    </ThemedText>
                  </View>
                  <Pressable
                    onPress={() => pay(sub)}
                    style={({ pressed }) => [styles.payBtn, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.6 : 1 }]}>
                    <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>{t('subscriptions.pay')}</ThemedText>
                  </Pressable>
                </View>
              ))}
            </Card>
          </>
        )}

        <SectionTitle>{t('subscriptions.all')}</SectionTitle>
        <Card>
          {subscriptions.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('subscriptions.empty')}
            </ThemedText>
          ) : (
            subscriptions.map((sub, i) => (
              <View key={sub.id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 2 }} />}
                <Pressable onPress={() => openEdit(sub)} style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.6 }]}>
                  <CategoryIcon icon={sub.icon} color={sub.color} size={42} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: '600' }} numberOfLines={1}>{sub.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                      {t('subscriptions.onDay', { day: sub.dayOfMonth })} · {sub.scope === 'shared' ? t('subscriptions.scopeHousehold') : t('subscriptions.scopePersonal')}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
                    {formatCents(sub.amountCents)}
                  </ThemedText>
                </Pressable>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <BottomBar label={t('subscriptions.add')} onPress={openAdd} />

      <SubscriptionSheet
        visible={sheetOpen}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSave={(d) => {
          if (editing) updateSubscription({ ...editing, ...d });
          else addSubscription(d);
        }}
        onDelete={deleteSubscription}
      />
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginLeft: Spacing.xs, letterSpacing: 0.5 }}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: { fontSize: 36, fontWeight: '700', lineHeight: 42, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dateBadge: { width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  payBtn: { paddingHorizontal: 14, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
});
