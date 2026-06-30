import { useState } from 'react';
import { StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseAmountToCents } from '@/utils/money';

type Props = {
  initialCents?: number;
  onChangeCents: (cents: number) => void;
  placeholder?: string;
  compact?: boolean;
  style?: ViewStyle;
};

/** Saisie d'un montant en euros → renvoie des centimes. */
export function MoneyInput({
  initialCents,
  onChangeCents,
  placeholder = '0',
  compact,
  style,
}: Props) {
  const theme = useTheme();
  const [text, setText] = useState(
    initialCents ? String(initialCents / 100).replace('.', ',') : '',
  );

  const handle = (t: string) => {
    setText(t);
    onChangeCents(parseAmountToCents(t));
  };

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.compact : styles.full,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}>
      <TextInput
        value={text}
        onChangeText={handle}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }, compact && styles.inputCompact]}
      />
      <ThemedText
        type="smallBold"
        style={{ color: theme.textSecondary, fontSize: compact ? 15 : 17 }}>
        €
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  full: { height: 52 },
  compact: { height: 40, minWidth: 110 },
  input: { flex: 1, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  inputCompact: { fontSize: 15, textAlign: 'right' },
});
