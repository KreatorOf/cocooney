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
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Scope, Subscription } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useBudgetStore } from '@/store/useBudgetStore';

export type SubscriptionDraft = {
  name: string;
  amountCents: number;
  scope: Scope;
  categoryId?: string;
  icon: string;
  color: string;
  dayOfMonth: number;
};

type Props = {
  visible: boolean;
  editing: Subscription | null;
  onClose: () => void;
  onSave: (draft: SubscriptionDraft) => void;
  onDelete?: (id: string) => void;
};

export function SubscriptionSheet({ visible, editing, onClose, onSave, onDelete }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { categories, currentUserId } = useBudgetStore();

  const [name, setName] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [scope, setScope] = useState<Scope>('shared');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [day, setDay] = useState('1');

  // (Ré)initialise à l'ouverture.
  useEffect(() => {
    if (!visible) return;
    setName(editing?.name ?? '');
    setAmountCents(editing?.amountCents ?? 0);
    setScope(editing?.scope ?? 'shared');
    setCategoryId(editing?.categoryId);
    setDay(String(editing?.dayOfMonth ?? 1));
  }, [visible, editing]);

  const visibleCategories = categories.filter((c) =>
    scope === 'shared' ? c.scope === 'shared' : c.scope === 'personal' && c.ownerId === currentUserId,
  );
  const category = visibleCategories.find((c) => c.id === categoryId);
  const dayNum = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
  const canSave = amountCents > 0 && name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      name,
      amountCents,
      scope,
      categoryId,
      icon: category?.icon ?? 'repeat',
      color: category?.color ?? theme.accent,
      dayOfMonth: dayNum,
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
              <ThemedText type="smallBold">{editing ? t('subscriptionSheet.edit') : t('subscriptionSheet.new')}</ThemedText>
              <Pressable onPress={save} hitSlop={12} disabled={!canSave}>
                <ThemedText type="smallBold" style={{ color: canSave ? theme.accent : theme.textSecondary }}>
                  {t('common.save')}
                </ThemedText>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ gap: Spacing.lg, paddingVertical: Spacing.md }}
              keyboardShouldPersistTaps="handled">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('subscriptionSheet.namePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />

              <View style={styles.line}>
                <View style={{ flex: 1, gap: Spacing.sm }}>
                  <Label>{t('subscriptionSheet.amountPerMonth')}</Label>
                  <MoneyInput initialCents={amountCents} onChangeCents={setAmountCents} />
                </View>
                <View style={{ width: 110, gap: Spacing.sm }}>
                  <Label>{t('subscriptionSheet.day')}</Label>
                  <TextInput
                    value={day}
                    onChangeText={setDay}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.input, styles.day, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  />
                </View>
              </View>

              <SegmentedControl
                options={[{ value: 'shared', label: t('subscriptionSheet.scopeHousehold') }, { value: 'personal', label: t('subscriptionSheet.scopeMe') }]}
                value={scope}
                onChange={(v) => { setScope(v as Scope); setCategoryId(undefined); }}
              />

              <View style={{ gap: Spacing.sm }}>
                <Label>{t('subscriptionSheet.category')}</Label>
                <View style={styles.cats}>
                  {visibleCategories.map((c) => {
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
                  {visibleCategories.length === 0 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('subscriptionSheet.createEnvelopeFirst')}
                    </ThemedText>
                  )}
                </View>
              </View>

              {editing && onDelete && (
                <Pressable
                  onPress={() => { onDelete(editing.id); onClose(); }}
                  style={[styles.delete, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>{t('subscriptionSheet.delete')}</ThemedText>
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
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  input: { height: 52, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: 16 },
  day: { textAlign: 'center', fontWeight: '700', fontSize: 18 },
  line: { flexDirection: 'row', gap: Spacing.md },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { width: '31%', alignItems: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5 },
  delete: { height: 50, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
