import { TextInput as RNTextInput, View } from 'react-native';
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from '@/utils/storage';
import { Spacing } from '@/constants/theme';
import { api } from '@/utils/api';
import { GoogleSignIn } from '@/components/google-sign-in';
import { usePageTitle } from '@/utils/use-page-title';
import { AuthDivider, AuthHeading, AuthItem, AuthShell } from '@/components/auth/auth-shell';
import { AuthField } from '@/components/auth/auth-field';
import { ActionButton, ActionStatus, FormError } from '@/components/ui/form';

export default function RegisterScreen() {
  const router = useRouter();
  usePageTitle('Kayıt Ol');

  const emailRef = useRef<RNTextInput>(null);
  const phoneRef = useRef<RNTextInput>(null);
  const passwordRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string[]>([]);

  const clear = (field: string) => {
    setErrorMsg(null);
    setInvalid((prev) => prev.filter((f) => f !== field));
  };

  const handleRegister = async () => {
    if (status !== 'idle') return;
    if (!name || !email || !phoneNumber || !password || !passwordConfirmation) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      setInvalid([
        !name ? 'name' : '', !email ? 'email' : '', !phoneNumber ? 'phone_number' : '',
        !password ? 'password' : '', !passwordConfirmation ? 'confirm' : '',
      ].filter(Boolean));
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMsg('Şifreler eşleşmiyor.');
      setInvalid(['password', 'confirm']);
      return;
    }

    setErrorMsg(null);
    setInvalid([]);
    setStatus('loading');
    try {
      const response = await api.post('/register', {
        name,
        email,
        phone_number: phoneNumber,
        password,
        password_confirmation: passwordConfirmation
      });

      const { access_token, user } = response.data;

      await SecureStore.setItemAsync('auth_token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));

      setStatus('success');
      setTimeout(() => router.replace('/verify-email'), 350); // kayıt sonrası e-posta doğrulama kodu zorunlu, sonrasında onboarding'e geçilir
    } catch (error: any) {
      console.error(error.response?.data);
      let errorMessage = 'Kayıt başarısız.';
      if (error.response?.data) {
        // Backend'den gelen validation hatalarını formatlayalım
        const data = error.response.data;
        if (typeof data === 'object' && !data.message) {
            errorMessage = Object.values(data).flat().join('\n');
            setInvalid(Object.keys(data));
        } else if (data.message) {
            errorMessage = data.message;
            if (data.errors && typeof data.errors === 'object') setInvalid(Object.keys(data.errors));
        }
      }
      setErrorMsg(errorMessage);
      setStatus('idle');
    }
  };

  return (
    <AuthShell onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}>
      <AuthItem i={0}>
        <AuthHeading title="Hesabınızı oluşturun" subtitle="Takas topluluğuna katılın, eşyalarınıza yeni bir hayat verin" />
      </AuthItem>

      <AuthItem i={1}>
        <View style={{ gap: Spacing.four }}>
          <AuthField
            label="Ad Soyad"
            icon="person.fill"
            placeholder="Adınız Soyadınız"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            value={name}
            onChangeText={(v) => { setName(v); clear('name'); }}
            onSubmitEditing={() => emailRef.current?.focus()}
            invalid={invalid.includes('name')}
          />
          <AuthField
            ref={emailRef}
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
            onSubmitEditing={() => phoneRef.current?.focus()}
            invalid={invalid.includes('email')}
          />
          <AuthField
            ref={phoneRef}
            label="Telefon Numarası"
            icon="phone.fill"
            placeholder="5XX XXX XX XX"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            value={phoneNumber}
            onChangeText={(v) => { setPhoneNumber(v); clear('phone_number'); }}
            onSubmitEditing={() => passwordRef.current?.focus()}
            invalid={invalid.includes('phone_number')}
          />
        </View>
      </AuthItem>

      <AuthItem i={2}>
        <View style={{ gap: Spacing.four }}>
          <AuthField
            ref={passwordRef}
            label="Şifre"
            icon="lock.fill"
            placeholder="Şifreniz"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            value={password}
            onChangeText={(v) => { setPassword(v); clear('password'); }}
            onSubmitEditing={() => confirmRef.current?.focus()}
            invalid={invalid.includes('password')}
          />
          <AuthField
            ref={confirmRef}
            label="Şifre (Tekrar)"
            icon="lock.fill"
            placeholder="Şifrenizi tekrar girin"
            secure
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            value={passwordConfirmation}
            onChangeText={(v) => { setPasswordConfirmation(v); clear('confirm'); }}
            onSubmitEditing={handleRegister}
            invalid={invalid.includes('confirm')}
          />
        </View>
      </AuthItem>

      <AuthItem i={3}>
        <View style={{ gap: Spacing.three }}>
          <FormError message={errorMsg} />
          <ActionButton label="Kayıt Ol" loadingLabel="Hesap oluşturuluyor…" status={status} onPress={handleRegister} arrow />
        </View>
      </AuthItem>

      <AuthItem i={4}>
        <GoogleSignIn />
      </AuthItem>

      <AuthItem i={5}>
        <View style={{ gap: Spacing.three }}>
          <AuthDivider label="Zaten hesabınız var mı?" />
          <ActionButton label="Giriş Yap" variant="outline" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </AuthItem>
    </AuthShell>
  );
}
