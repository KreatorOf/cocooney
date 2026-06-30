import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onChange(opt.value);
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.card, ...shadow },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: selected ? theme.text : theme.textSecondary }}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: Radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
