import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { CategoryPalette, Spacing } from '@/constants/theme';

type Props = { value: string; onChange: (color: string) => void };

export function ColorPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {CategoryPalette.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            onPress={() => onChange(color)}
            style={[styles.swatch, { backgroundColor: color }]}>
            {selected && <Ionicons name="checkmark" size={18} color="#fff" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
