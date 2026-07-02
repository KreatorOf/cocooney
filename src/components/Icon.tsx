import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform } from 'react-native';

type Props = {
  /** Nom SF Symbol (iOS). */
  sf: SFSymbol;
  /** Icône Ionicons de repli (Android / web). */
  ionicon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
};

/**
 * Icône de « chrome » : SF Symbols natifs sur iOS (cohérent avec la tab bar),
 * Ionicons sur les autres plateformes. Réservé aux contrôles de navigation ;
 * les icônes de contenu (catégories) restent gérées par `CategoryIcon`.
 */
export function Icon({ sf, ionicon, size = 20, color, weight = 'semibold' }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={sf}
        size={size}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
      />
    );
  }
  return <Ionicons name={ionicon} size={size} color={color} />;
}
