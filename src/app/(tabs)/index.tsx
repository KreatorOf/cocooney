import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/BottomBar';
import { Card } from '@/components/Card';
import { EnvelopeRow } from '@/components/EnvelopeRow';
import { FilterChips, type FilterChip } from '@/components/FilterChips';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/TransactionRow';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  balanceBetween,
  projectedSpend,
  spentForScope,
  spentInCategory,
  subscriptionsTotal,
  topCategories,
  totalBudget,
  upcomingSubscriptions,
} from '@/domain/selectors';
import type { Category, Transaction } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { daysLeftInMonth, monthKey, relativeDay } from '@/utils/date';
import { formatCents } from '@/utils/money';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { CategoryIcon } from '@/components/CategoryIcon';

/** Petit wrapper d'animation d'entrée, décalé selon l'ordre d'apparition. */
function Reveal({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(delay).springify().damping(18)}>
      {children}
    </Animated.View>
  );
}

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { members, categories, budgets, transactions, subscriptions, currentMonth, selectedMonth, currentUserId } =
    useBudgetStore();
  const isCurrentMonth = selectedMonth === currentMonth;
  const subTotal = subscriptionsTotal(subscriptions);
  const nextSub = upcomingSubscriptions(subscriptions)[0];

  const sharedCategories = categories.filter((c) => c.scope === 'shared');
  const totalLimit = totalBudget(budgets, categories, 'shared', selectedMonth);
  const totalSpent = spentForScope(transactions, categories, 'shared', selectedMonth);
  const remaining = totalLimit - totalSpent;
  const daysLeft = daysLeftInMonth();
  const projected = isCurrentMonth && totalSpent > 0 ? projectedSpend(totalSpent) : null;
  const top = topCategories(transactions, categories, 'shared', selectedMonth, 3);

  const me = members.find((m) => m.id === currentUserId);
  const partner = members.find((m) => m.id !== currentUserId);
  const balance =
    me && partner ? balanceBetween(me, partner, transactions, members, selectedMonth) : 0;

  const recent = transactions
    .filter((t) => t.scope === 'shared' && monthKey(t.date) === selectedMonth)
    .slice(0, 6);
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? '?';

  // Enveloppes perso du partenaire — présentes seulement s'il a activé le partage.
  const partnerPersonal = categories.filter(
    (c) => c.scope === 'personal' && c.ownerId && c.ownerId !== currentUserId,
  );

  // --- Filtres « pills » -----------------------------------------------------
  const [filter, setFilter] = useState('all');
  const chips = useMemo<FilterChip[]>(() => {
    const list: FilterChip[] = [{ id: 'all', label: t('filters.all') }];
    for (const c of sharedCategories) list.push({ id: c.id, label: c.name });
    if (subscriptions.length > 0) list.push({ id: 'subscriptions', label: t('filters.subscriptions') });
    return list;
  }, [sharedCategories, subscriptions.length, t]);

  // Garde-fou : si la catégorie filtrée disparaît, on revient à « Tout ».
  const activeFilter = chips.some((c) => c.id === filter) ? filter : 'all';
  const focusCategory =
    activeFilter !== 'all' && activeFilter !== 'subscriptions'
      ? sharedCategories.find((c) => c.id === activeFilter)
      : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: BOTTOM_BAR_SPACE },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* En-tête */}
        <Reveal delay={0}>
          <ScreenHeader
            title={t('household.title')}
            right={
              <View style={styles.avatars}>
                {partner && <Avatar emoji={partner.emoji} />}
                {me && <Avatar emoji={me.emoji} overlap={!!partner} />}
              </View>
            }
          />
        </Reveal>

        {/* Filtres */}
        <Reveal delay={20}>
          <FilterChips items={chips} selectedId={activeFilter} onSelect={setFilter} />
        </Reveal>

        <Reveal delay={40}>
          <MonthSwitcher />
        </Reveal>

        {activeFilter === 'all' && (
          <>
            {/* Carte « reste à vivre » */}
            <Reveal delay={70}>
              <Card style={{ gap: Spacing.md }}>
                <ThemedText type="small" themeColor="textSecondary">
                  {isCurrentMonth ? t('household.remainingToLiveThisMonth') : t('household.remainingToLive')}
                </ThemedText>
                <ThemedText style={styles.hero}>{formatCents(remaining)}</ThemedText>
                <ProgressBar progress={totalLimit > 0 ? totalSpent / totalLimit : 0} height={10} />
                <View style={styles.heroFooter}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.tnum}>
                    {formatCents(totalSpent)} / {formatCents(totalLimit)}
                  </ThemedText>
                  {isCurrentMonth && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('household.daysLeft', { count: daysLeft })}
                    </ThemedText>
                  )}
                </View>
                {projected !== null && totalLimit > 0 && (
                  <View style={[styles.projection, { borderColor: theme.border }]}>
                    <Ionicons
                      name="trending-up"
                      size={16}
                      color={projected > totalLimit ? theme.danger : theme.success}
                    />
                    <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                      {t('household.atThisRate')}{' '}
                      <ThemedText
                        type="smallBold"
                        style={{ color: projected > totalLimit ? theme.danger : theme.text }}>
                        {formatCents(projected)}
                      </ThemedText>{' '}
                      {t('household.atMonthEnd')}
                    </ThemedText>
                  </View>
                )}
              </Card>
            </Reveal>

            {/* Solde inter-partenaires (ou invitation si seul) */}
            <Reveal delay={130}>
              {me && partner ? (
                <BalancePill balance={balance} partner={partner.name} />
              ) : (
                <InvitePill />
              )}
            </Reveal>

            {/* Abonnements à venir */}
            {subscriptions.length > 0 && (
              <Reveal delay={160}>
                <Pressable onPress={() => router.push('/subscriptions')}>
                  <Card style={styles.subCard}>
                    <View style={[styles.subIcon, { backgroundColor: theme.accentSoft }]}>
                      <Ionicons name="repeat" size={20} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="smallBold">
                        {t('household.subsPerMonth', { amount: formatCents(subTotal) })}
                      </ThemedText>
                      {nextSub && (
                        <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                          {t('household.nextSub', { name: nextSub.sub.name, when: relativeDay(nextSub.nextDate) })}
                        </ThemedText>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </Card>
                </Pressable>
              </Reveal>
            )}

            {/* Enveloppes */}
            <Reveal delay={190}>
              <View style={{ gap: Spacing.md }}>
                <SectionTitle>{t('household.envelopes')}</SectionTitle>
                <Card>
                  {sharedCategories.map((cat, i) => {
                    const budget = budgets.find(
                      (b) => b.categoryId === cat.id && b.month === selectedMonth,
                    );
                    return (
                      <View key={cat.id}>
                        {i > 0 && <Divider />}
                        <Pressable
                          onPress={() => router.push(`/category/${cat.id}`)}
                          style={({ pressed }) => pressed && { opacity: 0.6 }}>
                          <EnvelopeRow
                            category={cat}
                            spentCents={spentInCategory(transactions, cat.id, selectedMonth)}
                            limitCents={budget?.limitCents ?? 0}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </Card>
              </View>
            </Reveal>

            {/* Perso du partenaire (s'il partage) */}
            {partner && partnerPersonal.length > 0 && (
              <Reveal delay={220}>
                <View style={{ gap: Spacing.md }}>
                  <SectionTitle>{t('household.partnerPersonal', { name: partner.name })}</SectionTitle>
                  <Card>
                    {partnerPersonal.map((cat, i) => {
                      const budget = budgets.find(
                        (b) => b.categoryId === cat.id && b.month === selectedMonth,
                      );
                      return (
                        <View key={cat.id}>
                          {i > 0 && <Divider />}
                          <EnvelopeRow
                            category={cat}
                            spentCents={spentInCategory(transactions, cat.id, selectedMonth)}
                            limitCents={budget?.limitCents ?? 0}
                          />
                        </View>
                      );
                    })}
                  </Card>
                </View>
              </Reveal>
            )}

            {/* Top catégories du mois */}
            {top.length > 0 && (
              <Reveal delay={240}>
                <View style={{ gap: Spacing.md }}>
                  <SectionTitle>{t('household.whereMoneyGoes')}</SectionTitle>
                  <Card style={{ gap: Spacing.md }}>
                    {top.map(({ category, spentCents }) => (
                      <View key={category.id} style={styles.topRow}>
                        <CategoryIcon icon={category.icon} color={category.color} size={36} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.heroFooter}>
                            <ThemedText type="small" style={{ fontWeight: '600' }}>
                              {category.name}
                            </ThemedText>
                            <ThemedText type="smallBold" style={styles.tnum}>
                              {formatCents(spentCents)}
                            </ThemedText>
                          </View>
                          <ProgressBar
                            progress={top[0].spentCents > 0 ? spentCents / top[0].spentCents : 0}
                            color={category.color}
                            height={6}
                          />
                        </View>
                      </View>
                    ))}
                  </Card>
                </View>
              </Reveal>
            )}

            {/* Activité récente */}
            <Reveal delay={250}>
              <View style={{ gap: Spacing.md }}>
                <View style={styles.sectionRow}>
                  <SectionTitle>{t('household.recentActivity')}</SectionTitle>
                  <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                    <ThemedText type="smallBold" style={{ color: theme.accent }}>
                      {t('common.seeAll')}
                    </ThemedText>
                  </Pressable>
                </View>
                <Card>
                  {recent.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('household.noExpenseYet')}
                    </ThemedText>
                  ) : (
                    recent.map((tx, i) => {
                      const cat = categories.find((c) => c.id === tx.categoryId);
                      return (
                        <View key={tx.id}>
                          {i > 0 && <Divider />}
                          <TransactionRow
                            tx={tx}
                            category={cat}
                            payerName={memberName(tx.ownerId)}
                            onLongPress={() => useBudgetStore.getState().deleteTransaction(tx.id)}
                          />
                        </View>
                      );
                    })
                  )}
                </Card>
              </View>
            </Reveal>
          </>
        )}

        {/* Filtre : abonnements */}
        {activeFilter === 'subscriptions' && (
          <Reveal delay={70}>
            <View style={{ gap: Spacing.md }}>
              <Pressable onPress={() => router.push('/subscriptions')}>
                <Card style={{ gap: Spacing.xs }}>
                  <ThemedText type="small" themeColor="textSecondary">{t('subscriptions.monthlyTotal')}</ThemedText>
                  <ThemedText style={styles.hero}>{formatCents(subTotal)}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('subscriptions.activeCount', { count: subscriptions.filter((s) => s.active).length })}
                  </ThemedText>
                </Card>
              </Pressable>

              <View style={styles.sectionRow}>
                <SectionTitle>{t('subscriptions.upcoming')}</SectionTitle>
                <Pressable onPress={() => router.push('/subscriptions')} hitSlop={8}>
                  <ThemedText type="smallBold" style={{ color: theme.accent }}>
                    {t('common.seeAll')}
                  </ThemedText>
                </Pressable>
              </View>
              <Card style={{ gap: Spacing.md }}>
                {upcomingSubscriptions(subscriptions).slice(0, 8).map(({ sub, nextDate }) => (
                  <View key={sub.id} style={styles.topRow}>
                    <CategoryIcon icon={sub.icon} color={sub.color} size={40} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="small" style={{ fontWeight: '600' }} numberOfLines={1}>{sub.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                        {relativeDay(nextDate)} · {formatCents(sub.amountCents)}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          </Reveal>
        )}

        {/* Filtre : enveloppe ciblée */}
        {focusCategory && (
          <FocusCategory
            category={focusCategory}
            limitCents={
              budgets.find((b) => b.categoryId === focusCategory.id && b.month === selectedMonth)
                ?.limitCents ?? 0
            }
            spentCents={spentInCategory(transactions, focusCategory.id, selectedMonth)}
            transactions={transactions
              .filter((tx) => tx.categoryId === focusCategory.id && monthKey(tx.date) === selectedMonth)
              .sort((a, b) => +new Date(b.date) - +new Date(a.date))}
            memberName={memberName}
          />
        )}
      </ScrollView>

      <BottomBar
        label={t('transaction.addExpense')}
        onPress={() => router.push('/add-transaction?scope=shared')}
      />
    </View>
  );
}

/** Vue focus d'une enveloppe : jauge + transactions du mois. */
function FocusCategory({
  category,
  limitCents,
  spentCents,
  transactions,
  memberName,
}: {
  category: Category;
  limitCents: number;
  spentCents: number;
  transactions: Transaction[];
  memberName: (id: string) => string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <>
      <Reveal delay={70}>
        <Card>
          <Pressable
            onPress={() => router.push(`/category/${category.id}`)}
            style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <EnvelopeRow category={category} spentCents={spentCents} limitCents={limitCents} />
          </Pressable>
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <View style={{ gap: Spacing.md }}>
          <View style={styles.sectionRow}>
            <SectionTitle>{t('household.focusTransactions')}</SectionTitle>
            <Pressable onPress={() => router.push(`/category/${category.id}`)} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                {t('common.seeAll')}
              </ThemedText>
            </Pressable>
          </View>
          <Card>
            {transactions.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('category.noExpenseThisMonth')}
              </ThemedText>
            ) : (
              transactions.slice(0, 8).map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 && <Divider />}
                  <TransactionRow
                    tx={tx}
                    category={category}
                    payerName={tx.scope === 'shared' ? memberName(tx.ownerId) : undefined}
                    onLongPress={() => useBudgetStore.getState().deleteTransaction(tx.id)}
                  />
                </View>
              ))
            )}
          </Card>
        </View>
      </Reveal>
    </>
  );
}

function Avatar({ emoji, overlap }: { emoji: string; overlap?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: theme.backgroundElement, borderColor: theme.background },
        overlap && { marginLeft: -12 },
      ]}>
      <ThemedText style={{ fontSize: 18 }}>{emoji}</ThemedText>
    </View>
  );
}

function BalancePill({ balance, partner }: { balance: number; partner: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const settled = Math.abs(balance) < 50;
  const iOwe = balance < 0;
  const amount = formatCents(Math.abs(balance));
  const text = settled
    ? t('household.balanceSettled')
    : iOwe
      ? t('household.balanceIOwe', { amount, partner })
      : t('household.balancePartnerOwes', { amount, partner });

  return (
    <View
      style={[
        styles.balance,
        {
          backgroundColor: settled ? theme.backgroundElement : theme.accentSoft,
          borderColor: theme.border,
        },
      ]}>
      <Ionicons
        name={settled ? 'checkmark-circle' : 'swap-horizontal'}
        size={20}
        color={settled ? theme.success : theme.accent}
      />
      <ThemedText type="smallBold" style={{ flex: 1 }}>
        {text}
      </ThemedText>
    </View>
  );
}

function InvitePill() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.navigate('/settings')}
      style={({ pressed }) => [
        styles.balance,
        { backgroundColor: theme.accentSoft, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name="person-add" size={20} color={theme.accent} />
      <ThemedText type="smallBold" style={{ flex: 1 }}>
        {t('household.invitePartner')}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 2 }} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { fontSize: 40, fontWeight: '700', lineHeight: 46, fontVariant: ['tabular-nums'] },
  tnum: { fontVariant: ['tabular-nums'] },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  projection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  subIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
