import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CreditSheet } from '@/components/CreditSheet';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { SectionTitle } from '@/components/SectionTitle';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  creditInterestCents,
  creditProgress,
  creditRemaining,
  creditRepaidPct,
  creditsMonthlyTotal,
  creditsRemainingTotal,
  isCreditDone,
} from '@/domain/selectors';
import type { Credit } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { nextOccurrence, relativeDay } from '@/utils/date';
import { formatCents } from '@/utils/money';

/** Écran de la pill « Crédits » : synthèse + liste + ajout/édition. */
export function CreditsView() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { credits, addCredit, updateCredit, deleteCredit, payCreditInstallment } = useBudgetStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Credit | null>(null);

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (c: Credit) => { setEditing(c); setSheetOpen(true); };

  const pay = (c: Credit) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    payCreditInstallment(c.id);
  };

  return (
    <View style={{ gap: Spacing.md }}>
      {/* Synthèse */}
      <Card style={styles.summary}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText type="small" themeColor="textSecondary">{t('credits.remainingTotal')}</ThemedText>
          <ThemedText rounded style={styles.hero}>{formatCents(creditsRemainingTotal(credits))}</ThemedText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <ThemedText type="small" themeColor="textSecondary">{t('credits.monthlyTotal')}</ThemedText>
          <ThemedText type="smallBold" style={styles.tnum}>{formatCents(creditsMonthlyTotal(credits))}</ThemedText>
        </View>
      </Card>

      <SectionTitle>{t('credits.title')}</SectionTitle>
      <Card>
        {credits.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title={t('credits.empty')}
            actionLabel={t('credits.add')}
            onAction={openAdd}
          />
        ) : (
          <>
            {credits.map((c, i) => (
              <View key={c.id}>
                {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.separator, marginVertical: Spacing.md }} />}
                <CreditRow credit={c} onEdit={() => openEdit(c)} onPay={() => pay(c)} />
              </View>
            ))}
            <Pressable onPress={openAdd} accessibilityRole="button" style={styles.add}>
              <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
              <ThemedText type="smallBold" style={{ color: theme.accent }}>{t('credits.add')}</ThemedText>
            </Pressable>
          </>
        )}
      </Card>

      <CreditSheet
        visible={sheetOpen}
        editing={editing}
        onClose={() => setSheetOpen(false)}
        onSave={(d) => {
          if (editing) updateCredit({ ...editing, ...d, id: editing.id, active: editing.active });
          else addCredit(d);
        }}
        onDelete={deleteCredit}
      />
    </View>
  );
}

function CreditRow({ credit, onEdit, onPay }: { credit: Credit; onEdit: () => void; onPay: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const remaining = creditRemaining(credit);
  const interest = creditInterestCents(credit);
  const repaid = creditRepaidPct(credit);
  const done = isCreditDone(credit);
  const nextDate = nextOccurrence(credit.dayOfMonth);

  // Le badge bascule entre % remboursé et % restant au tap.
  const [showRemaining, setShowRemaining] = useState(false);
  const togglePct = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setShowRemaining((v) => !v);
  };

  return (
    <View style={{ gap: Spacing.sm }}>
      <Pressable onPress={onEdit} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        <CategoryIcon icon={credit.icon} color={credit.color} size={42} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.line}>
            <ThemedText type="small" style={{ fontWeight: '600' }} numberOfLines={1}>{credit.name}</ThemedText>
            <ThemedText type="smallBold" style={styles.tnum}>{formatCents(remaining)}</ThemedText>
          </View>
          <ProgressBar progress={creditProgress(credit)} color={credit.color} height={6} />
          <View style={styles.line}>
            <View style={styles.footerLeft}>
              <Pressable
                onPress={togglePct}
                hitSlop={6}
                style={[styles.pctPill, { backgroundColor: credit.color + '22' }]}>
                <ThemedText type="small" style={{ color: credit.color, fontWeight: '700', fontSize: 12 }}>
                  {showRemaining
                    ? t('credits.remainingPct', { pct: 100 - repaid })
                    : t('credits.repaid', { pct: repaid })}
                </ThemedText>
              </Pressable>
              {interest > 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                  {t('credits.interestExtra', { amount: formatCents(interest) })}
                </ThemedText>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
              {done ? t('credits.done') : t('credits.nextDue', { when: relativeDay(nextDate) })}
            </ThemedText>
          </View>
        </View>
      </Pressable>

      {done ? (
        <View style={[styles.doneBadge, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.success} />
          <ThemedText type="small" style={{ color: theme.success, fontWeight: '700' }}>{t('credits.done')}</ThemedText>
        </View>
      ) : (
        <Pressable
          onPress={onPay}
          android_ripple={{ color: theme.accent + '22' }}
          style={({ pressed }) => [styles.payBtn, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="arrow-up-circle" size={16} color={theme.accent} />
          <ThemedText type="small" style={{ color: theme.accent, fontWeight: '700' }}>
            {t('credits.payInstallment')} · {formatCents(credit.monthlyPaymentCents)}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  hero: { fontSize: 30, fontWeight: '700', lineHeight: 36, fontVariant: ['tabular-nums'] },
  tnum: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 1 },
  pctPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  add: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingTop: Spacing.lg },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 40,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 36,
    borderRadius: Radius.pill,
  },
});
