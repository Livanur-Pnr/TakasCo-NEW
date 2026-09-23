import { Text } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { FadeInUp } from '@/components/ui/motion';
import {
  extrusionDepth,
  resolveVariant,
  TakascoWordmarkProps,
  WORDMARK_PALETTES,
} from '@/components/brand/takasco-wordmark-style';

// "TakasCo" yazı logosu (native). Web sürümü takasco-wordmark.web.tsx'te: Outfit fontu, katmanlı kabartma ve ışık animasyonu.
// Native'de Outfit paketli değil; aynı renkler ve tek katmanlı derinlik gölgesiyle sistem fontu kullanılır.
export function TakascoWordmark({ size, variant = 'auto', animate = true }: TakascoWordmarkProps) {
  const { scheme } = useAppTheme();
  const palette = WORDMARK_PALETTES[resolveVariant(variant, scheme)];
  const d = extrusionDepth(size);

  const text = (
    <Text
      accessibilityRole="header"
      accessibilityLabel="TakasCo"
      style={{
        fontSize: size,
        lineHeight: Math.round(size * 1.2),
        fontWeight: '800',
        letterSpacing: -size * 0.012,
        color: palette.solid,
        textShadowColor: palette.ext[1],
        textShadowOffset: { width: d * 0.55, height: d },
        textShadowRadius: 0,
      }}
    >
      TakasCo
    </Text>
  );

  return animate ? <FadeInUp distance={6}>{text}</FadeInUp> : text;
}
