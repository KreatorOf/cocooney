import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionTitle } from '@/components/SectionTitle';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { noBounce } from '@/constants/scroll';
import { hasSupabase } from '@/lib/env';
import { setLanguage, type Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';
import { usePremium } from '@/providers/PremiumProvider';
import { useBudgetStore } from '@/store/useBudgetStore';
import { formatCents } from '@/utils/money';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { members, accounts, currentUserId } = useBudgetStore();
  const language = (i18n.language?.startsWith('en') ? 'en' : 'fr') as Language;
  const { session, profile, signOut, setSharePersonal } = useAuth();
  const { isPremium } = usePremium();
  const partner = members.find((m) => m.id !== currentUserId);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const connected = hasSupabase && !!session && !!profile?.household_id;

  // Récupère le code d'invitation du foyer (mode connecté).
  useEffect(() => {
    if (!connected || !supabase || !profile?.household_id) return;
    supabase
      .from('households')
      .select('invite_code')
      .eq('id', profile.household_id)
      .single()
      .then(({ data }) => setInviteCode((data as any)?.invite_code ?? null));
  }, [connected, profile?.household_id]);

  const confirmSignOut = () => {
    Alert.alert(t('settings.signOutConfirmTitle'), t('settings.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        {...noBounce}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xxl },
        ]}>
        <ScreenHeader eyebrow={t('common.appName')} title={t('settings.title')} />

        {isPremium ? (
          <Pressable onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
            <Card style={styles.premiumRow}>
              <View style={[styles.premiumIcon, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name="sparkles" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{t('settings.premiumActive')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                  {t('settings.premiumActiveSub')}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Card>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/paywall')}>
            <Card style={[styles.premiumRow, { borderColor: theme.accent }]}>
              <View style={[styles.premiumIcon, { backgroundColor: theme.accent }]}>
                <Ionicons name="sparkles" size={20} color={theme.onAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{t('settings.goPremium')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                  {t('settings.goPremiumSub')}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.accent} />
            </Card>
          </Pressable>
        )}

        {connected && (
          <>
            <SectionTitle>{t('settings.connectedHousehold')}</SectionTitle>
            <Card style={{ gap: Spacing.sm }}>
              <View style={styles.soon}>
                <Ionicons name="people-circle" size={18} color={theme.success} />
                <ThemedText type="smallBold">{t('settings.syncedRealtime')}</ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {t('settings.shareCodePrompt')}
              </ThemedText>
              <View style={[styles.codeBox, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" style={styles.code}>
                  {inviteCode ?? '······'}
                </ThemedText>
              </View>
            </Card>
          </>
        )}

        <SectionTitle>{t('settings.theCouple')}</SectionTitle>
        <Card padded={false}>
          {members.map((m, i) => (
            <View key={m.id}>
              {i > 0 && <Divider />}
              <Row
                left={<ThemedText style={{ fontSize: 22 }}>{m.emoji}</ThemedText>}
                title={m.name}
                subtitle={
                  m.monthlyIncomeCents
                    ? t('settings.incomePerMonth', { amount: formatCents(m.monthlyIncomeCents) })
                    : t('settings.incomeNotSet')
                }
              />
            </View>
          ))}
        </Card>

        {connected && (
          <>
            <SectionTitle>{t('settings.privacy')}</SectionTitle>
            <Card style={{ gap: Spacing.sm }}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="small" style={{ fontWeight: '600' }}>
                    {t('settings.sharePersonalBudget')}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                    {partner
                      ? t('settings.partnerCanSeePersonalNamed', { name: partner.name })
                      : t('settings.partnerCanSeePersonalGeneric')}
                  </ThemedText>
                </View>
                <Switch
                  value={!!profile?.share_personal}
                  onValueChange={(v) => setSharePersonal(v)}
                  trackColor={{ true: theme.accent, false: theme.backgroundElement }}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                {t('settings.personalPrivateByDefault')}
              </ThemedText>
            </Card>
          </>
        )}

        <SectionTitle>{t('settings.budget')}</SectionTitle>
        <Card padded={false}>
          <Row
            left={<Ionicons name="wallet" size={20} color={theme.accent} />}
            title={t('settings.myEnvelopesRow')}
            subtitle={t('settings.myEnvelopesRowSub')}
            onPress={() => router.push('/edit-budgets')}
            right={<Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
          />
          <Divider />
          <Row
            left={<Ionicons name="repeat" size={20} color={theme.accent} />}
            title={t('settings.subscriptions')}
            subtitle={t('settings.subscriptionsSub')}
            onPress={() => router.push('/subscriptions')}
            right={<Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />}
          />
        </Card>

        <SectionTitle>{t('settings.language')}</SectionTitle>
        <Card>
          <SegmentedControl
            options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
            value={language}
            onChange={(v) => void setLanguage(v as Language)}
          />
        </Card>

        <SectionTitle>{t('settings.accounts')}</SectionTitle>
        <Card padded={false}>
          {accounts.map((a, i) => (
            <View key={a.id}>
              {i > 0 && <Divider />}
              <Row
                left={
                  <Ionicons
                    name={a.scope === 'shared' ? 'people' : 'person'}
                    size={20}
                    color={theme.accent}
                  />
                }
                title={a.name}
                subtitle={a.scope === 'shared' ? t('settings.jointAccount') : t('settings.personalAccount')}
                right={<ThemedText type="smallBold">{formatCents(a.balanceCents)}</ThemedText>}
              />
            </View>
          ))}
        </Card>

        <SectionTitle>{t('settings.bankConnection')}</SectionTitle>
        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.soon}>
            <Ionicons name="link" size={18} color={theme.accent} />
            <ThemedText type="smallBold">{t('settings.autoSync')}</ThemedText>
            <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
              <ThemedText type="small" style={{ color: theme.accent, fontSize: 11 }}>
                {t('common.soon')}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('settings.bankConnectionDesc')}
          </ThemedText>
        </Card>

        <SectionTitle>{t('settings.account')}</SectionTitle>
        <Card padded={false}>
          <Row
            left={<Ionicons name="log-out-outline" size={20} color={theme.danger} />}
            title={t('settings.signOut')}
            subtitle={session?.user.email ?? undefined}
            onPress={confirmSignOut}
            danger
          />
        </Card>

        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {t('settings.footer', {
            appName: t('common.appName'),
            status: connected ? t('settings.footerSynced') : t('settings.footerLocal'),
          })}
        </ThemedText>
      </ScrollView>
    </View>
  );
}

function Row({
  left,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  const inner = (
    <>
      {left && <View style={styles.rowIcon}>{left}</View>}
      <View style={{ flex: 1 }}>
        <ThemedText type="small" style={{ fontWeight: '600', color: danger ? theme.danger : theme.text }}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {right}
    </>
  );

  // Pressable accepte une fonction de style ; une View simple non → on distingue
  // les deux pour que le padding (styles.row) soit toujours appliqué.
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundElement }]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.row}>{inner}</View>;
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.separator, marginLeft: 56 }} />;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowIcon: { width: 24, alignItems: 'center' },
  soon: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  premiumIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  codeBox: { paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
  code: { fontSize: 24, lineHeight: 34, letterSpacing: 6 },
  footer: { textAlign: 'center', marginTop: Spacing.lg, fontSize: 12 },
});
