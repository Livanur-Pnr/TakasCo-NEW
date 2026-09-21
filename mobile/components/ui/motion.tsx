import { ComponentProps, ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleProp, ViewStyle } from 'react-native';
import { Distance, Duration, Ease } from '@/constants/motion';

// Kullanıcının işletim sisteminde "hareketi azalt" ayarı açık mı? Açıksa giriş/kaydırma animasyonları atlanır (içerik hemen görünür).
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// Aşağıdan yukarı yumuşak giriş (opaklık + kısa kayma). `delay` ile küçük sıralı (stagger) giriş yapılabilir.
export function FadeInUp({ children, delay = 0, distance = Distance.md, duration = Duration.normal, style }: { children: ReactNode; delay?: number; distance?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    Animated.timing(value, { toValue: 1, duration, delay, easing: Ease.decelerate, useNativeDriver: true }).start();
  }, [reduced, delay, duration, value]);

  return (
    <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Kaydırma ile belirme: web'de öğe görünür alana girince (IntersectionObserver) bir kez oynar, telefonda bağlandığında oynar.
// Her öğe ayrı değil, bölüm/kart grubu düzeyinde kullanılmalı.
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const node = useRef<any>(null);
  const played = useRef(false);

  useEffect(() => {
    const play = () => {
      if (played.current) return;
      played.current = true;
      Animated.timing(value, { toValue: 1, duration: Duration.slow, delay, easing: Ease.decelerate, useNativeDriver: true }).start();
    };
    if (reduced) {
      value.setValue(1);
      played.current = true;
      return;
    }
    const el = node.current as Element | null;
    if (Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined' || !el || typeof (el as any).nodeType !== 'number') {
      play();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        play();
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, delay, value]);

  return (
    <Animated.View ref={node} style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [Distance.lg, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Yüklenince yumuşakça beliren görsel. `key` değişince (yeni fotoğraf) yeniden belirir; galeri ve önizlemelerde çapraz geçiş etkisi verir.
export function FadeImage({ style, onLoad, ...rest }: ComponentProps<typeof Animated.Image>) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  return (
    <Animated.Image
      {...rest}
      style={[style, { opacity: value }]}
      onLoad={(e) => {
        Animated.timing(value, { toValue: 1, duration: reduced ? 0 : Duration.normal, easing: Ease.decelerate, useNativeDriver: true }).start();
        onLoad?.(e);
      }}
    />
  );
}

// Liste öğeleri için sıralı giriş: ilk 6 öğe 45 ms arayla belirir, sonrakiler gecikmesiz (uzun listelerde bekleme olmaz).
export function Stagger({ index, children, style }: { index: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <FadeInUp delay={Math.min(index, 5) * 45} distance={8} style={style}>{children}</FadeInUp>;
}
