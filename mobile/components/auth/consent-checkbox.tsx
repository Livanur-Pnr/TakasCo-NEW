import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { TouchableOpacity } from '@/components/ui/touchable';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Giriş ve kayıt ekranlarında zorunlu KVKK/Kullanım Koşulları onayı. İşaretlenmeden gönderim engellenir
// (bkz. login.tsx/register.tsx handleLogin/handleRegister); `error` doğrulama başarısız olunca kırmızı çerçeve gösterir.
// Kutucuk ile metin içindeki bağlantılar ayrı dokunma alanlarıdır (iç içe Pressable'larda RN'de olay çakışması olabildiğinden).
export function ConsentCheckbox({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.sm, borderWidth: error ? 1 : 0, borderColor: Brand.danger }}>
      <TouchableOpacity
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="KVKK Aydınlatma Metni'ni ve Kullanım Koşulları'nı okudum, kabul ediyorum"
        style={{ padding: 2 }}
      >
        {checked ? (
          <IconSymbol name="checkmark.circle.fill" size={22} color={Brand.accent} />
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: error ? Brand.danger : theme.textSecondary }} />
        )}
      </TouchableOpacity>
      <ThemedText onPress={() => onChange(!checked)} style={{ flex: 1, fontSize: 13, lineHeight: 19, color: theme.textSecondary }}>
        <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }} onPress={() => router.push('/kvkk')} accessibilityRole="link">
          KVKK Aydınlatma Metni
        </ThemedText>
        {"'ni ve "}
        <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }} onPress={() => router.push('/terms')} accessibilityRole="link">
          Kullanım Koşulları
        </ThemedText>
        {"'nı okudum, kabul ediyorum."}
      </ThemedText>
    </View>
  );
}
