import { StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as SecureStore from '@/utils/storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { GoogleSignIn } from '@/components/google-sign-in';
import { usePageTitle } from '@/utils/use-page-title';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Giriş Yap');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Uyarı', 'Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/login', {
        email,
        password
      });

      // Backend'den hem token hem de user verisinin geldiğini varsayıyoruz
      const { access_token, user } = response.data; 

      // 1. Token'ı sakla
      await SecureStore.setItemAsync('auth_token', access_token);
      
      // 2. Kullanıcı nesnesini string'e çevirip 'user' adıyla sakla
      await SecureStore.setItemAsync('user', JSON.stringify(user)); 

      router.replace('/(tabs)');
    } catch (error: any) {
      // Backend'den dönen hataları göster
      const errorMessage = error.response?.data?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Geri">
        <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
      </TouchableOpacity>

      <ThemedView style={styles.header}>
        <ThemedView style={styles.brandRow}>
          <Image source={require('@/assets/images/takasco-logo.png')} style={styles.logo} />
          <ThemedText type="title" style={{ color: Brand.wordmark, fontSize: 28 }}>TakasCo</ThemedText>
        </ThemedView>
        <ThemedText type="title" style={{ color: Brand.wordmark }}>Giriş Yap</ThemedText>
        <ThemedText style={styles.subtitle}>Devam etmek için hesabınıza giriş yapın</ThemedText>
      </ThemedView>

      <ThemedView style={styles.form}>
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
          <ThemedText style={styles.label}>Şifre</ThemedText>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
            placeholder="Şifreniz" 
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </ThemedView>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: loading ? theme.backgroundSelected : Brand.accent }]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Giriş Yap</ThemedText>
          )}
        </TouchableOpacity>

        <GoogleSignIn />

        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} accessibilityRole="link" style={{ alignSelf: 'center', padding: Spacing.two }}>
          <ThemedText style={{ color: Brand.accent, fontWeight: '600' }}>Şifremi unuttum</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.six },
  backButton: { marginTop: Spacing.four, marginBottom: Spacing.six },
  header: { marginBottom: Spacing.six, backgroundColor: 'transparent' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.six, backgroundColor: 'transparent' },
  logo: { width: 40, height: 40 },
  subtitle: { opacity: 0.7, marginTop: Spacing.one },
  form: { gap: Spacing.four, backgroundColor: 'transparent' },
  inputContainer: { gap: Spacing.one, backgroundColor: 'transparent' },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, padding: Spacing.three, borderRadius: Radius.sm, fontSize: 16 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center', marginTop: Spacing.two },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
