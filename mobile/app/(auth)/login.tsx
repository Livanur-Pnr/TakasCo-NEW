import { StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from '@/utils/storage';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { api } from '@/utils/api';
import { GoogleSignIn } from '@/components/google-sign-in';
import { ReCaptcha, ReCaptchaHandle, RECAPTCHA_ENABLED } from '@/components/recaptcha';
import { usePageTitle } from '@/utils/use-page-title';
import { AuthDivider, AuthHeading, AuthItem, AuthShell } from '@/components/auth/auth-shell';
import { AuthField } from '@/components/auth/auth-field';
import { ConsentCheckbox } from '@/components/auth/consent-checkbox';
import { ActionButton, ActionStatus, FormError } from '@/components/ui/form';

export default function LoginScreen() {
  const router = useRouter();
  usePageTitle('Giriş Yap');

  const passwordRef = useRef<RNTextInput>(null);
  const captchaRef = useRef<ReCaptchaHandle>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const clear = (field: string) => {
    setErrorMsg(null);
    setInvalid((prev) => prev.filter((f) => f !== field));
  };

  const handleLogin = async () => {
    if (status !== 'idle') return;
    if (!email || !password) {
      setErrorMsg('Lütfen e-posta ve şifrenizi girin.');
      setInvalid([!email ? 'email' : '', !password ? 'password' : ''].filter(Boolean));
      return;
    }
    if (!consent) {
      setErrorMsg('Devam etmek için KVKK Aydınlatma Metni\'ni ve Kullanım Koşulları\'nı kabul etmelisiniz.');
      setConsentError(true);
      return;
    }
    if (RECAPTCHA_ENABLED && !captchaToken) {
      setErrorMsg('Lütfen robot olmadığınızı doğrulayın.');
      return;
    }

    setErrorMsg(null);
    setInvalid([]);
    setStatus('loading');
    try {
      const response = await api.post('/login', {
        email,
        password,
        ...(captchaToken ? { recaptcha_token: captchaToken } : {}),
      });

      // Backend'den hem token hem de user verisinin geldiğini varsayıyoruz
      const { access_token, user } = response.data;

      // 1. Token'ı sakla
      await SecureStore.setItemAsync('auth_token', access_token);

      // 2. Kullanıcı nesnesini string'e çevirip 'user' adıyla sakla
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      setStatus('success');
      setTimeout(() => router.replace('/(tabs)'), 350);
    } catch (error: any) {
      // Backend'den dönen hataları göster
      setErrorMsg(error.response?.data?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      setInvalid(['email', 'password']);
      setStatus('idle');
      captchaRef.current?.reset();
      setCaptchaToken(null); // reCAPTCHA token'ları tek kullanımlıktır
    }
  };

  return (
    <AuthShell onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}>
      <AuthItem i={0}>
        <AuthHeading title="Tekrar hoş geldiniz" subtitle="Devam etmek için hesabınıza giriş yapın" />
      </AuthItem>

      <AuthItem i={1}>
        <AuthField
          label="E-posta"
          icon="envelope.fill"
          placeholder="E-posta adresiniz"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={(v) => { setEmail(v); clear('email'); }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          invalid={invalid.includes('email')}
        />
      </AuthItem>

      <AuthItem i={2}>
        <View style={{ gap: Spacing.two }}>
          <AuthField
            ref={passwordRef}
            label="Şifre"
            icon="lock.fill"
            placeholder="Şifreniz"
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            value={password}
            onChangeText={(v) => { setPassword(v); clear('password'); }}
            onSubmitEditing={handleLogin}
            invalid={invalid.includes('password')}
          />
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} accessibilityRole="link" style={styles.forgot}>
            <ThemedText style={styles.forgotText} {...({ dataSet: { textlink: 'true' } } as any)}>Şifremi unuttum</ThemedText>
          </TouchableOpacity>
        </View>
      </AuthItem>

      <AuthItem i={3}>
        <View style={{ gap: Spacing.three }}>
          <ConsentCheckbox checked={consent} onChange={(v) => { setConsent(v); setConsentError(false); if (v) setErrorMsg(null); }} error={consentError} />
          <ReCaptcha ref={captchaRef} onChange={setCaptchaToken} />
          <FormError message={errorMsg} />
          <ActionButton label="Giriş Yap" loadingLabel="Giriş yapılıyor…" status={status} onPress={handleLogin} arrow />
        </View>
      </AuthItem>

      <AuthItem i={4}>
        <GoogleSignIn />
      </AuthItem>

      <AuthItem i={5}>
        <View style={{ gap: Spacing.three }}>
          <AuthDivider label="Hesabınız yok mu?" />
          <ActionButton label="Kayıt Ol" variant="outline" onPress={() => router.replace('/(auth)/register')} />
        </View>
      </AuthItem>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', paddingVertical: 4, paddingLeft: Spacing.two, minHeight: 32, justifyContent: 'center' },
  forgotText: { color: Brand.accent, fontWeight: '600', fontSize: 14 },
});
