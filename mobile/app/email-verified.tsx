import { StyleSheet } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePageTitle } from '@/utils/use-page-title';

// E-postadaki doğrulama bağlantısı sunucuda hesabı doğrular ve buraya yönlendirir
export default function EmailVerifiedScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('E-posta Doğrulandı');

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={{ fontSize: 48 }}>✓</ThemedText>
      <ThemedText type="title" style={{ color: Brand.wordmark, textAlign: 'center' }}>E-posta adresin doğrulandı</ThemedText>
      <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Profilinde E-posta Doğrulandı rozeti görünecek.</ThemedText>
      <TouchableOpacity onPress={() => router.replace('/(tabs)')} accessibilityRole="button" style={[styles.button, { backgroundColor: Brand.accent }]}>
        <ThemedText style={styles.buttonText}>Ana Sayfaya Git</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.six, gap: Spacing.four },
  button: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.four, borderRadius: Radius.sm },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
