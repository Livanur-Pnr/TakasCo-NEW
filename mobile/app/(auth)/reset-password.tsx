import { useEffect, useRef, useState } from 'react';
import { TextInput as RNTextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Spacing } from '@/constants/theme';
import { TextInput } from '@/components/ui/text-input';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';
import { AuthHeading, AuthItem, AuthShell } from '@/components/auth/auth-shell';
import { AuthField } from '@/components/auth/auth-field';
import { ActionButton, ActionStatus, FormError } from '@/components/ui/form';

const RESEND_COOLDOWN = 60; // saniye — backend'deki throttle:5,1 ile tutarlı

// Şifremi unuttum'un devamı: bağlantı yerine e-postayla gelen 6 haneli kod + yeni şifre, tek ekranda.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  usePageTitle('Yeni Şifre Belirle');

  const codeRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const [email] = useState(emailParam ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    if (status !== 'idle') return;
    if (!email) {
      Alert.alert('Hata', 'E-posta adresi eksik. Şifremi unuttum ekranından tekrar dene.');
      return;
    }
    if (code.length !== 6) {
      setErrorMsg('6 haneli kodu gir.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Şifreler eşleşmiyor.');
      return;
    }
    setErrorMsg(null);
    setStatus('loading');
    try {
      await api.post('/reset-password', { email, code, password, password_confirmation: confirm });
      setStatus('success');
      setTimeout(() => {
        Alert.alert('Başarılı', 'Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.');
        router.replace('/(auth)/login');
      }, 350);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Şifre güncellenemedi.');
      setStatus('idle');
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0 || !email) return;
    setErrorMsg(null);
    setResending(true);
    try {
      await api.post('/forgot-password', { email });
      setCode('');
      setCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Kod yeniden gönderilemedi.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell>
      <AuthItem i={0}>
        <AuthHeading title="Yeni Şifre Belirle" subtitle={email ? `${email} adresine gönderdiğimiz 6 haneli kodu ve yeni şifreni gir.` : 'Yeni bir şifre seç.'} />
      </AuthItem>

      <AuthItem i={1}>
        <View style={{ gap: Spacing.two }}>
          <TextInput
            ref={codeRef}
            value={code}
            onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, '').slice(0, 6)); setErrorMsg(null); }}
            placeholder="000000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            accessibilityLabel="Doğrulama kodu"
            onSubmitEditing={() => confirmRef.current?.focus()}
            style={{
              borderWidth: 1, borderColor: theme.border, backgroundColor: theme.inputBg, color: theme.text,
              padding: Spacing.four, borderRadius: 12, fontSize: 26, fontWeight: '800', letterSpacing: 12, textAlign: 'center',
            }}
          />
        </View>
      </AuthItem>

      <AuthItem i={2}>
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
            onChangeText={(v) => { setPassword(v); setErrorMsg(null); }}
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
            onChangeText={(v) => { setConfirm(v); setErrorMsg(null); }}
            onSubmitEditing={submit}
          />
        </View>
      </AuthItem>

      <AuthItem i={3}>
        <View style={{ gap: Spacing.three }}>
          <FormError message={errorMsg} />
          <ActionButton label="Şifreyi Güncelle" loadingLabel="Güncelleniyor…" status={status} onPress={submit} arrow />
        </View>
      </AuthItem>

      <AuthItem i={4}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two }}>
          <ActionButton
            label={cooldown > 0 ? `Kodu tekrar gönder (${cooldown}sn)` : 'Kodu tekrar gönder'}
            variant="outline"
            disabled={cooldown > 0}
            status={resending ? 'loading' : 'idle'}
            loadingLabel="Gönderiliyor…"
            onPress={handleResend}
          />
        </View>
      </AuthItem>
    </AuthShell>
  );
}
