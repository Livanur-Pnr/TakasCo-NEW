import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, LayoutChangeEvent, Pressable, StyleSheet, TouchableOpacityProps } from 'react-native';
import { Duration, Ease, Interaction, Shadow } from '@/constants/motion';

// Uygulamadaki tüm düğmelerin ortak, animasyonlu hâli. `TouchableOpacity` ile aynı özellikleri kabul eder (onPress, style,
// disabled, hitSlop, activeOpacity, erişilebilirlik özellikleri…) ve `react-native`'in TouchableOpacity'sinin yerine kullanılır.
//
// Hareket hiyerarşisi (boyuta göre otomatik):
//   ikon düğmeleri (≤ 48 px)   → çok hafif büyüme (hover), kısa basma geri bildirimi
//   düğme/çip (≤ 320 px)       → 1 px yükselme + (dolgulu düğmede) gölge, basınca ölçek 0.97
//   geniş satır (> 320 px)     → hover'da renk tonu, basınca 0.99
//   `hoverLift` (kartlar)      → 3 px yükselme + gölge
//   ekran boyutlu alanlar      → hareket yok, yalnızca opaklık
// Yalnızca transform + opacity animasyonu yapılır; yaylı/zıplayan efekt yoktur. "Hareketi azalt" açıkken transform kapanır,
// opaklık geri bildirimi kalır. Hover yalnızca fare kullanılan cihazlarda tetiklenir; dokunmatikte basma durumu kullanılır.

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceMotion = v; }).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reduceMotion = v; });

type Kind = 'icon' | 'button' | 'row' | 'still';

function classify(w: number, h: number): Kind {
  if (w === 0) return 'button';
  if (w > 600 || h > 480) return 'still';
  if (w <= 48 && h <= 48) return 'icon';
  if (w > 320 && h <= 120) return 'row';
  return 'button';
}

// motionKind: ölçüye göre seçilen hareketi zorlar (ör. geniş ama tek başına duran ana CTA → 'button')
type Props = TouchableOpacityProps & { hoverLift?: boolean; motionKind?: Kind; onHoverIn?: () => void; onHoverOut?: () => void };

export function TouchableOpacity({ style, activeOpacity = 0.7, disabled, hoverLift, motionKind, onPressIn, onPressOut, onLayout, onHoverIn, onHoverOut, children, ...rest }: Props) {
  const kind = useRef<Kind>('button');
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const hovered = useRef(false);
  const [hover, setHover] = useState(false);

  // stilde tanımlı opaklık/dönüşüm (ör. devre dışı görünümü, döndürülmüş ikon) korunur
  const { opacity: baseOpacity, transform: baseTransform, ...flat } = (StyleSheet.flatten(style) ?? {}) as any;
  const opacity = useMemo(() => Animated.multiply(press, typeof baseOpacity === 'number' ? baseOpacity : 1), [press, baseOpacity]);
  const filled = !!flat.backgroundColor && flat.backgroundColor !== 'transparent';

  const animate = (s: number, y: number, o: number, duration: number = Duration.micro) => {
    Animated.parallel([
      Animated.timing(scale, { toValue: reduceMotion ? 1 : s, duration, easing: Ease.standard, useNativeDriver: true }),
      Animated.timing(lift, { toValue: reduceMotion ? 0 : y, duration, easing: Ease.standard, useNativeDriver: true }),
      Animated.timing(press, { toValue: o, duration, easing: Ease.standard, useNativeDriver: true }),
    ]).start();
  };

  const restTarget = () => {
    if (!hovered.current) return { s: 1, y: 0 };
    if (hoverLift) return { s: 1, y: Interaction.liftCard };
    if (kind.current === 'icon') return { s: Interaction.hoverIcon, y: 0 };
    if (kind.current === 'button') return { s: 1, y: Interaction.liftButton };
    return { s: 1, y: 0 };
  };

  // hover tonu: geniş satırlar ve kartlar (hoverLift olmayan) için, dolgusuz öğelerde de görünür
  const tint = hover && !disabled && (kind.current === 'row') ? ({ boxShadow: 'inset 0 0 0 999px rgba(28, 120, 72, 0.06)' } as any) : null;
  const raised = hover && !disabled && (hoverLift || (kind.current === 'button' && filled)) ? ({ boxShadow: hoverLift ? Shadow.card : Shadow.button } as any) : null;

  return (
    <AnimatedPressableBase
      {...(rest as any)}
      {...({ dataSet: { ...((rest as any).dataSet ?? {}), animated: 'true' } } as any)}
      disabled={disabled}
      onLayout={(e: LayoutChangeEvent) => {
        kind.current = motionKind ?? classify(e.nativeEvent.layout.width, e.nativeEvent.layout.height);
        onLayout?.(e);
      }}
      onHoverIn={() => {
        if (disabled) return;
        hovered.current = true;
        setHover(true);
        const t = restTarget();
        animate(t.s, t.y, 1, Duration.fast);
        onHoverIn?.();
      }}
      onHoverOut={() => {
        hovered.current = false;
        setHover(false);
        animate(1, 0, 1, Duration.fast);
        onHoverOut?.();
      }}
      onPressIn={(e: any) => {
        if (!disabled) {
          const pressScale = hoverLift || kind.current === 'row' ? Interaction.pressRow : kind.current === 'icon' ? Interaction.pressIcon : kind.current === 'still' ? 1 : Interaction.pressButton;
          animate(pressScale, hoverLift ? Interaction.liftCard / 3 : 0, activeOpacity);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        const t = restTarget();
        animate(t.s, t.y, 1);
        onPressOut?.(e);
      }}
      style={[
        flat,
        { opacity, transform: [...(baseTransform ?? []), { translateY: lift }, { scale }] },
        tint,
        raised,
      ]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
