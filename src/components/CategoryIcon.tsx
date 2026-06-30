import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

type Props = {
  icon: string;
  color: string;
  size?: number;
};

/** Pastille colorée avec l'icône d'une catégorie. */
export function CategoryIcon({ icon, color, size = 44 }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color + '22', // teinte douce
      }}>
      <Ionicons name={icon as never} size={size * 0.5} color={color} />
    </View>
  );
}
