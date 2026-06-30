import { View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Fraction remplie entre 0 et 1+ (au-delà de 1 = dépassement). */
  progress: number;
  color?: string;
  height?: number;
};

export function ProgressBar({ progress, color, height = 8 }: Props) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(progress, 1));
  const over = progress > 1;
  const fill = over ? theme.danger : color ?? theme.accent;

  return (
    <View
      style={{
        height,
        borderRadius: Radius.pill,
        backgroundColor: theme.track,
        overflow: 'hidden',
      }}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: Radius.pill,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}
