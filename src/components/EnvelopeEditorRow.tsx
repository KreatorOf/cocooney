import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { CategoryIcon } from '@/components/CategoryIcon';
import { MoneyInput } from '@/components/MoneyInput';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: string;
  color: string;
  name: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  initialLimitCents?: number;
  onChangeLimit: (cents: number) => void;
  onRemove?: () => void;
};

/** Ligne d'édition d'une enveloppe : activer + définir le plafond mensuel. */
export function EnvelopeEditorRow({
  icon,
  color,
  name,
  enabled,
  onToggle,
  initialLimitCents,
  onChangeLimit,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <CategoryIcon icon={icon} color={color} size={42} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type="small" style={styles.name} numberOfLines={1}>
            {name}
          </ThemedText>
          {onRemove && (
            <Pressable onPress={onRemove} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
        {enabled && (
          <MoneyInput
            compact
            initialCents={initialLimitCents}
            onChangeCents={onChangeLimit}
            placeholder={t('envelope.limitPlaceholder')}
          />
        )}
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ true: theme.accent, false: theme.backgroundElement }}
        thumbColor={Platform.OS === 'android' ? (enabled ? '#fff' : '#f4f4f5') : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  body: { flex: 1, gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontWeight: '600' },
});
