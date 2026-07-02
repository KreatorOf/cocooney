import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddFab } from '@/components/AddFab';
import { BOTTOM_BAR_SPACE } from '@/components/BottomBar';
import { Card } from '@/components/Card';
import { CreditsView } from '@/components/CreditsView';
import { EmptyState } from '@/components/EmptyState';
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
  totalBudget,
} from '@/domain/selectors';
import { noBounce } from '@/constants/scroll';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { daysLeftInMonth, monthKey } from '@/utils/date';
import { formatCents } from '@/utils/money';
import { MonthSwitcher } from '@/components/MonthSwitcher';

/** Petit wrapper d'animation d'entrée (fondu net), décalé selon l'ordre d'apparition. */
function Reveal({ delay, children }: { delay: number; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(delay)}>
      {children}
    </Animated.View>
  );
}

export default function HouseholdScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { members, categories, budgets, transactions, currentMonth, selectedMonth, currentUserId } =
    useBudgetStore();
  const isCurrentMonth = selectedMonth === currentMonth;

  const sharedCategories = categories.filter((c) => c.scope === 'shared');
  const totalLimit = totalBudget(budgets, categories, 'shared', selectedMonth);
  const totalSpent = spentForScope(transactions, categories, 'shared', selectedMonth);
  const remaining = totalLimit - totalSpent;
  const daysLeft = daysLeftInMonth();
  const projected = isCurrentMonth && totalSpent > 0 ? projectedSpend(totalSpent) : null;

  const me = members.find((m) => m.id === currentUserId);
  const partner = members.find((m) => m.id !== currentUserId);
  const balance =
    me && partner ? balanceBetween(me, partner, transactions, members, selectedMonth) : 0;

  const recent = transactions
    .filter((t) => t.scope === 'shared' && monthKey(t.date) === selectedMonth)
    .slice(0, 3);
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? '?';

  // Enveloppes perso du partenaire — présentes seulement s'il a activé le partage.
  const partnerPersonal = categories.filter(
    (c) => c.scope === 'personal' && c.ownerId && c.ownerId !== currentUserId,
  );

  // --- Pills fixes : Tout / Crédits / Charges --------------------------------
  const [activeFilter, setActiveFilter] = useState<'all' | 'credits' | 'charges'>('all');
  const chips: FilterChip[] = [
    { id: 'all', label: t('filters.all') },
    { id: 'credits', label: t('filters.credits') },
    { id: 'charges', label: t('filters.charges') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        {...noBounce}
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
          <FilterChips
            items={chips}
            selectedId={activeFilter}
            onSelect={(id) => setActiveFilter(id as 'all' | 'credits' | 'charges')}
          />
        </Reveal>

        {activeFilter === 'all' && (
          <>
            {/* Carte « reste à vivre » — mois intégré dans l'en-tête */}
            <Reveal delay={70}>
              <Card style={{ gap: Spacing.md }}>
                <View style={styles.heroHeader}>
                  <MonthSwitcher inline />
                  <ThemedText type="small" themeColor="textSecondary">
                    {isCurrentMonth ? t('household.remainingToLiveThisMonth') : t('household.remainingToLive')}
                  </ThemedText>
                </View>
                <ThemedText rounded style={styles.hero}>{formatCents(remaining)}</ThemedText>
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
                    <EmptyState icon="receipt-outline" title={t('household.noExpenseYet')} />
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

        {/* Pill : Crédits */}
        {activeFilter === 'credits' && (
          <Reveal delay={70}>
            <CreditsView />
          </Reveal>
        )}

        {/* Pill : Charges (à venir) */}
        {activeFilter === 'charges' && (
          <Reveal delay={70}>
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                {t('credits.chargesSoon')}
              </ThemedText>
            </Card>
          </Reveal>
        )}
      </ScrollView>

      <AddFab expenseScope="shared" />
    </View>
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
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.separator, marginLeft: 56 }} />;
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
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  projection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
