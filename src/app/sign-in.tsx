import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';

export default function SignInScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { signInApple, signInGoogle, signInEmail } = useAuth();
  const [busy, setBusy] = useState<'apple' | 'google' | 'email' | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const run = async (provider: 'apple' | 'google' | 'email', fn: () => Promise<void>) => {
    try {
      setBusy(provider);
      await fn();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED' && e?.code !== '-5') {
        Alert.alert(t('auth.failedTitle'), e?.message ?? t('auth.failedBody'));
      }
    } finally {
      setBusy(null);
    }
  };

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && password.length >= 6;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.xl },
        ]}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="heart" size={46} color={theme.accent} />
          </View>
          <ThemedText type="title" style={styles.title}>
            {t('common.appName')}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
            {t('auth.tagline')}
          </ThemedText>
        </View>

        <View style={styles.actions}>
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={() => run('apple', signInApple)}
              style={({ pressed }) => [
                styles.providerBtn,
                { backgroundColor: isDark ? '#FFFFFF' : '#000000', opacity: pressed ? 0.85 : 1 },
              ]}>
              {busy === 'apple' ? (
                <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color={isDark ? '#000' : '#FFF'} />
                  <ThemedText type="smallBold" style={{ fontSize: 16, color: isDark ? '#000' : '#FFF' }}>
                    {t('auth.continueApple')}
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            onPress={() => run('google', signInGoogle)}
            style={({ pressed }) => [
              styles.providerBtn,
              { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}>
            {busy === 'google' ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color={theme.text} />
                <ThemedText type="smallBold" style={{ fontSize: 16 }}>
                  {t('auth.continueGoogle')}
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* Connexion par email (validation rapide de la sync) */}
          {!showEmail ? (
            <Pressable onPress={() => setShowEmail(true)} style={styles.emailLink}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('auth.continueEmail')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />
              <Pressable
                disabled={!emailValid || busy === 'email'}
                onPress={() => run('email', () => signInEmail(email.trim(), password))}
                style={({ pressed }) => [
                  styles.providerBtn,
                  {
                    backgroundColor: emailValid ? theme.accent : theme.backgroundElement,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}>
                {busy === 'email' ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <ThemedText
                    type="smallBold"
                    style={{ fontSize: 16, color: emailValid ? theme.onAccent : theme.textSecondary }}>
                    {t('auth.signInOrCreate')}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}

          <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
            {t('auth.legal')}
          </ThemedText>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.lg },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', paddingHorizontal: Spacing.md },
  actions: { gap: Spacing.md },
  providerBtn: {
    height: 54,
    borderRadius: Radius.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailLink: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: Spacing.sm },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  legal: { textAlign: 'center', fontSize: 12, marginTop: Spacing.sm },
});
