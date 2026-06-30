import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Category, Transaction } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { shortDate } from '@/utils/date';
import { formatCents } from '@/utils/money';

type Props = {
  tx: Transaction;
  category?: Category;
  /** Nom du payeur, affiché pour les dépenses du foyer. */
  payerName?: string;
  onLongPress?: () => void;
};

export function TransactionRow({ tx, category, payerName, onLongPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isIncome = tx.amountCents > 0;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <CategoryIcon
        icon={category?.icon ?? 'pricetag'}
        color={category?.color ?? theme.textSecondary}
        size={44}
      />
      <View style={styles.body}>
        <ThemedText type="small" style={styles.label} numberOfLines={1}>
          {tx.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
          {shortDate(tx.date)}
          {tx.scope === 'shared' && payerName ? ` · ${t('transaction.paidByName', { name: payerName })}` : ''}
        </ThemedText>
      </View>
      <ThemedText
        type="smallBold"
        style={{ color: isIncome ? theme.success : theme.text, fontVariant: ['tabular-nums'] }}>
        {isIncome ? '+' : ''}
        {formatCents(tx.amountCents)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  body: { flex: 1, gap: 2 },
  label: { fontWeight: '600' },
  sub: { fontSize: 12 },
});
