import { forwardRef, useImperativeHandle, useState } from 'react';
import { View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/utils/api';

const SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;

export type ReCaptchaHandle = { reset: () => void };
export const RECAPTCHA_ENABLED = !!SITE_KEY;

// "Robot değilim" doğrulaması — native sürüm (iOS/Android). Google reCAPTCHA v2'nin resmi bir React Native
// SDK'sı yok; widget yalnızca tarayıcıda çalışır. Bu yüzden backend'deki /captcha sayfası (web sürümüyle aynı
// site anahtarını kullanan gerçek reCAPTCHA widget'ı) uygulama içi tarayıcı oturumunda açılır; kutu işaretlenince
// sayfa uygulamanın kendi adresine (Linking.createURL) token ile birlikte yönlendirilir ve oturum kapanır.
// Token'ın asıl doğrulaması yine backend'de AuthController::verifyRecaptcha() içinde Google'da yapılır — bu
// bileşen web sürümüyle birebir aynı güvenlik garantisini taşır, yalnızca kutunun gösterildiği yer değişir.
export const ReCaptcha = forwardRef<ReCaptchaHandle, { onChange: (token: string | null) => void }>(
  function ReCaptcha({ onChange }, ref) {
    const theme = useTheme();
    const [status, setStatus] = useState<'idle' | 'loading' | 'verified' | 'error'>('idle');

    useImperativeHandle(ref, () => ({
      reset: () => { setStatus('idle'); onChange(null); },
    }));

    if (!RECAPTCHA_ENABLED) return null;

    const verify = async () => {
      if (status === 'loading') return;
      setStatus('loading');
      try {
        const redirectUrl = Linking.createURL('captcha');
        const authUrl = `${API_BASE_URL}/captcha?redirect=${encodeURIComponent(redirectUrl)}`;
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

        if (result.type === 'success' && result.url) {
          const { queryParams } = Linking.parse(result.url);
          const token = typeof queryParams?.token === 'string' ? queryParams.token : null;
          if (token) {
            onChange(token);
            setStatus('verified');
            return;
          }
        }
        onChange(null);
        setStatus('idle');
      } catch {
        onChange(null);
        setStatus('error');
      }
    };

    const verified = status === 'verified';

    return (
      <TouchableOpacity
        onPress={verify}
        disabled={status === 'loading'}
        accessibilityRole="button"
        accessibilityLabel={verified ? 'Robot olmadığın doğrulandı' : 'Robot olmadığını doğrula'}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
          borderWidth: 1, borderColor: verified ? Brand.accent : theme.border,
          backgroundColor: verified ? (theme.backgroundSelected) : theme.inputBg,
          borderRadius: Radius.sm, padding: Spacing.three, minHeight: 52,
        }}
      >
        {verified ? (
          <IconSymbol name="checkmark.circle.fill" size={22} color={Brand.accent} />
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: theme.textSecondary }} />
        )}
        <ThemedText style={{ flex: 1, fontSize: 14, fontWeight: '600' }}>
          {status === 'loading' ? 'Doğrulanıyor…' : verified ? 'Robot değilsin, doğrulandı' : 'Ben robot değilim'}
        </ThemedText>
      </TouchableOpacity>
    );
  }
);
