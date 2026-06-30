import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/TransactionRow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { spentInCategory } from '@/domain/selectors';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { monthKey, monthLabel } from '@/utils/date';
import { formatCents } from '@/utils/money';

export default function CategoryDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { categories, budgets, transactions, members, selectedMonth } = useBudgetStore();

  const category = categories.find((c) => c.id === id);
  const spent = category ? spentInCategory(transactions, category.id, selectedMonth) : 0;
  const limit =
    budgets.find((b) => b.categoryId === id && b.month === selectedMonth)?.limitCents ?? 0;
  const remaining = limit - spent;
  const txs = transactions
    .filter((t) => t.categoryId === id && monthKey(t.date) === selectedMonth)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const memberName = (mid: string) => members.find((m) => m.id === mid)?.name ?? '?';

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {category?.name ?? t('category.envelope')}
        </ThemedText>
        <View style={styles.back} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        {category && (
          <Card style={{ gap: Spacing.md, alignItems: 'center' }}>
            <CategoryIcon icon={category.icon} color={category.color} size={56} />
            <ThemedText style={styles.hero}>{formatCents(Math.abs(remaining))}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {remaining < 0 ? t('category.over') : t('category.remaining')} · {monthLabel(selectedMonth)}
            </ThemedText>
            <ProgressBar
              progress={limit > 0 ? spent / limit : 0}
              color={category.color}
              height={10}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.tnum}>
              {t('category.spentOfLimit', { spent: formatCents(spent), limit: formatCents(limit) })}
            </ThemedText>
          </Card>
        )}

        <ThemedText
          type="smallBold"
          themeColor="textSecondary"
          style={{ marginLeft: Spacing.xs, letterSpacing: 0.5 }}>
          {t('category.transactionsCount', { count: txs.length })}
        </ThemedText>
        <Card>
          {txs.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('category.noExpenseThisMonth')}
            </ThemedText>
          ) : (
            txs.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 2 }} />}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: { fontSize: 40, fontWeight: '700', lineHeight: 46, fontVariant: ['tabular-nums'] },
  tnum: { fontVariant: ['tabular-nums'] },
});
