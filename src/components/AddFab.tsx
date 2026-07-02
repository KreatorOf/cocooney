import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
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
        accessibilityRole="button"
        accessibilityLabel={t('common.add')}
        android_ripple={{ color: theme.onAccent + '33', borderless: false }}
        style={[styles.fab, { bottom, right: Spacing.lg }]}>
        <Glass
          glassEffectStyle="regular"
          tintColor={theme.accent}
          isInteractive
          fallbackColor={theme.accent}
          style={StyleSheet.absoluteFill}
        />
        <Icon sf="plus" ionicon="add" size={28} color={theme.onAccent} weight="bold" />
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
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            android_ripple={{ color: theme.onAccent + '33', borderless: false }}
            style={styles.fabInline}>
            <Glass
              glassEffectStyle="regular"
              tintColor={theme.accent}
              isInteractive
              fallbackColor={theme.accent}
              style={StyleSheet.absoluteFill}
            />
            <Icon sf="xmark" ionicon="close" size={24} color={theme.onAccent} weight="bold" />
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
  const reduced = useReducedMotion();
  const inner = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
      <Glass glassEffectStyle="regular" fallbackColor={theme.card} style={[styles.action, { borderColor: theme.cardBorder }]}>
        <ThemedText type="smallBold" style={{ color: theme.text }}>
          {label}
        </ThemedText>
        <View style={[styles.actionIcon, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name={icon} size={20} color={theme.accent} />
        </View>
      </Glass>
    </Pressable>
  );
  if (reduced) return inner;
  return <Animated.View entering={FadeInDown.duration(220).delay(delay)}>{inner}</Animated.View>;
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
