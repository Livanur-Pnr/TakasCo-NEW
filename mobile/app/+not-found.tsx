import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { StorefrontHeader } from '@/components/web-storefront';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { useTheme } from '@/hooks/use-theme';
import { usePageTitle } from '@/utils/use-page-title';

export default function NotFoundScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Sayfa bulunamadı');
  const isDesktopWeb = useIsDesktopWeb();

  return (
    <ThemedView style={styles.container}>
      {isDesktopWeb && <StorefrontHeader />}
      <View style={styles.content}>
        <IconSymbol name="magnifyingglass" size={64} color={theme.textSecondary} />
        <ThemedText style={[styles.code, { color: Brand.accent }]}>404</ThemedText>
        <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark, textAlign: 'center' }}>Aradığın sayfayı bulamadık</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', maxWidth: 420 }}>
          Bağlantı hatalı olabilir ya da bu sayfa kaldırılmış olabilir. Ana sayfaya dönüp ilanlara göz atabilirsin.
        </ThemedText>
        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.button, { backgroundColor: Brand.accent }]} onPress={() => router.replace('/(tabs)')} accessibilityRole="button">
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Ana Sayfaya Dön</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.backgroundSelected }]} onPress={() => router.replace('/(tabs)/search')} accessibilityRole="button">
            <ThemedText style={{ fontWeight: '700' }}>İlanları Keşfet</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.six },
  code: { fontSize: 48, fontWeight: '800', lineHeight: 52 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.three, marginTop: Spacing.three },
  button: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full },
});
