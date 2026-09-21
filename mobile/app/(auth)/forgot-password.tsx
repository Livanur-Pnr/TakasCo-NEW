import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Şifremi Unuttum');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      Alert.alert('Uyarı', 'E-posta adresini gir.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'İstek gönderilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Geri">
        <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
      </TouchableOpacity>

      <ThemedText type="title" style={{ color: Brand.wordmark }}>Şifremi Unuttum</ThemedText>

      {sent ? (
        <>
          <ThemedText style={{ color: theme.textSecondary, lineHeight: 22 }}>
            Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Bağlantı kısa süre içinde geçerliliğini yitirir; e-postayı görmezsen gereksiz klasörünü de kontrol et.
          </ThemedText>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} accessibilityRole="button" style={[styles.button, { backgroundColor: Brand.accent }]}>
            <ThemedText style={styles.buttonText}>Giriş Sayfasına Dön</ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ThemedText style={{ color: theme.textSecondary }}>Hesabına bağlı e-posta adresini gir, sana şifreni yenilemen için bir bağlantı gönderelim.</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder="E-posta adresin"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={submit}
            accessibilityLabel="E-posta"
          />
          <TouchableOpacity onPress={submit} disabled={loading} accessibilityRole="button" style={[styles.button, { backgroundColor: loading ? theme.backgroundSelected : Brand.accent }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Bağlantı Gönder</ThemedText>}
          </TouchableOpacity>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six, gap: Spacing.four },
  back: { marginTop: Spacing.four, marginBottom: Spacing.two },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
