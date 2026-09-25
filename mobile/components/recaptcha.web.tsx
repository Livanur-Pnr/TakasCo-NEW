import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

const SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;
const SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js';
const CALLBACK_NAME = '__takascoRecaptchaLoaded';

let scriptPromise: Promise<void> | null = null;
function loadRecaptchaScript(): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      (window as any)[CALLBACK_NAME] = () => resolve();
      const s = document.createElement('script');
      s.src = `${SCRIPT_SRC}?onload=${CALLBACK_NAME}&render=explicit`;
      s.async = true;
      s.defer = true;
      s.onerror = () => { scriptPromise = null; reject(new Error('reCAPTCHA betiği yüklenemedi')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export type ReCaptchaHandle = { reset: () => void };
export const RECAPTCHA_ENABLED = Platform.OS === 'web' && !!SITE_KEY;

// "Robot değilim" doğrulaması — web sürümü (Google reCAPTCHA v2 checkbox, sayfaya gömülü). Native sürüm: recaptcha.tsx.
// EXPO_PUBLIC_RECAPTCHA_SITE_KEY tanımlı değilse hiçbir şey gösterilmez ve doğrulama backend'de de istenmez
// (bkz. RECAPTCHA_ENABLED, AuthController::login).
export const ReCaptcha = forwardRef<ReCaptchaHandle, { onChange: (token: string | null) => void }>(
  function ReCaptcha({ onChange }, ref) {
    const holder = useRef<any>(null);
    const widgetId = useRef<number | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    // Google widget'ı oluşturulduktan sonra teması değiştirilemez; açılıştaki temayla çizilir
    const { scheme } = useAppTheme();
    const themeRef = useRef(scheme);
    themeRef.current = scheme;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetId.current !== null) (window as any).grecaptcha?.reset(widgetId.current);
      },
    }));

    useEffect(() => {
      if (!RECAPTCHA_ENABLED) return;
      let cancelled = false;

      loadRecaptchaScript()
        .then(() => {
          const grecaptcha = (window as any).grecaptcha;
          if (cancelled || !grecaptcha || !holder.current || widgetId.current !== null) return;
          widgetId.current = grecaptcha.render(holder.current, {
            sitekey: SITE_KEY,
            theme: themeRef.current === 'dark' ? 'dark' : 'light',
            callback: (token: string) => onChangeRef.current(token),
            'expired-callback': () => onChangeRef.current(null),
            'error-callback': () => onChangeRef.current(null),
          });
        })
        .catch(() => {});

      return () => { cancelled = true; };
    }, []);

    if (!RECAPTCHA_ENABLED) return null;

    return <View ref={holder} style={{ alignSelf: 'center', marginTop: 4 }} />;
  }
);
