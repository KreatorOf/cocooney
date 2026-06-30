import {
  GlassView,
  isLiquidGlassAvailable,
  type GlassStyle,
} from 'expo-glass-effect';
import { View, type ViewProps } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Liquid Glass disponible (iOS 26+ avec composants natifs). Évalué une fois :
 * sert aussi à brancher le rendu de secours (Android / iOS < 26).
 */
export const liquidGlass = isLiquidGlassAvailable();

type Props = ViewProps & {
  /** Style du verre : 'regular' (défaut), 'clear' (plus transparent) ou 'none'. */
  glassEffectStyle?: GlassStyle;
  /** Teinte appliquée au verre (ex. accent pour un état sélectionné). */
  tintColor?: string;
  /** Effet de morphing au toucher (pour les surfaces tappables). */
  isInteractive?: boolean;
  /** Couleur de fond utilisée quand le Liquid Glass n'est pas disponible. */
  fallbackColor?: string;
};

/**
 * Surface en Liquid Glass sur iOS 26, avec repli sur une `View` teintée
 * (`fallbackColor`) partout ailleurs — conserve le rendu actuel sur Android
 * et les anciens iOS. À réserver à la couche de contrôle/navigation (HIG).
 */
export function Glass({
  glassEffectStyle = 'regular',
  tintColor,
  isInteractive,
  fallbackColor,
  style,
  children,
  ...rest
}: Props) {
  const scheme = useColorScheme();

  if (liquidGlass) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        colorScheme={scheme === 'dark' ? 'dark' : 'light'}
        style={style}
        {...rest}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[fallbackColor ? { backgroundColor: fallbackColor } : null, style]} {...rest}>
      {children}
    </View>
  );
}
