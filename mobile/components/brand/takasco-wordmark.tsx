import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useFonts } from 'expo-font';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/components/ui/motion';
import {
  extrusionDepth,
  resolveVariant,
  TakascoWordmarkProps,
  WORDMARK_PALETTES,
} from '@/components/brand/takasco-wordmark-style';

// "TakasCo" yazı logosu (native). Web sürümü takasco-wordmark.web.tsx'te: aynı Outfit fontu (indirilip
// assets/fonts/Outfit-Bold.ttf olarak paketlendi — kullanıcı onayıyla), aynı renkler, tek katmanlı
// derinlik gölgesi (native'de web'deki katmanlı background-clip:text kabartması mümkün değil, ama
// aynı font + aynı renk paleti + aynı derinlik yönü ile görsel olarak en yakın karşılığı verir).
export function TakascoWordmark({ size, variant = 'auto', animate = true }: TakascoWordmarkProps) {
  const { scheme } = useAppTheme();
  const reduced = useReducedMotion();
  const [fontsLoaded] = useFonts({ 'Outfit-Bold': require('@/assets/fonts/Outfit-Bold.ttf') });
  const palette = WORDMARK_PALETTES[resolveVariant(variant, scheme)];
  const d = extrusionDepth(size);

  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!fontsLoaded) return;
    if (reduced || !animate) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fontsLoaded, animate, reduced, opacity]);

  return (
    <Animated.Text
      accessibilityRole="header"
      accessibilityLabel="TakasCo"
      style={{
        opacity: fontsLoaded ? opacity : 0,
        fontSize: size,
        lineHeight: Math.round(size * 1.22),
        fontFamily: fontsLoaded ? 'Outfit-Bold' : undefined,
        fontWeight: fontsLoaded ? undefined : '800',
        letterSpacing: -size * 0.012,
        color: palette.solid,
        textShadowColor: palette.ext[1],
        textShadowOffset: { width: d * 0.55, height: d },
        textShadowRadius: 0,
      }}
    >
      TakasCo
    </Animated.Text>
  );
}
