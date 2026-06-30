import { Platform, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = ViewProps & { padded?: boolean };

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 1 },
  default: {},
});

export function Card({ style, padded = true, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: theme.border,
          padding: padded ? Spacing.lg : 0,
        },
        cardShadow,
        style,
      ]}
      {...rest}
    />
  );
}
