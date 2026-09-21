import { ReactNode, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useReducedMotion } from '@/components/ui/motion';
import { Brand, Radius } from '@/constants/theme';
import { Ease } from '@/constants/motion';

// Vitrindeki "takas okları" görseli. Fare oklara gelince (dokunmatikte dokununca) oklar bir tam tur döner ve daire hafifçe büyür;
// tur birikir (geri sarmaz). Çevrede yavaş yayılan halkalar, dönen kesikli takas halkası ve süzülen ürün kartları vardır.
// Sürekli hareketler yalnızca CSS transform/opacity ile (utils/web-motion.ts) ve "hareketi azalt" açıkken durur; dönüş yalnızca etkileşimle olur.

const web = Platform.OS === 'web';
const css = (style: object) => (web ? (style as any) : null);
const data = (key: string, value: string) => ({ dataSet: { [key]: value } } as any);

function SpinCircle({ size, children }: { size: number; children?: ReactNode }) {
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(0)).current;
  const turns = useRef(0);

  const spin = () => {
    if (reduced) return;
    turns.current += 1;
    Animated.timing(turn, { toValue: turns.current, duration: 900, easing: Ease.emphasized, useNativeDriver: true }).start();
  };
  const scaleTo = (v: number) => {
    if (reduced) return;
    Animated.timing(grow, { toValue: v, duration: 260, easing: Ease.standard, useNativeDriver: true }).start();
  };

  return (
    <Pressable
      accessible={false}
      onHoverIn={() => { spin(); scaleTo(1); }}
      onHoverOut={() => scaleTo(0)}
      onPress={spin}
      style={{ cursor: 'default' as any }}
    >
      <Animated.View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
          css({ backgroundImage: 'linear-gradient(145deg, #3fd68d 0%, #1B7A43 55%, #146c3a 100%)', boxShadow: '0 24px 50px rgba(0, 0, 0, 0.30), inset 0 2px 0 rgba(255, 255, 255, 0.30)' }),
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'], extrapolate: 'extend' }) }] }}>
          <IconSymbol name="arrow.left.arrow.right" size={size * 0.44} color="#ffffff" />
        </Animated.View>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function Satellite({ icon, tint, bg, left, top, rotate, motion }: { icon: 'tshirt.fill' | 'book.fill' | 'desktopcomputer' | 'sportscourt.fill'; tint: string; bg: string; left: number; top: number; rotate: string; motion: 'a' | 'b' | 'c' }) {
  return (
    <View style={{ position: 'absolute', left, top, transform: [{ rotate }] }} pointerEvents="none">
      <View {...data('ambient', motion)} style={[styles.satellite, css({ boxShadow: '0 14px 30px rgba(0, 0, 0, 0.22)' })]}>
        <View style={[styles.satelliteIcon, { backgroundColor: bg }]}>
          <IconSymbol name={icon} size={26} color={tint} />
        </View>
        <View style={styles.satLine} />
      </View>
    </View>
  );
}

// Tanıtım slaytının sağ tarafı (fotoğrafı olmayan ilan slaytında yedek olarak da kullanılır)
export function ExchangeEmblem() {
  return (
    <View style={styles.stage}>
      <View style={[styles.ring, styles.dashed, { width: 300, height: 300, borderRadius: 150, left: 50, top: 0 }]} {...data('scene', 'orbit')} pointerEvents="none">
        <View style={[styles.dot, { left: 145, top: -5 }]} />
        <View style={[styles.dot, { right: 22, bottom: 52, width: 8, height: 8, opacity: 0.7 }]} />
        <View style={[styles.dot, { left: 30, bottom: 60, width: 6, height: 6, opacity: 0.55 }]} />
      </View>
      <View style={[styles.ring, { width: 250, height: 250, borderRadius: 125, left: 75, top: 25, borderColor: 'rgba(255, 255, 255, 0.10)' }]} pointerEvents="none" />
      <View style={[styles.ripple, { width: 184, height: 184, borderRadius: 92, left: 108, top: 58 }]} {...data('scene', 'ripple')} pointerEvents="none" />
      <View style={[styles.ripple, { width: 184, height: 184, borderRadius: 92, left: 108, top: 58 }, css({ animationDelay: '2.3s' })]} {...data('scene', 'ripple')} pointerEvents="none" />

      <View style={{ position: 'absolute', left: 108, top: 58 }}>
        <SpinCircle size={184} />
      </View>

      <Satellite icon="tshirt.fill" tint="#047857" bg="#d1fae5" left={8} top={22} rotate="-6deg" motion="a" />
      <Satellite icon="book.fill" tint="#b45309" bg="#fef3c7" left={296} top={34} rotate="5deg" motion="b" />
      <Satellite icon="desktopcomputer" tint="#0369a1" bg="#e0f2fe" left={276} top={210} rotate="-4deg" motion="c" />
      <Satellite icon="sportscourt.fill" tint="#be123c" bg="#ffe4e6" left={28} top={214} rotate="4deg" motion="a" />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 380, height: 300 },
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255, 255, 255, 0.28)', backgroundColor: Brand.accent },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  dashed: { borderStyle: 'dashed', borderColor: 'rgba(167, 243, 208, 0.32)' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#6ee7b7' },
  ripple: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(110, 231, 183, 0.55)' },
  satellite: { width: 76, padding: 8, gap: 7, borderRadius: Radius.lg, backgroundColor: 'rgba(255, 255, 255, 0.97)' },
  satelliteIcon: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  satLine: { height: 6, width: '62%', borderRadius: 3, backgroundColor: '#e5e7eb' },
});
