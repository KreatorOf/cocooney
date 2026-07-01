import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/Glass';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { Scope } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

/** Hauteur approximative de la tab bar native pour décaler le FAB au-dessus. */
const TAB_BAR_HEIGHT = Platform.select({ ios: 49, default: 64 }) as number;
const FAB_SIZE = 60;

type Props = {
  /** Scope appliqué à l'action « dépense » selon l'onglet (Foyer/Moi). */
  expenseScope: Scope;
};

/**
 * Bouton d'action flottant (bas droite) au-dessus de la tab bar native.
 * Au tap, ouvre un menu : ajouter une dépense ou un abonnement.
 */
export function AddFab({ expenseScope }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const bottom = insets.bottom + TAB_BAR_HEIGHT + Spacing.md;

  const close = () => setOpen(false);
  const openMenu = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
  };
  const go = (path: Href) => {
    close();
    router.push(path);
  };

  return (
    <>
      <Pressable
        onPress={openMenu}
        android_ripple={{ color: theme.onAccent + '33', borderless: false }}
        style={[styles.fab, { backgroundColor: theme.accent, bottom, right: Spacing.lg }]}>
        <Ionicons name="add" size={30} color={theme.onAccent} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <Pressable style={styles.flex} onPress={close}>
          <Animated.View
            entering={FadeIn.duration(150)}
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          />
        </Pressable>

        <View pointerEvents="box-none" style={[styles.menu, { bottom, right: Spacing.lg }]}>
          <Action
            icon="receipt-outline"
            label={t('transaction.addExpense')}
            delay={60}
            onPress={() => go(`/add-transaction?scope=${expenseScope}`)}
          />
          <Action
            icon="repeat-outline"
            label={t('subscriptions.add')}
            delay={0}
            onPress={() => go('/subscriptions?new=1')}
          />

          <Pressable
            onPress={close}
            android_ripple={{ color: theme.onAccent + '33', borderless: false }}
            style={[styles.fabInline, { backgroundColor: theme.accent }]}>
            <Ionicons name="close" size={28} color={theme.onAccent} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

function Action({
  icon,
  label,
  delay,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  delay: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(220).delay(delay)}>
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        <Glass glassEffectStyle="regular" fallbackColor={theme.card} style={[styles.action, { borderColor: theme.border }]}>
          <ThemedText type="smallBold" style={{ color: theme.text }}>
            {label}
          </ThemedText>
          <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name={icon} size={20} color={theme.accent} />
          </View>
        </Glass>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.35)' },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  menu: { position: 'absolute', alignItems: 'flex-end', gap: Spacing.md },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInline: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
