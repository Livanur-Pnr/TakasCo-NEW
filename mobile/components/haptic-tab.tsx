import * as Haptics from 'expo-haptics';
// SDK 56'dan itibaren expo-router, uygulama kodunda doğrudan @react-navigation/* paketlerinden
// içe aktarmayı desteklemiyor (kendi vendor'ladığı kopyayla çakışıyor, bkz. docs.expo.dev/router/migrate/sdk-55-to-56).
// Bunun yerine expo-router'ın kendi genel giriş noktaları kullanılır.
import { PlatformPressable } from 'expo-router/react-navigation';
import { BottomTabBarButtonProps } from 'expo-router/js-tabs';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
