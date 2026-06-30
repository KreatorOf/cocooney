import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BOTTOM_BAR_SPACE, BottomBar } from '@/components/BottomBar';
import { Card } from '@/components/Card';
import { EnvelopeRow } from '@/components/EnvelopeRow';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/TransactionRow';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  personalShareOfShared,
  spentForScope,
  spentInCategory,
} from '@/domain/selectors';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { monthKey } from '@/utils/date';
import { formatCents } from '@/utils/money';

function Reveal({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(delay).springify().damping(18)}>
      {children}
    </Animated.View>
  );
}

export default function PersonalScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { members, categories, budgets, transactions, currentMonth, selectedMonth, currentUserId } =
    useBudgetStore();

  const myCategories = categories.filter(
    (c) => c.scope === 'personal' && c.ownerId === currentUserId,
  );
  const me = members.find((m) => m.id === currentUserId);
  const income = me?.monthlyIncomeCents ?? 0;
  const persoSpent = spentForScope(transactions, categories, 'personal', selectedMonth, currentUserId);
  const shareOfShared = personalShareOfShared(currentUserId, transactions, members, selectedMonth);
  const totalSpent = persoSpent + shareOfShared;
  const savings = income - totalSpent;
  const rate = income > 0 ? Math.round((savings / income) * 100) : null;

  const myTx = transactions
    .filter((t) => t.scope === 'personal' && t.ownerId === currentUserId && monthKey(t.date) === selectedMonth)
    .slice(0, 8);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: BOTTOM_BAR_SPACE },
        ]}
        showsVerticalScrollIndicator={false}>
        <Reveal delay={0}>
          <ScreenHeader
            title={t('personal.title')}
            right={
              <View style={[styles.privacy, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="lock-closed" size={13} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                  {t('common.private')}
                </ThemedText>
              </View>
            }
          />
        </Reveal>

        <Reveal delay={40}>
          <MonthSwitcher />
        </Reveal>

        {/* Carte santé : revenu → dépenses → épargne */}
        <Reveal delay={70}>
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.healthHeader}>
              <ThemedText type="small" themeColor="textSecondary">
                {income > 0 ? t('personal.savingsOfMonth') : t('personal.expensesOfMonth')}
              </ThemedText>
              {rate !== null && (
                <View style={[styles.ratePill, { backgroundColor: savings >= 0 ? theme.accentSoft : theme.backgroundElement }]}>
                  <ThemedText type="small" style={{ color: savings >= 0 ? theme.accent : theme.danger, fontSize: 12, fontWeight: '700' }}>
                    {rate}%
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={[styles.hero, { color: savings >= 0 ? theme.text : theme.danger }]}>
              {income > 0 ? formatCents(savings) : formatCents(totalSpent)}
            </ThemedText>
            {income > 0 && <ProgressBar progress={totalSpent / income} height={8} />}
            <View style={[styles.breakdown, { borderTopColor: theme.border }]}>
              <Stat label={t('personal.income')} value={formatCents(income)} />
              <Stat label={t('personal.expenses')} value={formatCents(totalSpent)} />
              <Stat label={t('personal.ofWhichHousehold')} value={formatCents(shareOfShared)} />
            </View>
            {income === 0 && (
              <Pressable onPress={() => router.push('/edit-budgets')}>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  {t('personal.addIncomePrompt')}
                </ThemedText>
              </Pressable>
            )}
          </Card>
        </Reveal>

        <Reveal delay={130}>
          <View style={{ gap: Spacing.md }}>
            <SectionTitle>{t('personal.myEnvelopes')}</SectionTitle>
            <Card>
              {myCategories.length === 0 ? (
                <Pressable onPress={() => router.push('/edit-budgets')}>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    {t('personal.addPersonalEnvelope')}
                  </ThemedText>
                </Pressable>
              ) : (
                myCategories.map((cat, i) => {
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
                })
              )}
            </Card>
          </View>
        </Reveal>

        <Reveal delay={190}>
          <View style={{ gap: Spacing.md }}>
            <View style={styles.sectionRow}>
              <SectionTitle>{t('personal.myExpenses')}</SectionTitle>
              <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {t('common.seeAll')}
                </ThemedText>
              </Pressable>
            </View>
            <Card>
              {myTx.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('personal.noPersonalExpense')}
                </ThemedText>
              ) : (
                myTx.map((tx, i) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  return (
                    <View key={tx.id}>
                      {i > 0 && <Divider />}
                      <TransactionRow
                        tx={tx}
                        category={cat}
                        onLongPress={() => useBudgetStore.getState().deleteTransaction(tx.id)}
                      />
                    </View>
                  );
                })
              )}
            </Card>
          </View>
        </Reveal>
      </ScrollView>

      <BottomBar
        label={t('transaction.addExpense')}
        onPress={() => router.push('/add-transaction?scope=personal')}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </ThemedText>
    </View>
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
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  hero: { fontSize: 40, fontWeight: '700', lineHeight: 46, fontVariant: ['tabular-nums'] },
  tnum: { fontVariant: ['tabular-nums'] },
  healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  breakdown: { flexDirection: 'row', gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
