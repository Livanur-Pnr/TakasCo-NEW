import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import * as SecureStore from '@/utils/storage';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Google betiği yüklenemedi')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// "Google ile devam et" (yalnızca web, Google Identity Services). Google'dan gelen kimlik belirteci backend'de doğrulanır.
// EXPO_PUBLIC_GOOGLE_CLIENT_ID tanımlı değilse hiçbir şey gösterilmez.
export function GoogleSignIn() {
  const router = useRouter();
  const theme = useTheme();
  const holder = useRef<any>(null);
  const routerRef = useRef(router);
  routerRef.current = router;
  const [failed, setFailed] = useState(false);
  const enabled = Platform.OS === 'web' && !!CLIENT_ID;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const google = (window as any).google;
        if (cancelled || !google?.accounts?.id || !holder.current) return;

        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            try {
              const res = await api.post('/auth/google', { credential: response.credential });
              await SecureStore.setItemAsync('auth_token', res.data.access_token);
              await SecureStore.setItemAsync('user', JSON.stringify(res.data.user));
              routerRef.current.replace(res.data.is_new ? '/onboarding' : '/(tabs)');
            } catch (e: any) {
              Alert.alert('Hata', e.response?.data?.message || 'Google ile giriş yapılamadı.');
            }
          },
        });
        google.accounts.id.renderButton(holder.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'tr', width: 300 });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => { cancelled = true; };
  }, [enabled]);

  if (!enabled || failed) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>veya</ThemedText>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>
      <View ref={holder} style={{ alignSelf: 'center', minHeight: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, marginTop: Spacing.two },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  line: { flex: 1, height: 1 },
});
