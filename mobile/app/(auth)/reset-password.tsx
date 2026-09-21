import { FadeInUp } from '@/components/ui/motion';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { PasswordInput } from '@/components/ui/form';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';

// E-postadaki bağlantı buraya gelir: /reset-password?token=...&email=...
export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();
  usePageTitle('Yeni Şifre Belirle');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token || !email) {
      Alert.alert('Hata', 'Bağlantı geçersiz. Yeni bir şifre sıfırlama bağlantısı iste.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Uyarı', 'Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Uyarı', 'Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/reset-password', { token, email, password, password_confirmation: confirm });
      Alert.alert('Başarılı', 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.');
      router.replace('/(auth)/login');
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <FadeInUp style={styles.container}>
      <ThemedText type="title" style={{ color: Brand.wordmark }}>Yeni Şifre Belirle</ThemedText>
      <ThemedText style={{ color: theme.textSecondary }}>{email ? `${email} hesabı için yeni bir şifre seç.` : 'Yeni bir şifre seç.'}</ThemedText>
      <PasswordInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        placeholder="Yeni şifre (en az 8 karakter)"
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Yeni şifre"
      />
      <PasswordInput
        style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        placeholder="Yeni şifre (tekrar)"
        value={confirm}
        onChangeText={setConfirm}
        onSubmitEditing={submit}
        accessibilityLabel="Yeni şifre tekrar"
      />
      <TouchableOpacity onPress={submit} disabled={loading} accessibilityRole="button" style={[styles.button, { backgroundColor: loading ? theme.backgroundSelected : Brand.accent }]}>
        {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Şifreyi Güncelle</ThemedText>}
      </TouchableOpacity>
      </FadeInUp>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six, paddingTop: Spacing.eight, gap: Spacing.four },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
