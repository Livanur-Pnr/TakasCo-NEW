import { FadeInUp } from '@/components/ui/motion';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TakascoMark } from '@/components/brand/takasco-mark';
import { api } from '@/utils/api';
import * as SecureStore from '@/utils/storage';
import { usePageTitle } from '@/utils/use-page-title';
import { ActionButton, ActionStatus, FormError } from '@/components/ui/form';

const RESEND_COOLDOWN = 60; // saniye — backend'deki throttle:3,1 ile tutarlı

// Kayıt sonrası (ya da doğrulanmamış bir hesapla devam edilmeye çalışıldığında) gösterilen
// 6 haneli e-posta doğrulama kodu ekranı. utils/api.ts'teki interceptor, herhangi bir istek
// "e-posta doğrulanmadı" (403) dönerse kullanıcıyı otomatik olarak buraya yönlendirir.
export default function VerifyEmailScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('E-postanı Doğrula');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('user').then((raw) => {
      if (!raw) return;
      try {
        const user = JSON.parse(raw);
        if (user.email_verified_at) {
          router.replace('/onboarding');
          return;
        }
        setEmail(user.email ?? '');
      } catch {}
    });
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (status !== 'idle' || code.length !== 6) return;
    setErrorMsg(null);
    setStatus('loading');
    try {
      const res = await api.post('/user/verify-email-code', { code });
      if (res.data.user) await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
      setStatus('success');
      setTimeout(() => router.replace('/onboarding'), 350);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Kod doğrulanamadı.');
      setStatus('idle');
    }
  };

  const handleResend = async () => {
    if (resending || cooldown > 0) return;
    setErrorMsg(null);
    setResending(true);
    try {
      await api.post('/user/resend-verification-code');
      setCode('');
      setCooldown(RESEND_COOLDOWN);
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Kod yeniden gönderilemedi.');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/welcome');
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <FadeInUp style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brandRow}>
            <TakascoMark size={36} variant="light" />
            <ThemedText type="title" style={{ color: Brand.wordmark, fontSize: 26 }}>TakasCo</ThemedText>
          </View>

          <ThemedText type="title" style={{ fontSize: 24 }}>E-postanı doğrula</ThemedText>
          <ThemedText style={{ color: theme.textSecondary }}>
            {email ? `${email} adresine ` : 'E-posta adresine '}6 haneli bir doğrulama kodu gönderdik. Devam etmek için kodu aşağıya gir.
          </ThemedText>

          <TextInput
            value={code}
            onChangeText={(v) => { setCode(v.replace(/[^0-9]/g, '').slice(0, 6)); setErrorMsg(null); }}
            placeholder="000000"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            accessibilityLabel="Doğrulama kodu"
            style={[styles.codeInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
          />

          <FormError message={errorMsg} />

          <ActionButton
            label="Doğrula"
            loadingLabel="Doğrulanıyor…"
            status={status}
            disabled={code.length !== 6}
            onPress={handleVerify}
            arrow
          />

          <View style={styles.resendRow}>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>Kod gelmedi mi?</ThemedText>
            <ActionButton
              label={cooldown > 0 ? `Tekrar gönder (${cooldown}sn)` : 'Kodu tekrar gönder'}
              variant="outline"
              disabled={cooldown > 0}
              status={resending ? 'loading' : 'idle'}
              loadingLabel="Gönderiliyor…"
              onPress={handleResend}
              style={styles.resendButton}
            />
          </View>

          <ActionButton label="Çıkış yap" variant="secondary" onPress={handleLogout} style={{ alignSelf: 'center' }} />
        </ScrollView>
      </FadeInUp>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.six, paddingTop: Spacing.eight, gap: Spacing.five, width: '100%', maxWidth: 480, alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  codeInput: {
    borderWidth: 1,
    padding: Spacing.four,
    borderRadius: Radius.sm,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 14,
    textAlign: 'center',
  },
  resendRow: { alignItems: 'center', gap: Spacing.two },
  resendButton: { minHeight: 44 },
});
