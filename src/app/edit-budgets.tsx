import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CustomCategorySheet } from '@/components/CustomCategorySheet';
import { MoneyInput } from '@/components/MoneyInput';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { noBounce } from '@/constants/scroll';
import type { Scope } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';

export default function EditBudgetsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    members, categories, budgets, currentMonth, currentUserId,
    setIncome, setBudgetLimit, addCategory, deleteCategory,
  } = useBudgetStore();

  const [sheet, setSheet] = useState<null | Scope>(null);

  const me = members.find((m) => m.id === currentUserId);
  const shared = categories.filter((c) => c.scope === 'shared');
  const mine = categories.filter((c) => c.scope === 'personal' && c.ownerId === currentUserId);
  const limitOf = (catId: string) =>
    budgets.find((b) => b.categoryId === catId && b.month === currentMonth)?.limitCents ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={{ width: 60 }} />
        <ThemedText type="smallBold">{t('editBudgets.title')}</ThemedText>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ minWidth: 60, alignItems: 'flex-end' }}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>{t('common.done')}</ThemedText>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          {...noBounce}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Section title={t('editBudgets.myMonthlyIncome')}>
            <Card>
              <MoneyInput
                initialCents={me?.monthlyIncomeCents ?? 0}
                onChangeCents={(c) => me && setIncome(me.id, c)}
                placeholder="0"
              />
            </Card>
          </Section>

          <Section title={t('editBudgets.householdEnvelopes')}>
            <Card style={{ gap: 2 }}>
              {shared.length === 0 && <Empty />}
              {shared.map((c, i) => (
                <View key={c.id}>
                  {i > 0 && <Divider />}
                  <EnvelopeRow
                    icon={c.icon} color={c.color} name={c.name}
                    initialLimitCents={limitOf(c.id)}
                    onChangeLimit={(v) => setBudgetLimit(c.id, v)}
                    onDelete={() => deleteCategory(c.id)}
                  />
                </View>
              ))}
              <AddButton onPress={() => setSheet('shared')} />
            </Card>
          </Section>

          <Section title={t('editBudgets.myPersonalEnvelopes')}>
            <Card style={{ gap: 2 }}>
              {mine.length === 0 && <Empty />}
              {mine.map((c, i) => (
                <View key={c.id}>
                  {i > 0 && <Divider />}
                  <EnvelopeRow
                    icon={c.icon} color={c.color} name={c.name}
                    initialLimitCents={limitOf(c.id)}
                    onChangeLimit={(v) => setBudgetLimit(c.id, v)}
                    onDelete={() => deleteCategory(c.id)}
                  />
                </View>
              ))}
              <AddButton onPress={() => setSheet('personal')} />
            </Card>
          </Section>

          <View style={{ height: insets.bottom + Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomCategorySheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        onAdd={(d) => {
          if (!sheet) return;
          const c = addCategory({
            name: d.name, icon: d.icon, color: d.color, scope: sheet,
            ownerId: sheet === 'personal' ? currentUserId : undefined,
          });
          if (d.limitCents > 0) setBudgetLimit(c.id, d.limitCents);
        }}
      />
    </View>
  );
}

function EnvelopeRow({
  icon, color, name, initialLimitCents, onChangeLimit, onDelete,
}: {
  icon: string; color: string; name: string;
  initialLimitCents: number; onChangeLimit: (c: number) => void; onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <CategoryIcon icon={icon} color={color} size={40} />
      <ThemedText type="small" style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>{name}</ThemedText>
      <MoneyInput compact initialCents={initialLimitCents} onChangeCents={onChangeLimit} />
      <Pressable onPress={onDelete} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.add}>
      <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
      <ThemedText type="smallBold" style={{ color: theme.accent }}>{t('editBudgets.addEnvelope')}</ThemedText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={{ marginLeft: Spacing.xs, letterSpacing: 0.5 }}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Empty() {
  const { t } = useTranslation();
  return (
    <ThemedText type="small" themeColor="textSecondary" style={{ paddingVertical: Spacing.sm }}>
      {t('editBudgets.empty')}
    </ThemedText>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  add: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingTop: Spacing.lg },
});
