import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Glass } from '@/components/Glass';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePremium } from '@/providers/PremiumProvider';
import { useBudgetStore } from '@/store/useBudgetStore';
import { monthLabel } from '@/utils/date';

/** Sélecteur de mois ‹ Juin 2026 › — ne dépasse pas le mois courant. */
export function MonthSwitcher() {
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

  return (
    <Glass
      glassEffectStyle="regular"
      fallbackColor={theme.backgroundElement}
      style={styles.row}>
      <Pressable onPress={goBack} hitSlop={8} android_ripple={ripple} style={styles.btn}>
        <Ionicons name={isPremium ? 'chevron-back' : 'lock-closed'} size={isPremium ? 18 : 15} color={theme.text} />
      </Pressable>
      <Pressable
        onPress={() => !atCurrent && setSelectedMonth(currentMonth)}
        disabled={atCurrent}
        android_ripple={ripple}
        style={styles.label}>
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
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  label: { alignItems: 'center', paddingHorizontal: Spacing.md, minWidth: 140 },
});
