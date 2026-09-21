import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { StorefrontHeader } from '@/components/web-storefront';

export default function TabLayout() {
  const theme = useTheme();
  const isDesktopWeb = useIsDesktopWeb();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Brand.accent,
        tabBarStyle: isDesktopWeb ? { display: 'none' } : { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
        headerShown: isDesktopWeb,
        header: () => <StorefrontHeader />,
        tabBarButton: HapticTab,
        animation: 'fade',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Keşfet',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Ekle',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: 'Tekliflerim',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.left.arrow.right" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
