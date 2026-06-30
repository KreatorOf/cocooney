import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { CustomCategorySheet, type CustomCategoryDraft } from '@/components/CustomCategorySheet';
import { EnvelopeEditorRow } from '@/components/EnvelopeEditorRow';
import { EmojiPicker } from '@/components/EmojiPicker';
import { MoneyInput } from '@/components/MoneyInput';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';
import { useBudgetStore } from '@/store/useBudgetStore';

type Draft = {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
  limitCents: number;
  custom?: boolean;
};

type Suggestion = { key: string; icon: string; color: string };

const SHARED_SUGGESTIONS: Suggestion[] = [
  { key: 'loyer', icon: 'home', color: '#6457F9' },
  { key: 'courses', icon: 'cart', color: '#1FA463' },
  { key: 'energie', icon: 'flash', color: '#EAB308' },
  { key: 'transport', icon: 'car', color: '#0EA5E9' },
  { key: 'abonnements', icon: 'tv', color: '#EC4899' },
  { key: 'sorties', icon: 'wine', color: '#FF7A45' },
];
const PERSONAL_SUGGESTIONS: Suggestion[] = [
  { key: 'shopping', icon: 'bag-handle', color: '#FF7A45' },
  { key: 'restau', icon: 'restaurant', color: '#1FA463' },
  { key: 'sante', icon: 'fitness', color: '#14B8A6' },
  { key: 'loisirs', icon: 'game-controller', color: '#8B5CF6' },
];

let draftSeq = 0;
const toDrafts = (suggestions: Suggestion[], tr: (k: string) => string): Draft[] =>
  suggestions.map((s) => ({
    id: `s-${draftSeq++}`,
    name: tr(`onboarding.suggestions.${s.key}`),
    icon: s.icon,
    color: s.color,
    enabled: false,
    limitCents: 0,
  }));

const STEPS = ['profil', 'foyer', 'perso'] as const;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { session, profile, completeOnboarding } = useAuth();
  const { categories, addCategory, setBudgetLimit } = useBudgetStore();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(profile?.display_name && profile.display_name !== 'Moi' ? profile.display_name : '');
  const [emoji, setEmoji] = useState(profile?.emoji ?? '🙂');
  const [incomeCents, setIncomeCents] = useState(profile?.monthly_income_cents ?? 0);

  const [foyerDrafts, setFoyerDrafts] = useState<Draft[]>(() => toDrafts(SHARED_SUGGESTIONS, t));
  const [persoDrafts, setPersoDrafts] = useState<Draft[]>(() => toDrafts(PERSONAL_SUGGESTIONS, t));
  const [sheet, setSheet] = useState<null | 'foyer' | 'perso'>(null);

  const hasSharedAlready = categories.some((c) => c.scope === 'shared');

  const updateDraft = (
    setter: React.Dispatch<React.SetStateAction<Draft[]>>,
    id: string,
    patch: Partial<Draft>,
  ) => setter((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addCustom = (target: 'foyer' | 'perso', draft: CustomCategoryDraft) => {
    const d: Draft = { ...draft, id: `c-${draftSeq++}`, enabled: true, custom: true };
    (target === 'foyer' ? setFoyerDrafts : setPersoDrafts)((ds) => [...ds, d]);
  };

  const removeDraft = (
    setter: React.Dispatch<React.SetStateAction<Draft[]>>,
    id: string,
  ) => setter((ds) => ds.filter((d) => d.id !== id));

  const finish = async () => {
    if (!supabase || !session) return;
    try {
      setBusy(true);
      await supabase
        .from('profiles')
        .update({
          display_name: name.trim() || t('onboarding.defaultName'),
          emoji,
          monthly_income_cents: incomeCents || null,
        })
        .eq('id', session.user.id);

      const existingShared = new Set(
        categories.filter((c) => c.scope === 'shared').map((c) => c.name.toLowerCase()),
      );
      for (const d of foyerDrafts) {
        if (!d.enabled || existingShared.has(d.name.toLowerCase())) continue;
        const c = addCategory({ name: d.name, icon: d.icon, color: d.color, scope: 'shared' });
        if (d.limitCents > 0) setBudgetLimit(c.id, d.limitCents);
      }
      for (const d of persoDrafts) {
        if (!d.enabled) continue;
        const c = addCategory({
          name: d.name, icon: d.icon, color: d.color, scope: 'personal', ownerId: session.user.id,
        });
        if (d.limitCents > 0) setBudgetLimit(c.id, d.limitCents);
      }
      await completeOnboarding();
    } catch (e: any) {
      Alert.alert(t('common.oops'), e?.message ?? t('common.errorOccurred'));
      setBusy(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void finish();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const current = STEPS[step];
  const primaryLabel = step === STEPS.length - 1 ? t('common.finish') : t('common.next');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ paddingTop: insets.top + Spacing.md, paddingHorizontal: Spacing.lg }}>
        {/* Barre de progression */}
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressSeg,
                { backgroundColor: i <= step ? theme.accent : theme.track },
              ]}
            />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={insets.top + 40}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View key={current} entering={FadeIn.duration(250)} style={{ gap: Spacing.lg }}>
            {current === 'profil' && (
              <>
                <Header
                  emoji="👋"
                  title={t('onboarding.welcome')}
                  subtitle={t('onboarding.profileSubtitle')}
                />
                <Card style={{ gap: Spacing.lg }}>
                  <View style={{ gap: Spacing.sm }}>
                    <Label>{t('onboarding.yourFirstName')}</Label>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder={t('onboarding.firstNamePlaceholder')}
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    />
                  </View>
                  <View style={{ gap: Spacing.sm }}>
                    <Label>{t('onboarding.yourAvatar')}</Label>
                    <EmojiPicker value={emoji} onChange={setEmoji} />
                  </View>
                  <View style={{ gap: Spacing.sm }}>
                    <Label>{t('onboarding.netMonthlyIncome')}</Label>
                    <MoneyInput initialCents={incomeCents} onChangeCents={setIncomeCents} placeholder="0" />
                  </View>
                </Card>
              </>
            )}

            {current === 'foyer' && (
              <>
                <Header
                  emoji="🏠"
                  title={t('onboarding.householdTitle')}
                  subtitle={t('onboarding.householdSubtitle')}
                />
                {hasSharedAlready && (
                  <View style={[styles.note, { backgroundColor: theme.accentSoft }]}>
                    <Ionicons name="information-circle" size={18} color={theme.accent} />
                    <ThemedText type="small" style={{ flex: 1 }}>
                      {t('onboarding.householdNote')}
                    </ThemedText>
                  </View>
                )}
                <EnvelopeList
                  drafts={foyerDrafts}
                  onToggle={(id, v) => updateDraft(setFoyerDrafts, id, { enabled: v })}
                  onLimit={(id, c) => updateDraft(setFoyerDrafts, id, { limitCents: c })}
                  onRemove={(id) => removeDraft(setFoyerDrafts, id)}
                  onAddCustom={() => setSheet('foyer')}
                />
              </>
            )}

            {current === 'perso' && (
              <>
                <Header
                  emoji="🙂"
                  title={t('onboarding.personalTitle')}
                  subtitle={t('onboarding.personalSubtitle')}
                />
                <EnvelopeList
                  drafts={persoDrafts}
                  onToggle={(id, v) => updateDraft(setPersoDrafts, id, { enabled: v })}
                  onLimit={(id, c) => updateDraft(setPersoDrafts, id, { limitCents: c })}
                  onRemove={(id) => removeDraft(setPersoDrafts, id)}
                  onAddCustom={() => setSheet('perso')}
                />
              </>
            )}
          </Animated.View>
        </ScrollView>

        {/* Pied : navigation */}
        <View
          style={[
            styles.footer,
            { borderColor: theme.border, paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.background },
          ]}>
          <View style={styles.footerRow}>
            {step > 0 ? (
              <Pressable onPress={back} hitSlop={10} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">{t('onboarding.back')}</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.backBtn} />
            )}
            <Pressable
              disabled={busy}
              onPress={next}
              style={({ pressed }) => [
                styles.primary,
                { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 },
              ]}>
              {busy ? (
                <ActivityIndicator color={theme.onAccent} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.onAccent, fontSize: 16 }}>
                  {primaryLabel}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CustomCategorySheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        onAdd={(d) => sheet && addCustom(sheet, d)}
      />
    </View>
  );
}

function EnvelopeList({
  drafts,
  onToggle,
  onLimit,
  onRemove,
  onAddCustom,
}: {
  drafts: Draft[];
  onToggle: (id: string, v: boolean) => void;
  onLimit: (id: string, cents: number) => void;
  onRemove: (id: string) => void;
  onAddCustom: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Card style={{ gap: 2 }}>
      {drafts.map((d, i) => (
        <View key={d.id}>
          {i > 0 && <View style={{ height: 1, backgroundColor: theme.border }} />}
          <EnvelopeEditorRow
            icon={d.icon}
            color={d.color}
            name={d.name}
            enabled={d.enabled}
            onToggle={(v) => onToggle(d.id, v)}
            initialLimitCents={d.limitCents}
            onChangeLimit={(c) => onLimit(d.id, c)}
            onRemove={d.custom ? () => onRemove(d.id) : undefined}
          />
        </View>
      ))}
      <Pressable onPress={onAddCustom} style={styles.addCustom}>
        <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          {t('onboarding.customCategory')}
        </ThemedText>
      </Pressable>
    </Card>
  );
}

function Header({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <ThemedText style={{ fontSize: 40, lineHeight: 48 }}>{emoji}</ThemedText>
      <ThemedText type="title" style={{ fontSize: 30, lineHeight: 36 }}>{title}</ThemedText>
      <ThemedText type="default" themeColor="textSecondary">{subtitle}</ThemedText>
    </View>
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
  progress: { flexDirection: 'row', gap: Spacing.sm },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: { height: 52, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, fontSize: 16 },
  note: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  addCustom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingTop: Spacing.lg },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 90, minHeight: 44 },
  primary: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    minWidth: 150,
    flexDirection: 'row',
  },
});
