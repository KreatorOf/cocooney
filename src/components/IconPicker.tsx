import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Jeu d'icônes proposées pour les catégories. */
export const CATEGORY_ICONS = [
  'home', 'restaurant', 'cart', 'flash', 'car', 'wine', 'fitness', 'bag-handle',
  'game-controller', 'airplane', 'gift', 'medkit', 'paw', 'school', 'shirt',
  'cafe', 'bus', 'phone-portrait', 'tv', 'barbell', 'cut', 'book',
] as const;

type Props = { value: string; onChange: (icon: string) => void; color: string };

export function IconPicker({ value, onChange, color }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {CATEGORY_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <Pressable
            key={icon}
            onPress={() => onChange(icon)}
            style={[
              styles.cell,
              {
                backgroundColor: selected ? color + '22' : theme.backgroundElement,
                borderColor: selected ? color : 'transparent',
              },
            ]}>
            <Ionicons name={icon as never} size={22} color={selected ? color : theme.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
