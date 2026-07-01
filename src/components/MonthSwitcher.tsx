import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glass } from '@/components/Glass';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePremium } from '@/providers/PremiumProvider';
import { useBudgetStore } from '@/store/useBudgetStore';
import { monthLabel } from '@/utils/date';

/**
 * Sélecteur de mois ‹ Juin 2026 › — ne dépasse pas le mois courant.
 * `inline` : version compacte, alignée à gauche et sans pilule (pour le hero).
 */
export function MonthSwitcher({ inline }: { inline?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const currentMonth = useBudgetStore((s) => s.currentMonth);
  const shiftMonth = useBudgetStore((s) => s.shiftMonth);
  const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth);
  const { isPremium } = usePremium();

  const atCurrent = selectedMonth >= currentMonth;

  // Les mois passés (historique) sont réservés au Premium.
  const goBack = () => (isPremium ? shiftMonth(-1) : router.push('/paywall'));

  const ripple = { color: theme.accentSoft, borderless: true };

  const content = (
    <>
      <Pressable onPress={goBack} hitSlop={8} android_ripple={ripple} style={styles.btn}>
        <Ionicons name={isPremium ? 'chevron-back' : 'lock-closed'} size={isPremium ? 18 : 15} color={theme.text} />
      </Pressable>
      <Pressable
        onPress={() => !atCurrent && setSelectedMonth(currentMonth)}
        disabled={atCurrent}
        android_ripple={ripple}
        style={[styles.label, inline ? styles.labelInline : styles.labelFull]}>
        <ThemedText type="smallBold">{monthLabel(selectedMonth)}</ThemedText>
        {!atCurrent && (
          <ThemedText type="small" style={{ color: theme.accent, fontSize: 11 }}>
            {t('monthSwitcher.backToToday')}
          </ThemedText>
        )}
      </Pressable>
      <Pressable
        onPress={() => shiftMonth(1)}
        disabled={atCurrent}
        hitSlop={8}
        android_ripple={ripple}
        style={[styles.btn, atCurrent && { opacity: 0.3 }]}>
        <Ionicons name="chevron-forward" size={18} color={theme.text} />
      </Pressable>
    </>
  );

  if (inline) {
    return <View style={styles.inlineRow}>{content}</View>;
  }

  return (
    <Glass glassEffectStyle="regular" fallbackColor={theme.backgroundElement} style={styles.row}>
      {content}
    </Glass>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    alignSelf: 'center',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: -Spacing.sm,
  },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  label: { alignItems: 'center' },
  labelFull: { paddingHorizontal: Spacing.md, minWidth: 140 },
  labelInline: { paddingHorizontal: 2, alignItems: 'flex-start' },
});
