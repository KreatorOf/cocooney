import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { noBounce } from '@/constants/scroll';
import { useTheme } from '@/hooks/use-theme';
import { usePremium } from '@/providers/PremiumProvider';
import { dateLocale } from '@/utils/date';

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
  { icon: 'card', key: 'paywall.benefitBank' },
  { icon: 'stats-chart', key: 'paywall.benefitStats' },
  { icon: 'repeat', key: 'paywall.benefitSubs' },
  { icon: 'flag', key: 'paywall.benefitGoals' },
  { icon: 'heart', key: 'paywall.benefitOne' },
];

type Plan = { key: string; title: string; price: string; caption: string; pkg?: PurchasesPackage; highlight?: boolean; badge?: string };

const formatPrice = (n: number, currency: string) =>
  new Intl.NumberFormat(dateLocale(), { style: 'currency', currency }).format(n);

export default function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { offering, purchase, restore } = usePremium();
  const [busy, setBusy] = useState(false);

  const pkgs = offering?.availablePackages ?? [];
  const monthly = pkgs.find((p) => p.packageType === 'MONTHLY');
  const annual = pkgs.find((p) => p.packageType === 'ANNUAL');

  // Prix / économie calculés depuis les vrais produits RevenueCat (fallback statique sinon).
  let annualPrice = '49,99 €';
  let annualCaption = t('paywall.freeTrial7', { perMonth: '~4,17 €' });
  let annualBadge = t('paywall.saveBadge', { percent: 40 });
  if (annual && monthly) {
    const cur = annual.product.currencyCode;
    annualPrice = annual.product.priceString;
    annualCaption = t('paywall.freeTrial7', { perMonth: formatPrice(annual.product.price / 12, cur) });
    const pct = Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100);
    annualBadge = pct > 0 ? t('paywall.saveBadge', { percent: pct }) : '';
  }

  const plans: Plan[] = [
    {
      key: 'annual',
      title: t('paywall.planAnnual'),
      price: annualPrice,
      caption: annualCaption,
      pkg: annual,
      highlight: true,
      badge: annualBadge || undefined,
    },
    {
      key: 'monthly',
      title: t('paywall.planMonthly'),
      price: monthly?.product.priceString ?? '6,99 €',
      caption: t('paywall.freeTrial7Simple'),
      pkg: monthly,
    },
  ];

  const [selected, setSelected] = useState('annual');
  const plan = plans.find((p) => p.key === selected)!;

  const onSubscribe = async () => {
    if (!plan.pkg) {
      Alert.alert(t('paywall.comingSoonTitle'), t('paywall.comingSoonBody'));
      return;
    }
    try {
      setBusy(true);
      await purchase(plan.pkg);
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert(t('paywall.purchaseFailedTitle'), e?.message ?? t('paywall.purchaseFailedBody'));
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    try {
      setBusy(true);
      const ok = await restore();
      if (ok) router.back();
      else Alert.alert(t('paywall.noSubTitle'), t('paywall.noSubBody'));
    } catch {
      Alert.alert(t('paywall.errorTitle'), t('paywall.restoreFailedBody'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={[styles.close, { top: insets.top + Spacing.sm }]}>
        <Ionicons name="close" size={26} color={theme.textSecondary} />
      </Pressable>

      <ScrollView
        {...noBounce}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.lg }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.logo, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name="sparkles" size={40} color={theme.accent} />
        </View>
        <ThemedText type="title" style={{ fontSize: 30, lineHeight: 36, textAlign: 'center' }}>
          {t('paywall.title')}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {t('paywall.subtitle')}
        </ThemedText>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.key} style={styles.benefit}>
              <View style={[styles.benefitIcon, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name={b.icon} size={18} color={theme.accent} />
              </View>
              <ThemedText type="small" style={{ flex: 1, fontWeight: '600' }}>{t(b.key)}</ThemedText>
            </View>
          ))}
        </View>

        <View style={{ gap: Spacing.sm }}>
          {plans.map((p) => {
            const sel = p.key === selected;
            return (
              <Pressable
                key={p.key}
                onPress={() => setSelected(p.key)}
                style={[
                  styles.plan,
                  { borderColor: sel ? theme.accent : theme.border, backgroundColor: sel ? theme.accentSoft : theme.card },
                ]}>
                <View style={[styles.radio, { borderColor: sel ? theme.accent : theme.border }]}>
                  {sel && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.planTop}>
                    <ThemedText type="smallBold" style={{ fontSize: 16 }}>{p.title}</ThemedText>
                    {p.badge && (
                      <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                        <ThemedText type="small" style={{ color: theme.onAccent, fontSize: 11, fontWeight: '700' }}>
                          {p.badge}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>{p.caption}</ThemedText>
                </View>
                <ThemedText type="smallBold" style={{ fontSize: 16, fontVariant: ['tabular-nums'] }}>{p.price}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={onSubscribe}
          disabled={busy}
          style={({ pressed }) => [styles.cta, { backgroundColor: theme.accent, opacity: pressed ? 0.9 : 1 }]}>
          {busy ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <ThemedText type="smallBold" style={{ color: theme.onAccent, fontSize: 17 }}>
              {t('paywall.startFreeTrial')}
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={onRestore} style={styles.restore}>
          <ThemedText type="small" themeColor="textSecondary">{t('paywall.restore')}</ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
          {t('paywall.legal')}
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', right: Spacing.lg, zIndex: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.lg, alignItems: 'stretch' },
  logo: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  benefits: { gap: Spacing.md },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  benefitIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderWidth: 2, borderRadius: Radius.md },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
  cta: { height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  restore: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  legal: { textAlign: 'center', fontSize: 11, paddingHorizontal: Spacing.md },
});
