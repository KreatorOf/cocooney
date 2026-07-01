import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorPicker } from '@/components/ColorPicker';
import { IconPicker } from '@/components/IconPicker';
import { MoneyInput } from '@/components/MoneyInput';
import { ThemedText } from '@/components/themed-text';
import { CategoryPalette, Radius, Spacing } from '@/constants/theme';
import { noBounce } from '@/constants/scroll';
import { useTheme } from '@/hooks/use-theme';

export type CustomCategoryDraft = {
  name: string;
  icon: string;
  color: string;
  limitCents: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (draft: CustomCategoryDraft) => void;
};

/** Feuille modale pour créer une catégorie sur-mesure (nom, icône, couleur, plafond). */
export function CustomCategorySheet({ visible, onClose, onAdd }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('pricetag');
  const [color, setColor] = useState<string>(CategoryPalette[0]);
  const [limitCents, setLimitCents] = useState(0);

  const reset = () => {
    setName('');
    setIcon('pricetag');
    setColor(CategoryPalette[0]);
    setLimitCents(0);
  };

  const add = () => {
    onAdd({ name: name.trim() || t('customCategory.defaultName'), icon, color, limitCents });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.lg },
            ]}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('common.cancel')}
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">{t('customCategory.new')}</ThemedText>
              <Pressable onPress={add} hitSlop={12}>
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  {t('common.add')}
                </ThemedText>
              </Pressable>
            </View>

            <ScrollView
              {...noBounce}
              contentContainerStyle={{ gap: Spacing.lg, paddingVertical: Spacing.md }}
              keyboardShouldPersistTaps="handled">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('customCategory.namePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              />

              <View style={{ gap: Spacing.sm }}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('customCategory.monthlyLimit')}</ThemedText>
                <MoneyInput onChangeCents={setLimitCents} placeholder="0" />
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('customCategory.color')}</ThemedText>
                <ColorPicker value={color} onChange={setColor} />
              </View>

              <View style={{ gap: Spacing.sm }}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('customCategory.icon')}</ThemedText>
                <IconPicker value={icon} onChange={setIcon} color={color} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
});
