import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const EMOJIS = ['🙂', '😎', '🦊', '🐼', '🦁', '🌷', '⭐️', '🚀', '🎸', '🍀', '🐙', '🦄'];

type Props = { value: string; onChange: (emoji: string) => void };

export function EmojiPicker({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {EMOJIS.map((e) => {
        const selected = e === value;
        return (
          <Pressable
            key={e}
            onPress={() => onChange(e)}
            style={[
              styles.cell,
              {
                backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                borderColor: selected ? theme.accent : 'transparent',
              },
            ]}>
            <ThemedText style={{ fontSize: 24 }}>{e}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
