import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** État vide riche : icône ronde + titre + sous-texte + action optionnelle. */
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: theme.accentSoft }]}>
        <Ionicons name={icon} size={26} color={theme.accent} />
      </View>
      <ThemedText type="smallBold" style={styles.center}>{title}</ThemedText>
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {subtitle}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.7 : 1 }]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xl },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  center: { textAlign: 'center' },
  action: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
