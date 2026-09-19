import { StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePageTitle } from '@/utils/use-page-title';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Hoş geldin');

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <Image source={require('@/assets/images/takasco-logo.png')} style={styles.logo} />
        <ThemedText type="title" style={[styles.title, { color: Brand.wordmark }]}>TakasCo</ThemedText>
        <ThemedText style={styles.subtitle}>Eşyalarınızı kolayca takas edin, yenilerini keşfedin ve israfı önleyin.</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: Brand.accent }]} 
          onPress={() => router.push('/(auth)/login')}>
          <ThemedText style={styles.buttonText}>Giriş Yap</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.buttonOutline, { borderColor: theme.border }]} 
          onPress={() => router.push('/(auth)/register')}>
          <ThemedText style={[styles.buttonOutlineText, { color: theme.text }]}>Kayıt Ol</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  logo: { width: 96, height: 96, marginBottom: Spacing.four },
  title: { textAlign: 'center', marginBottom: Spacing.three, fontSize: 40 },
  subtitle: { textAlign: 'center', opacity: 0.7 },
  footer: { gap: Spacing.three, paddingBottom: Spacing.six, backgroundColor: 'transparent' },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonOutline: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1 },
  buttonOutlineText: { fontWeight: 'bold', fontSize: 16 }
});
