import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Glass } from '@/components/Glass';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Espace à réserver en bas du scroll pour ne pas passer sous la barre. */
export const BOTTOM_BAR_SPACE = 96;

type Props = { label: string; onPress: () => void };

/**
 * Barre d'action ancrée en bas (au-dessus de la tab bar), fond opaque :
 * le contenu défile dessous sans jamais être masqué de façon visible.
 */
export function BottomBar({ label, onPress }: Props) {
  const theme = useTheme();
  return (
    <Glass
      glassEffectStyle="regular"
      fallbackColor={theme.background}
      style={[styles.bar, { borderTopColor: theme.border }]}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        android_ripple={{ color: theme.onAccent + '33', borderless: false }}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: theme.accent, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}>
        <Ionicons name="add" size={22} color={theme.onAccent} />
        <ThemedText type="smallBold" style={{ color: theme.onAccent, fontSize: 16 }}>
          {label}
        </ThemedText>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 52,
    width: '100%',
    maxWidth: MaxContentWidth,
    borderRadius: Radius.md,
  },
});
