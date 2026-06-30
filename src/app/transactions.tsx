import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/TransactionRow';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { monthKey, monthLabel } from '@/utils/date';

type Filter = 'all' | 'shared' | 'mine';

export default function TransactionsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { transactions, categories, members, selectedMonth, currentUserId } = useBudgetStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const memberName = (mid: string) => members.find((m) => m.id === mid)?.name ?? '?';

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => monthKey(t.date) === selectedMonth)
      .filter((t) =>
        filter === 'all' ? true : filter === 'shared' ? t.scope === 'shared' : t.ownerId === currentUserId && t.scope === 'personal',
      )
      .filter((t) => (q ? t.label.toLowerCase().includes(q) : true))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [transactions, selectedMonth, filter, query, currentUserId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" style={{ flex: 1, textAlign: 'center' }}>
          {t('transactions.titleWithMonth', { month: monthLabel(selectedMonth) })}
        </ThemedText>
        <View style={styles.back} />
      </View>

      <View style={styles.controls}>
        <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('transactions.searchPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
        <SegmentedControl
          options={[
            { value: 'all', label: t('transactions.filterAll') },
            { value: 'shared', label: t('transactions.filterHousehold') },
            { value: 'mine', label: t('transactions.filterMine') },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Card>
          {list.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t('transactions.noTransaction')}
            </ThemedText>
          ) : (
            list.map((tx, i) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              return (
                <View key={tx.id}>
                  {i > 0 && <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 2 }} />}
                  <TransactionRow
                    tx={tx}
                    category={cat}
                    payerName={tx.scope === 'shared' ? memberName(tx.ownerId) : undefined}
                    onLongPress={() => useBudgetStore.getState().deleteTransaction(tx.id)}
                  />
                </View>
              );
            })
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
  controls: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16 },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
