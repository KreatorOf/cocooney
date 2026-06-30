import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  /** Petit libellé au-dessus du titre (mois, contexte…). */
  eyebrow?: string;
  title: string;
  /** Élément aligné à droite (avatars, badge…). */
  right?: React.ReactNode;
};

/** En-tête d'écran cohérent (même hauteur/alignement sur tous les onglets). */
export function ScreenHeader({ eyebrow, title, right }: Props) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <ThemedText type="small" themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
        ) : null}
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: Spacing.md,
  },
});
