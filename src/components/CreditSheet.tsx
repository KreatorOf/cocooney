import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { MoneyInput } from '@/components/MoneyInput';
import { ThemedText } from '@/components/themed-text';
import { noBounce } from '@/constants/scroll';
import { Radius, Spacing } from '@/constants/theme';
import type { Credit } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import type { NewCreditInput } from '@/store/useBudgetStore';
import { addMonths, monthKey, monthLabel } from '@/utils/date';
import { formatCents } from '@/utils/money';

type Props = {
  visible: boolean;
  editing: Credit | null;
  onClose: () => void;
  onSave: (draft: NewCreditInput) => void;
  onDelete?: (id: string) => void;
};

/** Dernier jour du mois (clé 'YYYY-MM') au format ISO 'YYYY-MM-DD'. */
function monthEndISO(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

export function CreditSheet({ visible, editing, onClose, onSave, onDelete }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { categories, currentMonth } = useBudgetStore();

  const [name, setName] = useState('');
  const [totalCents, setTotalCents] = useState(0);
  const [paidCents, setPaidCents] = useState(0);
  const [monthlyCents, setMonthlyCents] = useState(0);
  const [day, setDay] = useState('1');
  const [endMonth, setEndMonth] = useState(() => addMonths(currentMonth, 12));
  const [categoryId, setCategoryId] = useState<string | undefined>();

  // (Ré)initialise à l'ouverture.
  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setTotalCents(editing?.totalAmountCents ?? 0);
    setPaidCents(editing?.paidAmountCents ?? 0);
    setMonthlyCents(editing?.monthlyPaymentCents ?? 0);
    setDay(String(editing?.dayOfMonth ?? 1));
    setEndMonth(editing ? monthKey(editing.endDate) : addMonths(currentMonth, 12));
    setCategoryId(editing?.categoryId);
  }, [visible, editing, currentMonth]);

  const sharedCategories = categories.filter((c) => c.scope === 'shared');
  const category = sharedCategories.find((c) => c.id === categoryId);
  const dayNum = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
  const remaining = Math.max(0, totalCents - paidCents);
  const canSave = totalCents > 0 && monthlyCents > 0 && name.trim().length > 0;
  const atCurrent = endMonth <= currentMonth;

  const save = () => {
    if (!canSave) return;
    onSave({
      name,
      totalAmountCents: totalCents,
      paidAmountCents: paidCents,
      monthlyPaymentCents: monthlyCents,
      dayOfMonth: dayNum,
      endDate: monthEndISO(endMonth),
      icon: category?.icon ?? 'card',
      color: category?.color ?? theme.accent,
      categoryId,
      scope: 'shared',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.lg },
            ]}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" themeColor="textSecondary">{t('common.cancel')}</ThemedText>
              </Pressable>
              <ThemedText type="smallBold">
                {editing ? t('credits.sheet.edit') : t('credits.sheet.new')}
              </ThemedText>
              <Pressable onPress={save} hitSlop={12} disabled={!canSave}>
                <ThemedText type="smallBold" style={{ color: canSave ? theme.accent : theme.textSecondary }}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>

            <ScrollView
              {...noBounce}
              contentContainerStyle={{ gap: Spacing.lg, paddingVertical: Spacing.md }}
              keyboardShouldPersistTaps="handled">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('credits.sheet.namePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />

              <View style={styles.line}>
                <View style={{ flex: 1, gap: Spacing.sm }}>
                  <Label>{t('credits.sheet.total')}</Label>
                  <MoneyInput initialCents={totalCents} onChangeCents={setTotalCents} />
                </View>
                <View style={{ flex: 1, gap: Spacing.sm }}>
                  <Label>{t('credits.sheet.paid')}</Label>
                  <MoneyInput initialCents={paidCents} onChangeCents={setPaidCents} />
                </View>
              </View>

              {/* Restant calculé */}
              <View style={[styles.remaining, { backgroundColor: theme.accentSoft }]}>
                <ThemedText type="small" themeColor="textSecondary">{t('credits.sheet.remaining')}</ThemedText>
                <ThemedText type="smallBold" style={{ color: theme.accent, fontVariant: ['tabular-nums'] }}>
                  {formatCents(remaining)}
                </ThemedText>
              </View>

              <View style={styles.line}>
                <View style={{ flex: 1, gap: Spacing.sm }}>
                  <Label>{t('credits.sheet.monthly')}</Label>
                  <MoneyInput initialCents={monthlyCents} onChangeCents={setMonthlyCents} />
                </View>
                <View style={{ width: 90, gap: Spacing.sm }}>
                  <Label>{t('credits.sheet.day')}</Label>
                  <TextInput
                    value={day}
                    onChangeText={setDay}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.input, styles.day, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  />
                </View>
              </View>

              {/* Échéance : sélecteur mois/année */}
              <View style={{ gap: Spacing.sm }}>
                <Label>{t('credits.sheet.endDate')}</Label>
                <View style={[styles.stepper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Pressable
                    onPress={() => !atCurrent && setEndMonth(addMonths(endMonth, -1))}
                    disabled={atCurrent}
                    hitSlop={8}
                    style={[styles.stepBtn, atCurrent && { opacity: 0.3 }]}>
                    <Ionicons name="chevron-back" size={20} color={theme.text} />
                  </Pressable>
                  <ThemedText type="smallBold">{monthLabel(endMonth)}</ThemedText>
                  <Pressable onPress={() => setEndMonth(addMonths(endMonth, 1))} hitSlop={8} style={styles.stepBtn}>
                    <Ionicons name="chevron-forward" size={20} color={theme.text} />
                  </Pressable>
                </View>
              </View>

              {/* Catégorie (donne icône + couleur, rattache la dépense au « Payer ») */}
              <View style={{ gap: Spacing.sm }}>
                <Label>{t('credits.sheet.category')}</Label>
                <View style={styles.cats}>
                  {sharedCategories.map((c) => {
                    const selected = c.id === categoryId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setCategoryId(selected ? undefined : c.id)}
                        style={[styles.chip, { borderColor: selected ? c.color : theme.border, backgroundColor: selected ? c.color + '22' : theme.card }]}>
                        <CategoryIcon icon={c.icon} color={c.color} size={28} />
                        <ThemedText type="small" style={{ fontSize: 12 }} numberOfLines={1}>{c.name}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {editing && onDelete && (
                <Pressable
                  onPress={() => { onDelete(editing.id); onClose(); }}
                  style={[styles.delete, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>{t('credits.sheet.delete')}</ThemedText>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={{ letterSpacing: 0.5 }}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: '92%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  input: { height: 52, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: 16 },
  day: { textAlign: 'center', fontWeight: '700', fontSize: 18 },
  line: { flexDirection: 'row', gap: Spacing.md },
  remaining: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 52,
    paddingHorizontal: Spacing.sm,
  },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { width: '31%', alignItems: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5 },
  delete: { height: 50, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
