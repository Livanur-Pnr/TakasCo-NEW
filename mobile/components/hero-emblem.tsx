import { memo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius } from '@/constants/theme';

// Vitrindeki "takas okları" görseli (tanıtım slaytının sağ tarafı).
// Fare emblemin herhangi bir yerine gelince (dokunmatikte dokununca):
//   • iki ok yay çizerek çaprazlaşıp yer değiştirir (üstteki → alta, alttaki ↑ üste; sonraki girişte geri),
//   • ok grubu aynı anda bir tam tur döner (tur birikir, geri sarmaz),
//   • daire hafifçe büyür, üzerinden bir halka yayılır, ürün kartları merkeze yaklaşır; fare çekilince geri döner.
// Tüm hareket tarayıcının CSS geçişleri/animasyonlarıyla yapılır (React yalnızca giriş başına bir kez durum değiştirir; kareler arası
// JavaScript yoktur). Bu yüzden takılmaz ve üst üste girişlerde bile yumuşak devam eder. Animasyon adları (a/b) girişte sırayla değişerek
// aynı animasyonun yeniden başlamasını sağlar. Anahtar kareler utils/web-motion.ts içindedir; "hareketi azalt" açıkken süreler ~0'a iner.

const web = Platform.OS === 'web';
const css = (style: object) => (web ? (style as any) : null);
const data = (key: string, value?: string) => (value === undefined ? {} : ({ dataSet: { [key]: value } } as any));

const CX = 190;
const CY = 150;
const ARROW = 46;
const GAP = 40; // iki okun dikey yer değiştirme mesafesi
const EASE = 'cubic-bezier(0.3, 0, 0, 1)';

// hareketli öğeyi kendi katmanına alır: dönme/ölçek sırasında yeniden çizim (takılma/bulanıklık) olmaz
const layer = { willChange: 'transform', backfaceVisibility: 'hidden' } as const;
const move = (ms: number) => ({ ...layer, transitionProperty: 'transform', transitionDuration: `${ms}ms`, transitionTimingFunction: EASE });

type SatIcon = 'tshirt.fill' | 'book.fill' | 'desktopcomputer' | 'sportscourt.fill';

function Satellite({ icon, tint, bg, left, top, rotate, motion, pulled }: { icon: SatIcon; tint: string; bg: string; left: number; top: number; rotate: string; motion: 'a' | 'b' | 'c'; pulled: boolean }) {
  // fare emblemin üstündeyken kart, merkeze doğru %11 kadar yaklaşır
  const dx = pulled ? (CX - (left + 38)) * 0.11 : 0;
  const dy = pulled ? (CY - (top + 45)) * 0.11 : 0;
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', left, top, transform: [{ translateX: dx }, { translateY: dy }, { rotate }] }, css(move(420))]}
    >
      <View {...data('ambient', motion)} style={[styles.satellite, css({ boxShadow: '0 10px 22px rgba(0, 0, 0, 0.20)' })]}>
        <View style={[styles.satelliteIcon, { backgroundColor: bg }]}>
          <IconSymbol name={icon} size={26} color={tint} />
        </View>
        <View style={styles.satLine} />
      </View>
    </View>
  );
}

function ExchangeEmblemView() {
  const [hovered, setHovered] = useState(false);
  const [run, setRun] = useState(0); // giriş sayısı: tek → oklar yer değiştirmiş, çift → ilk konum
  const last = useRef(0);

  const enter = () => {
    setHovered(true);
    const now = Date.now();
    if (now - last.current < 300) return; // hover + tıklama çift tetiklemesin
    last.current = now;
    setRun((r) => r + 1);
  };
  const leave = () => setHovered(false);

  const swapped = run % 2 === 1;
  const parity = run === 0 ? undefined : run % 2 === 1 ? 'a' : 'b'; // animasyon adı değişince aynı animasyon yeniden oynar

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
      <View pointerEvents="none" style={[styles.flash, { left: 98, top: 58, opacity: 0 }, css(layer)]} {...data('flash', parity)} />

      {/* ana daire + ok grubu */}
      <View
        pointerEvents="none"
        style={[
          styles.circle,
          { left: 98, top: 58, transform: [{ scale: hovered ? 1.06 : 1 }] },
          css({ ...move(320), backgroundImage: 'linear-gradient(145deg, #3fd68d 0%, #1B7A43 55%, #146c3a 100%)', boxShadow: '0 18px 34px rgba(0, 0, 0, 0.26), inset 0 2px 0 rgba(255, 255, 255, 0.30)' }),
        ]}
      >
        <View {...data('pulse', parity)} style={css(layer)}>
          <View style={[{ width: 96, height: ARROW + GAP + 8, transform: [{ rotate: `${run * 360}deg` }] }, css(move(850))]}>
            <View style={[styles.arrowBox, { left: 44, top: 4, transform: [{ translateY: swapped ? GAP : 0 }] }, css(move(850))]}>
              <View {...data('arc', parity && `top-${parity}`)} style={css(layer)}>
                <IconSymbol name="arrow.right" size={ARROW} color="#ffffff" style={styles.arrowGlyph} />
              </View>
            </View>
            <View style={[styles.arrowBox, { left: 6, top: 4 + GAP, transform: [{ translateY: swapped ? -GAP : 0 }] }, css(move(850))]}>
              <View {...data('arc', parity && `bot-${parity}`)} style={css(layer)}>
                <IconSymbol name="arrow.left" size={ARROW} color="#ffffff" style={styles.arrowGlyph} />
              </View>
            </View>
          </View>
        </View>
      </View>

      <Satellite icon="tshirt.fill" tint="#047857" bg="#d1fae5" left={8} top={22} rotate="-6deg" motion="a" pulled={hovered} />
      <Satellite icon="book.fill" tint="#b45309" bg="#fef3c7" left={296} top={34} rotate="5deg" motion="b" pulled={hovered} />
      <Satellite icon="desktopcomputer" tint="#0369a1" bg="#e0f2fe" left={276} top={210} rotate="-4deg" motion="c" pulled={hovered} />
      <Satellite icon="sportscourt.fill" tint="#be123c" bg="#ffe4e6" left={28} top={214} rotate="4deg" motion="a" pulled={hovered} />
    </Pressable>
  );
}

// Üst bileşen (fare/otomatik oynatma durumu) her değiştiğinde emblem yeniden çizilmesin
export const ExchangeEmblem = memo(ExchangeEmblemView);

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
