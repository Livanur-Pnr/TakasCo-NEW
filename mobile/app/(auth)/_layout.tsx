import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { Radius, Spacing } from '@/constants/theme';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const isDesktopWeb = useIsDesktopWeb();
  const theme = useTheme();

  const stack = <Stack screenOptions={{ headerShown: false }} />;

  // Masaüstünde form ekranları 1400px boyunca uzanmasın: ortalanmış, dar bir kart
  if (!isDesktopWeb) return stack;

  return (
    <View style={[styles.page, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>{stack}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.six },
  card: {
    width: '100%', maxWidth: 480, height: 780, maxHeight: '100%',
    borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
  },
});
