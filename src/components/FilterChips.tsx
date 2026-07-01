import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Glass, liquidGlass } from '@/components/Glass';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FilterChip = { id: string; label: string };

type Props = {
  items: FilterChip[];
  selectedId: string;
  onSelect: (id: string) => void;
};

/**
 * Rangée horizontale de « pills » de filtre.
 * iOS 26 : pilules en Liquid Glass interactif (teintées accent si sélectionnées).
 * Android / iOS < 26 : pilules tonales avec ripple Material. Cibles ≥ 44pt.
 */
export function FilterChips({ items, selectedId, onSelect }: Props) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      bounces={false}
      alwaysBounceHorizontal={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {items.map((item) => {
        const selected = item.id === selectedId;
        const press = () => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          onSelect(item.id);
        };

        // iOS 26 : verre interactif, teinté accent quand sélectionné.
        if (liquidGlass) {
          return (
            <Pressable key={item.id} onPress={press}>
              <Glass
                isInteractive
                glassEffectStyle={selected ? 'regular' : 'clear'}
                tintColor={selected ? theme.accent : undefined}
                style={styles.chip}>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.onAccent : theme.text }}
                  numberOfLines={1}>
                  {item.label}
                </ThemedText>
              </Glass>
            </Pressable>
          );
        }

        // Repli tonal + ripple Material.
        return (
          <Pressable
            key={item.id}
            onPress={press}
            android_ripple={{ color: selected ? theme.onAccent + '33' : theme.accentSoft }}
            style={[
              styles.chip,
              { backgroundColor: selected ? theme.accent : theme.backgroundElement },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: selected ? theme.onAccent : theme.text }}
              numberOfLines={1}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
