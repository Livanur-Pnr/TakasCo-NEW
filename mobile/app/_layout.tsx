import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ToastProvider } from '@/components/ui/toast-provider';
import { CookieBanner } from '@/components/cookie-banner';
import { AppThemeProvider, useAppTheme } from '@/hooks/use-app-theme';
import { installWebA11yStyles } from '@/utils/web-a11y';
import { installWebMotionStyles } from '@/utils/web-motion';

installWebA11yStyles();
installWebMotionStyles();


export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}

function RootLayoutInner() {
  const { scheme } = useAppTheme();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="product/[id]/offer" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        <CookieBanner />
      </ToastProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
