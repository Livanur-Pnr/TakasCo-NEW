import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';
import { AuthHeading, AuthItem, AuthShell } from '@/components/auth/auth-shell';
import { AuthField } from '@/components/auth/auth-field';
import { ActionButton } from '@/components/ui/form';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Şifremi Unuttum');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (loading) return;
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
    <AuthShell onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}>
      <AuthItem i={0}>
        <AuthHeading title="Şifremi Unuttum" subtitle={sent ? undefined : 'Hesabına bağlı e-posta adresini gir, sana şifreni yenilemen için bir bağlantı gönderelim.'} />
      </AuthItem>

      {sent ? (
        <>
          <AuthItem i={1}>
            <ThemedText style={{ color: theme.textSecondary, lineHeight: 22 }}>
              Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Bağlantı kısa süre içinde geçerliliğini yitirir; e-postayı görmezsen gereksiz klasörünü de kontrol et.
            </ThemedText>
          </AuthItem>
          <AuthItem i={2}>
            <ActionButton label="Giriş Sayfasına Dön" onPress={() => router.replace('/(auth)/login')} arrow />
          </AuthItem>
        </>
      ) : (
        <>
          <AuthItem i={1}>
            <AuthField
              label="E-posta"
              icon="envelope.fill"
              placeholder="E-posta adresin"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={submit}
            />
          </AuthItem>
          <AuthItem i={2}>
            <ActionButton label="Bağlantı Gönder" loadingLabel="Gönderiliyor…" status={loading ? 'loading' : 'idle'} onPress={submit} arrow />
          </AuthItem>
        </>
      )}
    </AuthShell>
  );
}
