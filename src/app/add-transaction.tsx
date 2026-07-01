import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/CategoryIcon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { noBounce } from '@/constants/scroll';
import type { Scope, SplitRule } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';
import { parseAmountToCents } from '@/utils/money';

type SplitKind = 'fiftyFifty' | 'proRataIncome' | 'fullyOwned';

export default function AddTransactionScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scope?: string }>();

  const { members, categories, accounts, currentUserId, addTransaction } =
    useBudgetStore();

  const [scope, setScope] = useState<Scope>(
    params.scope === 'personal' ? 'personal' : 'shared',
  );
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [payerId, setPayerId] = useState(currentUserId);
  const [splitKind, setSplitKind] = useState<SplitKind>('fiftyFifty');

  const visibleCategories = useMemo(
    () =>
      categories.filter((c) =>
        scope === 'shared'
          ? c.scope === 'shared'
          : c.scope === 'personal' && c.ownerId === currentUserId,
      ),
    [categories, scope, currentUserId],
  );

  const [categoryId, setCategoryId] = useState<string | undefined>(
    visibleCategories[0]?.id,
  );

  // Recale la catégorie sélectionnée si on change de scope.
  const activeCategoryId =
    visibleCategories.find((c) => c.id === categoryId)?.id ??
    visibleCategories[0]?.id;

  const cents = parseAmountToCents(amount);
  const canSave = cents > 0 && !!activeCategoryId;

  const onScopeChange = (next: Scope) => {
    setScope(next);
    const first = categories.find((c) =>
      next === 'shared'
        ? c.scope === 'shared'
        : c.scope === 'personal' && c.ownerId === currentUserId,
    );
    setCategoryId(first?.id);
  };

  const buildSplitRule = (): SplitRule => {
    switch (splitKind) {
      case 'proRataIncome':
        return { kind: 'proRataIncome' };
      case 'fullyOwned':
        return { kind: 'fullyOwned', memberId: payerId };
      default:
        return { kind: 'fiftyFifty' };
    }
  };

  const onSave = () => {
    if (!canSave || !activeCategoryId) return;
    const account = accounts.find((a) =>
      scope === 'shared'
        ? a.scope === 'shared'
        : a.scope === 'personal' && a.ownerId === currentUserId,
    );
    addTransaction({
      amountCents: -Math.abs(cents),
      label,
      scope,
      ownerId: scope === 'shared' ? payerId : currentUserId,
      categoryId: activeCategoryId,
      accountId: account?.id,
      splitRule: scope === 'shared' ? buildSplitRule() : undefined,
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const memberOptions = members.map((m) => ({ value: m.id, label: m.name }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* En-tête modale */}
      <View style={[styles.modalHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('common.cancel')}
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{t('transaction.newExpense')}</ThemedText>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          {...noBounce}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Montant */}
          <View style={styles.amountBlock}>
            <View style={styles.amountRow}>
              <ThemedText style={[styles.minus, { color: theme.textSecondary }]}>−</ThemedText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                autoFocus
                style={[styles.amountInput, { color: theme.text }]}
              />
              <ThemedText style={[styles.euro, { color: theme.text }]}>€</ThemedText>
            </View>
          </View>

          {/* Scope */}
          <SegmentedControl
            options={[
              { value: 'shared', label: t('transactions.filterHousehold') },
              { value: 'personal', label: t('transactions.filterMine') },
            ]}
            value={scope}
            onChange={(v) => onScopeChange(v as Scope)}
          />

          {/* Libellé */}
          <View style={[styles.field, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={t('transaction.labelPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.fieldInput, { color: theme.text }]}
            />
          </View>

          {/* Catégories */}
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            {t('transaction.category')}
          </ThemedText>
          <View style={styles.catGrid}>
            {visibleCategories.map((cat) => {
              const selected = cat.id === activeCategoryId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setCategoryId(cat.id);
                  }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: selected ? cat.color + '22' : theme.card,
                      borderColor: selected ? cat.color : theme.border,
                    },
                  ]}>
                  <CategoryIcon icon={cat.icon} color={cat.color} size={34} />
                  <ThemedText type="small" style={{ fontSize: 12 }} numberOfLines={1}>
                    {cat.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Options de partage (foyer uniquement) */}
          {scope === 'shared' && (
            <View style={{ gap: Spacing.sm }}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
                {t('transaction.paidBy')}
              </ThemedText>
              <SegmentedControl options={memberOptions} value={payerId} onChange={setPayerId} />

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
                {t('transaction.split')}
              </ThemedText>
              <SegmentedControl
                options={[
                  { value: 'fiftyFifty', label: t('transaction.split5050') },
                  { value: 'proRataIncome', label: t('transaction.splitProrata') },
                  { value: 'fullyOwned', label: t('transaction.split100') },
                ]}
                value={splitKind}
                onChange={(v) => setSplitKind(v as SplitKind)}
              />
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                {splitKind === 'fiftyFifty' && t('transaction.splitDesc5050')}
                {splitKind === 'proRataIncome' && t('transaction.splitDescProrata')}
                {splitKind === 'fullyOwned' &&
                  t('transaction.splitDesc100', { name: members.find((m) => m.id === payerId)?.name })}
              </ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Bouton enregistrer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, borderColor: theme.border, backgroundColor: theme.background }]}>
          <Pressable
            disabled={!canSave}
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: canSave ? theme.accent : theme.backgroundElement,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: canSave ? theme.onAccent : theme.textSecondary, fontSize: 16 }}>
              {t('transaction.save')}
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  amountBlock: { alignItems: 'center', paddingVertical: Spacing.lg },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  minus: { fontSize: 44, lineHeight: 60, fontWeight: '300', marginRight: 4 },
  amountInput: { fontSize: 60, fontWeight: '700', minWidth: 60, textAlign: 'center', padding: 0 },
  euro: { fontSize: 44, lineHeight: 60, fontWeight: '600', marginLeft: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  fieldInput: { flex: 1, fontSize: 16 },
  label: { marginLeft: Spacing.xs, letterSpacing: 0.5 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catChip: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
