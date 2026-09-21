import { memo, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useReducedMotion } from '@/components/ui/motion';
import { Brand, Radius } from '@/constants/theme';
import { Ease } from '@/constants/motion';

// Vitrindeki "takas okları" görseli (tanıtım slaytının sağ tarafı).
// Fare emblemin herhangi bir yerine gelince (dokunmatikte dokununca):
//   • iki ok yay çizerek çaprazlaşıp yer değiştirir (üstteki → alta, alttaki ↑ üste; sonraki girişte geri),
//   • ok grubu aynı anda bir tam tur döner (tur birikir, geri sarmaz),
//   • daire hafifçe büyür, üzerinden bir halka yayılır, ürün kartları merkeze doğru yaklaşır; fare çekilince geri döner.
// Çevrede yayılan halkalar, dönen kesikli halka ve süzülen kartlar CSS ile (utils/web-motion.ts) sürekli ama çok hafif hareket eder;
// "hareketi azalt" açıkken bunlar durur, etkileşim geri bildirimi ise kısa ve sade (0.25 sn) kalır.

const web = Platform.OS === 'web';
const css = (style: object) => (web ? (style as any) : null);
const data = (key: string, value: string) => ({ dataSet: { [key]: value } } as any);
// hareketli öğeleri kendi katmanına alır: dönme/ölçek sırasında yeniden çizim (takılma/bulanıklık) olmaz
const layer = css({ willChange: 'transform', backfaceVisibility: 'hidden' });

const CX = 190;
const CY = 150;
const ARROW = 46;
const GAP = 40; // iki okun dikey yer değiştirme mesafesi

type SatIcon = 'tshirt.fill' | 'book.fill' | 'desktopcomputer' | 'sportscourt.fill';

function Satellite({ icon, tint, bg, left, top, rotate, motion, pull }: { icon: SatIcon; tint: string; bg: string; left: number; top: number; rotate: string; motion: 'a' | 'b' | 'c'; pull: Animated.Value }) {
  // fare emblemin üstündeyken kart, merkeze doğru %11 kadar yaklaşır
  const dx = (CX - (left + 38)) * 0.11;
  const dy = (CY - (top + 45)) * 0.11;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left, top, transform: [{ translateX: pull.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: pull.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }, { rotate }] }, layer]}
    >
      <View {...data('ambient', motion)} style={[styles.satellite, css({ boxShadow: '0 10px 22px rgba(0, 0, 0, 0.20)' })]}>
        <View style={[styles.satelliteIcon, { backgroundColor: bg }]}>
          <IconSymbol name={icon} size={26} color={tint} />
        </View>
        <View style={styles.satLine} />
      </View>
    </Animated.View>
  );
}

function ExchangeEmblemView() {
  const reduced = useReducedMotion();
  const hover = useRef(new Animated.Value(0)).current;   // 0/1: fare üstünde mi
  const swap = useRef(new Animated.Value(0)).current;    // 0 → 1 (yer değiştirdi) → 2 ≡ 0 (geri)
  const spin = useRef(new Animated.Value(0)).current;    // birikimli tam turlar
  const pulse = useRef(new Animated.Value(0)).current;   // ok grubunun kısa büyümesi
  const flash = useRef(new Animated.Value(0)).current;   // yayılan halka
  const swapped = useRef(false);
  const turns = useRef(0);
  const lastEnter = useRef(0);

  const enter = () => {
    const now = Date.now();
    if (now - lastEnter.current < 500) return; // hover + tıklama çift tetiklemesin, hareket bitmeden üst üste binmesin
    lastEnter.current = now;
    const dur = reduced ? 250 : 850;
    const target = swapped.current ? 2 : 1;
    swapped.current = !swapped.current;
    turns.current += 1;
    Animated.parallel([
      Animated.timing(hover, { toValue: 1, duration: reduced ? 120 : 320, easing: Ease.standard, useNativeDriver: true }),
      Animated.timing(swap, { toValue: target, duration: dur, easing: Ease.emphasized, useNativeDriver: true }),
      Animated.timing(spin, { toValue: turns.current, duration: dur, easing: Ease.emphasized, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: dur * 0.4, easing: Ease.standard, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: dur * 0.6, easing: Ease.standard, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flash, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 1, duration: reduced ? 250 : 900, easing: Ease.decelerate, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (finished && target === 2) swap.setValue(0); // 2 ≡ 0: aralık taşmasın
    });
  };
  const leave = () => {
    Animated.timing(hover, { toValue: 0, duration: reduced ? 120 : 420, easing: Ease.standard, useNativeDriver: true }).start();
  };

  // ok yolları: iki ok karşılıklı yay çizerek dikey yer değiştirir
  const topY = swap.interpolate({ inputRange: [0, 0.5, 1, 1.5, 2], outputRange: [0, GAP / 2, GAP, GAP / 2, 0] });
  const botY = swap.interpolate({ inputRange: [0, 0.5, 1, 1.5, 2], outputRange: [0, -GAP / 2, -GAP, -GAP / 2, 0] });
  const topX = swap.interpolate({ inputRange: [0, 0.5, 1, 1.5, 2], outputRange: [0, 16, 0, 16, 0] });
  const botX = swap.interpolate({ inputRange: [0, 0.5, 1, 1.5, 2], outputRange: [0, -16, 0, -16, 0] });
  const groupRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const groupScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const circleScale = hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Pressable
      accessible={false}
      onHoverIn={enter}
      onHoverOut={leave}
      onPress={enter}
      style={[styles.stage, { cursor: 'pointer' as any }]}
    >
      <View style={[styles.ring, styles.dashed, { width: 300, height: 300, borderRadius: 150, left: 40, top: 0 }]} {...data('scene', 'orbit')} pointerEvents="none">
        <View style={[styles.dot, { left: 145, top: -5 }]} />
        <View style={[styles.dot, { right: 22, bottom: 52, width: 8, height: 8, opacity: 0.7 }]} />
        <View style={[styles.dot, { left: 30, bottom: 60, width: 6, height: 6, opacity: 0.55 }]} />
      </View>
      <View style={[styles.ring, { width: 250, height: 250, borderRadius: 125, left: 65, top: 25, borderColor: 'rgba(255, 255, 255, 0.10)' }]} pointerEvents="none" />
      <View style={[styles.ripple, { width: 184, height: 184, borderRadius: 92, left: 98, top: 58 }]} {...data('scene', 'ripple')} pointerEvents="none" />
      <View style={[styles.ripple, { width: 184, height: 184, borderRadius: 92, left: 98, top: 58 }, css({ animationDelay: '2.3s' })]} {...data('scene', 'ripple')} pointerEvents="none" />

      {/* etkileşimde dairenin üstünden yayılan halka */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { left: 98, top: 58, opacity: flash.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.75, 0] }), transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }]}
      />

      {/* ana daire + ok grubu */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circle,
          { left: 98, top: 58, transform: [{ scale: circleScale }] },
          layer,
          css({ backgroundImage: 'linear-gradient(145deg, #3fd68d 0%, #1B7A43 55%, #146c3a 100%)', boxShadow: '0 18px 34px rgba(0, 0, 0, 0.26), inset 0 2px 0 rgba(255, 255, 255, 0.30)' }),
        ]}
      >
        <Animated.View style={[{ width: 96, height: ARROW + GAP + 8, transform: [{ rotate: groupRotate }, { scale: groupScale }] }, layer]}>
          <Animated.View style={[styles.arrowBox, { left: 44, top: 4, transform: [{ translateX: topX }, { translateY: topY }] }, layer]}>
            <IconSymbol name="arrow.right" size={ARROW} color="#ffffff" style={styles.arrowGlyph} />
          </Animated.View>
          <Animated.View style={[styles.arrowBox, { left: 6, top: 4 + GAP, transform: [{ translateX: botX }, { translateY: botY }] }, layer]}>
            <IconSymbol name="arrow.left" size={ARROW} color="#ffffff" style={styles.arrowGlyph} />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      <Satellite icon="tshirt.fill" tint="#047857" bg="#d1fae5" left={8} top={22} rotate="-6deg" motion="a" pull={hover} />
      <Satellite icon="book.fill" tint="#b45309" bg="#fef3c7" left={296} top={34} rotate="5deg" motion="b" pull={hover} />
      <Satellite icon="desktopcomputer" tint="#0369a1" bg="#e0f2fe" left={276} top={210} rotate="-4deg" motion="c" pull={hover} />
      <Satellite icon="sportscourt.fill" tint="#be123c" bg="#ffe4e6" left={28} top={214} rotate="4deg" motion="a" pull={hover} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { width: 380, height: 300 },
  circle: { position: 'absolute', width: 184, height: 184, borderRadius: 92, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255, 255, 255, 0.28)', backgroundColor: Brand.accent },
  flash: { position: 'absolute', width: 184, height: 184, borderRadius: 92, borderWidth: 3, borderColor: '#a7f3d0' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  dashed: { borderStyle: 'dashed', borderColor: 'rgba(167, 243, 208, 0.32)' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#6ee7b7' },
  ripple: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(110, 231, 183, 0.55)' },
  satellite: { width: 76, padding: 8, gap: 7, borderRadius: Radius.lg, backgroundColor: 'rgba(255, 255, 255, 0.97)' },
  satelliteIcon: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  arrowBox: { position: 'absolute', width: ARROW, height: ARROW, alignItems: 'center', justifyContent: 'center' },
  arrowGlyph: { width: ARROW, height: ARROW, lineHeight: ARROW, textAlign: 'center' },
  satLine: { height: 6, width: '62%', borderRadius: 3, backgroundColor: '#e5e7eb' },
});

// Üst bileşen (fare/otomatik oynatma durumu) her değiştiğinde emblem yeniden çizilmesin
export const ExchangeEmblem = memo(ExchangeEmblemView);
