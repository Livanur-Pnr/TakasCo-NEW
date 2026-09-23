import { TakascoWordmark } from '@/components/brand/takasco-wordmark';
import { memo, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Gradient, Radius } from '@/constants/theme';

// Masaüstü marka panelinin sahnesi: TakasCo uygulamasını anlatan soyut bir ürün görseli.
// Ortada uygulama ekranı (arama, kategori çipleri, ilan kartları, alt sekme çubuğu); çevresinde 12 saniyelik bir döngüde
// sırayla "yeni takas teklifi" bildirimi → mesaj → takas teklifi kartı → "Takas tamamlandı" belirir. Metinler yalnızca örnek
// arayüz etiketidir (gerçek veri/istatistik değildir); sahne erişilebilirlik ağacında gizlidir.
// Hareket: yalnızca CSS transform/opacity (utils/web-motion.ts, `data-scene`/`data-ambient`); "hareketi azalt" açıkken durur ve
// tüm öğeler statik görünür. Native'de animasyon yoktur (bu sahne yalnızca geniş ekranda gösterilir).

const W = 480;
const H = 440;
const web = Platform.OS === 'web';
const css = (style: object) => (web ? (style as any) : null);
const data = (key: string, value: string) => ({ dataSet: { [key]: value } } as any);

const TILES = [
  { icon: 'tshirt.fill', bg: '#d1fae5', fg: '#047857' },
  { icon: 'book.fill', bg: '#fef3c7', fg: '#b45309' },
  { icon: 'desktopcomputer', bg: '#e0f2fe', fg: '#0369a1' },
  { icon: 'sofa.fill', bg: '#ffe4e6', fg: '#be123c' },
] as const;

function AppScreen() {
  return (
    <View style={s.phone}>
      <View style={s.appHeader}>
        <View style={s.appBrand}>
          <Image source={require('@/assets/images/takasco-logo.png')} style={{ width: 18, height: 18 }} />
          <TakascoWordmark size={13} variant="light" animate={false} />
        </View>
        <IconSymbol name="bell.fill" size={14} color="#6b7280" />
      </View>

      <View style={s.search}>
        <IconSymbol name="magnifyingglass" size={12} color="#9ca3af" />
        <View style={[s.line, { width: '52%', backgroundColor: '#e5e7eb' }]} />
      </View>

      <View style={s.pillRow}>
        <View style={[s.pill, { backgroundColor: Brand.accent, width: 44 }]} />
        <View style={[s.pill, { width: 38 }]} />
        <View style={[s.pill, { width: 34 }]} />
      </View>

      <View style={s.grid}>
        {TILES.map((t, i) => (
          <View key={t.icon} style={s.tileCard}>
            <View style={[s.tileImage, { backgroundColor: t.bg }]}>
              <IconSymbol name={t.icon} size={26} color={t.fg} />
              {i < 2 && (
                <View style={s.heart} {...(i === 0 ? data('scene', 'heart') : {})}>
                  <IconSymbol name="heart.fill" size={10} color={i === 0 ? Brand.danger : '#d1d5db'} />
                </View>
              )}
            </View>
            <View style={[s.line, { width: '78%', backgroundColor: '#e5e7eb' }]} />
            <View style={[s.line, { width: '46%', backgroundColor: '#d1fae5' }]} />
          </View>
        ))}
      </View>

      <View style={s.tabBar}>
        <IconSymbol name="house.fill" size={16} color={Brand.accent} />
        <IconSymbol name="magnifyingglass" size={16} color="#9ca3af" />
        <View style={s.plus}><IconSymbol name="plus.circle.fill" size={26} color={Brand.accent} /></View>
        <IconSymbol name="message.fill" size={16} color="#9ca3af" />
        <IconSymbol name="person.fill" size={16} color="#9ca3af" />
      </View>
    </View>
  );
}

function Thumb({ i }: { i: number }) {
  const t = TILES[i];
  return (
    <View style={[s.thumb, { backgroundColor: t.bg }]}>
      <IconSymbol name={t.icon} size={18} color={t.fg} />
    </View>
  );
}

export function BrandScene() {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const scale = box.w ? Math.min(box.w / W, box.h / H, 1.12) : 1;

  return (
    <View
      style={{ flex: 1, minHeight: 280 }}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <View style={{ position: 'absolute', width: W, height: H, left: (box.w - W) / 2, top: (box.h - H) / 2, opacity: box.w ? 1 : 0, transform: [{ scale }] }}>
        {/* halkalar: ince sabit halka + çok yavaş dönen kesikli "takas" halkası */}
        <View style={[s.ring, { width: 360, height: 360, borderRadius: 180, left: 60, top: 40 }]} />
        <View style={[s.ring, s.dashed, { width: 430, height: 430, borderRadius: 215, left: 25, top: 5 }]} {...data('scene', 'orbit')}>
          <View style={[s.orbitDot, { left: 205, top: -5 }]} />
          <View style={[s.orbitDot, { right: 26, bottom: 62, width: 8, height: 8, opacity: 0.7 }]} />
          <View style={[s.orbitDot, { left: 38, bottom: 70, width: 6, height: 6, opacity: 0.55 }]} />
        </View>

        {/* parıltılar */}
        {[
          { l: 60, t: 30, d: '0s' }, { l: 420, t: 210, d: '2.5s' }, { l: 32, t: 340, d: '4.5s' },
          { l: 440, t: 20, d: '1.5s' }, { l: 250, t: 425, d: '3.5s' },
        ].map((p, i) => (
          <View key={i} style={[s.spark, { left: p.l, top: p.t }, css({ animationDelay: p.d })]} {...data('scene', 'twinkle')} />
        ))}

        {/* uygulama ekranı */}
        <View style={{ position: 'absolute', left: 145, top: 22 }}>
          <View {...data('ambient', 'a')}>
            <AppScreen />
          </View>
        </View>

        {/* güvenli takas rozeti (sabit, hafif süzülür) */}
        <View style={{ position: 'absolute', left: 6, top: 56 }}>
          <View {...data('ambient', 'b')} style={[s.badge, css({ boxShadow: '0 10px 26px rgba(0, 0, 0, 0.20)' })]}>
            <IconSymbol name="checkmark.seal.fill" size={16} color={Brand.accent} />
            <ThemedText style={s.badgeText}>Güvenli takas</ThemedText>
          </View>
        </View>

        {/* 1) yeni teklif bildirimi */}
        <View style={{ position: 'absolute', left: 298, top: 34 }}>
          <View {...data('scene', 'toast')} style={[s.float, { width: 182 }, css({ boxShadow: '0 14px 34px rgba(0, 0, 0, 0.22)' })]}>
            <View style={s.bell}><IconSymbol name="bell.fill" size={14} color="#fff" /></View>
            <View style={{ flex: 1, gap: 5 }}>
              <ThemedText style={s.floatTitle}>Yeni takas teklifi</ThemedText>
              <View style={[s.line, { width: '70%', backgroundColor: '#e5e7eb' }]} />
            </View>
          </View>
        </View>

        {/* 2) mesaj */}
        <View style={{ position: 'absolute', left: 292, top: 268 }}>
          <View {...data('scene', 'msg')} style={[s.float, { width: 188 }, css({ boxShadow: '0 14px 34px rgba(0, 0, 0, 0.22)' })]}>
            <View style={s.avatar}><IconSymbol name="person.fill" size={13} color={Brand.accent} /></View>
            <ThemedText style={s.msgText}>Merhaba! Takasa hâlâ açık mı?</ThemedText>
          </View>
        </View>

        {/* 3) takas teklifi → tamamlandı */}
        <View style={{ position: 'absolute', left: -2, top: 176 }}>
          <View {...data('scene', 'offer')} style={[s.offer, css({ boxShadow: '0 16px 38px rgba(0, 0, 0, 0.24)' })]}>
            <ThemedText style={s.floatTitle}>Takas teklifi</ThemedText>
            <View style={s.swapRow}>
              <Thumb i={0} />
              <View style={s.swapIcon}><IconSymbol name="arrow.left.arrow.right" size={13} color={Brand.accent} /></View>
              <Thumb i={1} />
            </View>
            <View style={s.cta}>
              <View style={s.ctaLayer} {...data('scene', 'accept')}>
                <ThemedText style={s.ctaText}>Kabul et</ThemedText>
              </View>
              <View style={[s.ctaLayer, s.ctaDone, { opacity: 0 }]} {...data('scene', 'done')}>
                <IconSymbol name="checkmark.circle.fill" size={14} color="#fff" />
                <ThemedText style={s.ctaText}>Takas tamamlandı</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// Panel arka planı: ince ızgara + iki yumuşak, çok yavaş süzülen ışık lekesi (yalnızca web)
function BrandBackdropView() {
  if (!web) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[StyleSheet.absoluteFill, css({
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 50% 45%, #000 20%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 45%, #000 20%, transparent 72%)',
        })]}
      />
      <View style={[s.glowBig, { right: -160, top: -120 }, css({ backgroundImage: Gradient.brandGlow })]} {...data('ambient', 'c')} />
      <View style={[s.glowBig, { left: -200, bottom: -200, width: 560, height: 560, opacity: 0.7 }, css({ backgroundImage: Gradient.brandGlow })]} {...data('ambient', 'a')} />
    </View>
  );
}

export const BrandBackdrop = memo(BrandBackdropView);

const s = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)' },
  dashed: { borderStyle: 'dashed', borderColor: 'rgba(167, 243, 208, 0.28)' },
  orbitDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#6ee7b7' },
  spark: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#a7f3d0', opacity: 0.3 },
  glowBig: { position: 'absolute', width: 640, height: 640 },

  phone: { width: 190, height: 396, borderRadius: 30, backgroundColor: '#f7fcff', borderWidth: 6, borderColor: 'rgba(255, 255, 255, 0.28)', padding: 10, gap: 9, overflow: 'hidden', ...(web ? ({ boxShadow: '0 30px 60px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255,255,255,0.4)' } as any) : { elevation: 8 }) },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  appBrand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, borderRadius: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 10 },
  pillRow: { flexDirection: 'row', gap: 6 },
  pill: { height: 16, borderRadius: 8, backgroundColor: '#e5e7eb' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tileCard: { width: '47.5%', gap: 5 },
  tileImage: { height: 82, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  line: { height: 6, borderRadius: 3 },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 44, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#eef2ef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6 },
  plus: { marginTop: -12 },

  float: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Radius.lg, backgroundColor: 'rgba(255, 255, 255, 0.97)' },
  floatTitle: { color: '#111827', fontSize: 12, fontWeight: '800', lineHeight: 16 },
  bell: { width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
  msgText: { flex: 1, color: '#374151', fontSize: 11.5, lineHeight: 15, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: 'rgba(255, 255, 255, 0.97)' },
  badgeText: { color: Brand.wordmark, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  offer: { width: 176, padding: 12, gap: 10, borderRadius: Radius.lg, backgroundColor: 'rgba(255, 255, 255, 0.97)' },
  swapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  thumb: { width: 52, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  swapIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  cta: { height: 32 },
  ctaLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 10, backgroundColor: Brand.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  ctaDone: { backgroundColor: Brand.success },
  ctaText: { color: '#ffffff', fontSize: 12, fontWeight: '700', lineHeight: 16 },
});
