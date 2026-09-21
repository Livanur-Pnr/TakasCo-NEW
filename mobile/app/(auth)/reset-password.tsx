import { useRef, useState } from 'react';
import { TextInput as RNTextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Spacing } from '@/constants/theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';
import { AuthHeading, AuthItem, AuthShell } from '@/components/auth/auth-shell';
import { AuthField } from '@/components/auth/auth-field';
import { ActionButton } from '@/components/ui/form';

// E-postadaki bağlantı buraya gelir: /reset-password?token=...&email=...
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();
  usePageTitle('Yeni Şifre Belirle');

  const confirmRef = useRef<RNTextInput>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
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
    <AuthShell>
      <AuthItem i={0}>
        <AuthHeading title="Yeni Şifre Belirle" subtitle={email ? `${email} hesabı için yeni bir şifre seç.` : 'Yeni bir şifre seç.'} />
      </AuthItem>
      <AuthItem i={1}>
        <View style={{ gap: Spacing.four }}>
          <AuthField
            label="Yeni şifre"
            icon="lock.fill"
            placeholder="En az 8 karakter"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <AuthField
            ref={confirmRef}
            label="Yeni şifre (tekrar)"
            icon="lock.fill"
            placeholder="Şifreyi tekrar girin"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={submit}
          />
        </View>
      </AuthItem>
      <AuthItem i={2}>
        <ActionButton label="Şifreyi Güncelle" loadingLabel="Güncelleniyor…" status={loading ? 'loading' : 'idle'} onPress={submit} arrow />
      </AuthItem>
    </AuthShell>
  );
}
