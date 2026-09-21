import { StyleSheet, Image, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FadeInUp } from '@/components/ui/motion';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePageTitle } from '@/utils/use-page-title';

const POINTS = ['Takas et', 'Keşfet', 'İsrafı önle'];

// Karşılama ekranı: logo → başlık → açıklama → özellik çipleri → düğmeler sırayla belirir (toplam ~0.5 sn).
export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Hoş geldin');

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <FadeInUp>
          <Image source={require('@/assets/images/takasco-logo.png')} style={styles.logo} />
        </FadeInUp>
        <FadeInUp delay={80}>
          <ThemedText type="title" style={[styles.title, { color: Brand.wordmark }]}>TakasCo</ThemedText>
        </FadeInUp>
        <FadeInUp delay={140}>
          <ThemedText style={styles.subtitle}>Eşyalarınızı kolayca takas edin, yenilerini keşfedin ve israfı önleyin.</ThemedText>
        </FadeInUp>
        <FadeInUp delay={200} style={styles.points}>
          {POINTS.map((p) => (
            <View key={p} style={[styles.point, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={Brand.accent} />
              <ThemedText style={{ fontSize: 13, fontWeight: '600' }}>{p}</ThemedText>
            </View>
          ))}
        </FadeInUp>
      </ThemedView>

      <FadeInUp delay={260}>
        <ThemedView style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: Brand.accent }]}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            hoverLift
          >
            <ThemedText style={styles.buttonText}>Giriş Yap</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonOutline, { borderColor: theme.border }]}
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="button"
            hoverLift
          >
            <ThemedText style={[styles.buttonOutlineText, { color: theme.text }]}>Kayıt Ol</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </FadeInUp>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  logo: { width: 96, height: 96, marginBottom: Spacing.four },
  title: { textAlign: 'center', marginBottom: Spacing.three, fontSize: 40 },
  subtitle: { textAlign: 'center', opacity: 0.7 },
  points: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.five },
  point: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1 },
  footer: { gap: Spacing.three, paddingBottom: Spacing.six, backgroundColor: 'transparent' },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonOutline: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1 },
  buttonOutlineText: { fontWeight: 'bold', fontSize: 16 },
});
