import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import '@/lib/i18n';
import { Colors } from '@/constants/theme';
import { AuthGate } from '@/providers/AuthGate';
import { AuthProvider } from '@/providers/AuthProvider';
import { NotificationsProvider } from '@/providers/NotificationsProvider';
import { PremiumProvider } from '@/providers/PremiumProvider';
import { SyncProvider } from '@/providers/SyncProvider';

export default function RootLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = Colors[isDark ? 'dark' : 'light'];

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      primary: palette.accent,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <AuthProvider>
            <PremiumProvider>
              <SyncProvider>
                <NotificationsProvider>
                <AuthGate>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="add-transaction"
                    options={{
                      presentation: 'modal',
                      title: t('transaction.newExpense'),
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen name="sign-in" options={{ headerShown: false }} />
                  <Stack.Screen name="setup-household" options={{ headerShown: false }} />
                  <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
                  <Stack.Screen
                    name="edit-budgets"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                  <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="transactions" options={{ headerShown: false }} />
                  <Stack.Screen name="subscriptions" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="paywall"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                </Stack>
                </AuthGate>
                </NotificationsProvider>
              </SyncProvider>
            </PremiumProvider>
          </AuthProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
