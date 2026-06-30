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

import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';

export default function SetupHouseholdScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { refreshProfile, signOut } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(t('setupHousehold.defaultHouseholdName'));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    try {
      setBusy(true);
      if (mode === 'create') {
        const { error } = await supabase.rpc('create_household', { p_name: name });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('join_household', { p_code: code });
        if (error) throw error;
      }
      await refreshProfile();
    } catch (e: any) {
      Alert.alert(t('common.oops'), e?.message ?? t('setupHousehold.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = mode === 'create' ? name.trim().length > 0 : code.trim().length >= 4;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.container, { paddingTop: insets.top + Spacing.xxl }]}>
        <ThemedText type="title">{t('setupHousehold.title')}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={{ marginBottom: Spacing.lg }}>
          {t('setupHousehold.subtitle')}
        </ThemedText>

        <SegmentedControl
          options={[
            { value: 'create', label: t('setupHousehold.create') },
            { value: 'join', label: t('setupHousehold.join') },
          ]}
          value={mode}
          onChange={(v) => setMode(v as 'create' | 'join')}
        />

        <Card style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          {mode === 'create' ? (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('setupHousehold.householdName')}
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('setupHousehold.defaultHouseholdName')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
              <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
                {t('setupHousehold.codeShareHint')}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('setupHousehold.inviteCode')}
              </ThemedText>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                placeholder={t('setupHousehold.codePlaceholder')}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, styles.code, { color: theme.text, borderColor: theme.border }]}
              />
            </>
          )}
        </Card>

        <Pressable
          disabled={!canSubmit || busy}
          onPress={submit}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: canSubmit ? theme.accent : theme.backgroundElement,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}>
          {busy ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <ThemedText
              type="smallBold"
              style={{ color: canSubmit ? theme.onAccent : theme.textSecondary, fontSize: 16 }}>
              {mode === 'create' ? t('setupHousehold.createHousehold') : t('setupHousehold.joinHousehold')}
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={signOut} style={styles.signout}>
          <ThemedText type="small" themeColor="textSecondary">
            {t('setupHousehold.signOut')}
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.xl },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  code: { fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '700' },
  cta: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  signout: { alignItems: 'center', marginTop: Spacing.lg },
});
