import { StyleSheet, ScrollView } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from '@/utils/storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/utils/api';
import { GoogleSignIn } from '@/components/google-sign-in';
import { usePageTitle } from '@/utils/use-page-title';
import { FadeInUp } from '@/components/ui/motion';
import { ActionButton, ActionStatus, FormError, PasswordInput } from '@/components/ui/form';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Kayıt Ol');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !phoneNumber || !password || !passwordConfirmation) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMsg('Şifreler eşleşmiyor.');
      return;
    }

    setErrorMsg(null);
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
      setTimeout(() => router.replace('/onboarding'), 450); // yeni üyeye tek seferlik ilgi alanı/şehir sorusu (atlanabilir)
    } catch (error: any) {
      console.error(error.response?.data);
      let errorMessage = 'Kayıt başarısız.';
      if (error.response?.data) {
        // Backend'den gelen validation hatalarını formatlayalım
        const data = error.response.data;
        if (typeof data === 'object' && !data.message) {
            errorMessage = Object.values(data).flat().join('\n');
        } else if (data.message) {
            errorMessage = data.message;
        }
      }
      setErrorMsg(errorMessage);
      setStatus('idle');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: Spacing.six }}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Geri">
        <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
      </TouchableOpacity>

      <FadeInUp>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={{ color: Brand.wordmark }}>Kayıt Ol</ThemedText>
        <ThemedText style={styles.subtitle}>Yeni bir hesap oluşturun</ThemedText>
      </ThemedView>
      </FadeInUp>

      <FadeInUp delay={90}>
      <ThemedView style={styles.form}>
        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Ad Soyad</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Adınız Soyadınız" 
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>E-posta</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="E-posta adresiniz" 
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </ThemedView>
        
        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Telefon Numarası</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="5XX XXX XX XX" 
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Şifre</ThemedText>
          <PasswordInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder="Şifreniz"
            value={password}
            onChangeText={(v) => { setPassword(v); setErrorMsg(null); }}
            error={!!errorMsg}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Şifre (Tekrar)</ThemedText>
          <PasswordInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder="Şifrenizi tekrar girin"
            value={passwordConfirmation}
            onChangeText={(v) => { setPasswordConfirmation(v); setErrorMsg(null); }}
            error={!!errorMsg}
          />
        </ThemedView>

        <FormError message={errorMsg} />

        <ActionButton label="Kayıt Ol" status={status} onPress={handleRegister} />
        <GoogleSignIn />
      </ThemedView>
      </FadeInUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: { marginTop: Spacing.four, marginBottom: Spacing.six },
  header: { marginBottom: Spacing.six, backgroundColor: 'transparent' },
  subtitle: { opacity: 0.7, marginTop: Spacing.one },
  form: { gap: Spacing.four, backgroundColor: 'transparent', paddingBottom: 40 },
  inputContainer: { gap: Spacing.one, backgroundColor: 'transparent' },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center', marginTop: Spacing.two },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
