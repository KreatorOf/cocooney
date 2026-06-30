import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';

/**
 * Onglets natifs : barre Liquid Glass + minimisation au défilement sur iOS 26,
 * navigation Material 3 (indicateur + ripple) sur Android. Icônes SF Symbols
 * côté iOS, icônes Material côté Android.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <NativeTabs
      tintColor={theme.accent}
      minimizeBehavior="onScrollDown"
      rippleColor={theme.accentSoft}
      indicatorColor={theme.accentSoft}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.household')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="house.fill"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="home" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="personal">
        <NativeTabs.Trigger.Label>{t('tabs.me')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="person.fill"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="person" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="gearshape.fill"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialIcons} name="settings" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
