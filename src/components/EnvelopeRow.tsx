import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { ProgressBar } from '@/components/ProgressBar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Category } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { formatCents } from '@/utils/money';

type Props = {
  category: Category;
  spentCents: number;
  limitCents: number;
};

/** Une enveloppe budgétaire : icône, montants et jauge de progression. */
export function EnvelopeRow({ category, spentCents, limitCents }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const progress = limitCents > 0 ? spentCents / limitCents : 0;
  const remaining = limitCents - spentCents;
  const over = remaining < 0;

  return (
    <View style={styles.row}>
      <CategoryIcon icon={category.icon} color={category.color} />
      <View style={styles.body}>
        <View style={styles.line}>
          <ThemedText type="small" style={styles.name}>
            {category.name}
          </ThemedText>
          <ThemedText
            type="smallBold"
            style={{ color: over ? theme.danger : theme.text, fontVariant: ['tabular-nums'] }}>
            {over ? '-' : ''}
            {formatCents(Math.abs(remaining))}
          </ThemedText>
        </View>
        <ProgressBar progress={progress} color={category.color} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.sub}>
          {t('envelope.spentOfLimit', { spent: formatCents(spentCents), limit: formatCents(limitCents) })}
          {over ? t('envelope.over') : t('envelope.remaining')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  body: { flex: 1, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '600' },
  sub: { fontSize: 12 },
});
