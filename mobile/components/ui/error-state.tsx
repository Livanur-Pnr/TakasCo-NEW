import { StyleSheet } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FadeInUp } from '@/components/ui/motion';

// Ağ/sunucu hatalarını "sonuç yok" boş durumlarından ayırmak için ortak bileşen.
// Kullanıcıya gerçek sebebi anlatır ve tekrar denemesi için bir yol verir.
export function ErrorState({
  message = 'Bir şeyler ters gitti. Lütfen tekrar dene.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();

  return (
    <FadeInUp style={styles.container}>
      <IconSymbol name="exclamationmark.triangle.fill" size={48} color={Brand.warning} />
      <ThemedText style={[styles.message, { color: theme.textSecondary }]}>{message}</ThemedText>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: Brand.accent }]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Tekrar dene"
        >
          <IconSymbol name="arrow.clockwise" size={16} color="#fff" />
          <ThemedText style={styles.retryText}>Tekrar Dene</ThemedText>
        </TouchableOpacity>
      )}
    </FadeInUp>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.eight, gap: Spacing.three },
  message: { textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.five, paddingVertical: Spacing.three, borderRadius: Radius.full, marginTop: Spacing.two },
  retryText: { color: '#fff', fontWeight: 'bold' },
});
