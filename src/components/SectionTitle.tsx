import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Titre de section uniforme (s'appuie sur le `gap` du conteneur pour l'espacement). */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <ThemedText
      type="smallBold"
      themeColor="textSecondary"
      style={{ marginLeft: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </ThemedText>
  );
}
