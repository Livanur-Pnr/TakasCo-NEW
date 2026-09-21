import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Image, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandBackdrop } from '@/components/auth/brand-scene';
import { ExchangeEmblem } from '@/components/hero-emblem';
import { FeatureChips } from '@/components/auth/feature-chips';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useReducedMotion } from '@/components/ui/motion';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Gradient, Radius, Spacing } from '@/constants/theme';
import { Distance, Duration, Ease } from '@/constants/motion';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { useTheme } from '@/hooks/use-theme';
import { api, getImageUrl } from '@/utils/api';
import { formatPrice } from '@/utils/listing';

// Ana sayfa vitrini (carousel). İçerik tamamen gerçek: ilk slayt TakasCo tanıtımı (koyu yeşil, animasyonlu uygulama sahnesi),
// sonrakiler en çok favorilenen ilanlar (ilanın kendi fotoğrafından bulanık zemin + çerçeveli, süzülen fotoğraf kartı).
// İlan yoksa yalnızca tanıtım slaytı görünür (uydurma reklam/içerik yoktur).
// Geçiş: çıkan slayt solar ve hafif büyür, gelen slayt belirir ve yerine oturur; metin, düğme ve görsel sırayla belirir.
// Otomatik oynatma 6 sn, fareyle durur, ilerleme çubuğu süreyi gösterir. "Hareketi azalt" açıkken otomatik oynatma ve CSS hareketleri kapalıdır.

const SLIDE_MS = 6000;
const web = Platform.OS === 'web';
const css = (style: object) => (web ? (style as any) : null);
const data = (key: string, value: string) => ({ dataSet: { [key]: value } } as any);

interface Slide {
  key: string;
  kind: 'brand' | 'listing';
  product?: any;
}

function SlideView({ slide, active, hovered, height, compact }: { slide: Slide; active: boolean; hovered: boolean; height: number; compact: boolean }) {
  const router = useRouter();
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(active ? 1 : 0)).current;
  const text = useRef(new Animated.Value(active ? 1 : 0)).current;
  const cta = useRef(new Animated.Value(active ? 1 : 0)).current;
  const media = useRef(new Animated.Value(active ? 1 : 0)).current;
  const zoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const d = reduced ? 0 : Duration.ad;
    Animated.timing(fade, { toValue: active ? 1 : 0, duration: d, easing: Ease.emphasized, useNativeDriver: true }).start();
    if (active) {
      text.setValue(reduced ? 1 : 0);
      cta.setValue(reduced ? 1 : 0);
      media.setValue(reduced ? 1 : 0);
      if (!reduced) {
        Animated.timing(text, { toValue: 1, duration: Duration.slow, delay: 180, easing: Ease.decelerate, useNativeDriver: true }).start();
        Animated.timing(cta, { toValue: 1, duration: Duration.slow, delay: 320, easing: Ease.decelerate, useNativeDriver: true }).start();
        Animated.timing(media, { toValue: 1, duration: Duration.ad, delay: 220, easing: Ease.emphasized, useNativeDriver: true }).start();
      }
    }
  }, [active, reduced, fade, text, cta, media]);

  useEffect(() => {
    Animated.timing(zoom, { toValue: hovered && active && !reduced ? 1 : 0, duration: Duration.slow, easing: Ease.standard, useNativeDriver: true }).start();
  }, [hovered, active, reduced, zoom]);

  const enter = fade.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }); // çıkarken 1 → 1.02, girerken 1.02 → 1
  const textStyle = { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [Distance.sm + 2, 0] }) }] };
  const ctaStyle = { opacity: cta, transform: [{ translateY: cta.interpolate({ inputRange: [0, 1], outputRange: [Distance.sm, 0] }) }] };
  const mediaStyle = { opacity: media, transform: [{ translateX: media.interpolate({ inputRange: [0, 1], outputRange: [Distance.lg + 10, 0] }) }] };

  const brand = slide.kind === 'brand';
  const p = slide.product;
  const imagePath = p ? (p.images?.[0]?.image_path ?? p.image_path) : null;
  const clean = typeof imagePath === 'string' && imagePath.startsWith('[') ? JSON.parse(imagePath)[0] : imagePath;
  const photo = clean ? getImageUrl(clean) || undefined : undefined;
  const price = p ? formatPrice(p.price) : null;
  const favs = p?.favorited_by_count ?? 0;

  const titleColor = brand ? '#ffffff' : Brand.wordmark;
  const bodyColor = brand ? 'rgba(255, 255, 255, 0.80)' : theme.textSecondary;

  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      {...({ 'aria-hidden': !active } as any)}
      style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale: enter }] }]}
    >
      <View style={[styles.slide, compact && styles.slideCompact, { height, backgroundColor: brand ? '#14532D' : theme.backgroundSelected }, css(brand ? { backgroundImage: Gradient.brandPanel } : {})]}>
        {/* ---- zemin katmanları ---- */}
        {brand ? (
          <BrandBackdrop />
        ) : (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {!!photo && (
              <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
                <Image
                  source={{ uri: photo }}
                  blurRadius={24}
                  style={[{ position: 'absolute', top: -50, left: -50, right: -50, bottom: -50, opacity: 0.5 }, css({ filter: 'blur(28px) saturate(1.15)' })]}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(233, 247, 239, 0.72)' }, css({ backgroundImage: 'linear-gradient(100deg, rgba(247,252,255,0.94) 0%, rgba(226,243,233,0.78) 52%, rgba(226,243,233,0.35) 100%)' })]} />
            {web && <View style={[styles.softBlob, { right: -120, top: -140, backgroundImage: Gradient.blobMint } as any]} {...data('ambient', 'c')} />}
          </View>
        )}

        {/* ---- metin ---- */}
        <View style={[styles.textCol, compact && { flex: undefined, paddingHorizontal: 0 }]}>
          <Animated.View style={textStyle}>
            <View style={[styles.badge, brand ? styles.badgeDark : styles.badgeLight]}>
              <View style={[styles.badgeDot, { backgroundColor: brand ? '#6ee7b7' : Brand.accent }]} {...data('scene', 'twinkle')} />
              <ThemedText style={[styles.badgeText, { color: brand ? '#d1fae5' : Brand.wordmark }]}>{brand ? 'GÜVENLİ VE ÜCRETSİZ' : 'ÖNE ÇIKAN İLAN'}</ThemedText>
            </View>
            <ThemedText style={[compact ? styles.titleCompact : styles.title, { color: titleColor }]} numberOfLines={3}>
              {brand ? "TakasCo'da takasla, kullanmadıkların birinin favorisi olsun" : p.title}
            </ThemedText>
            <ThemedText style={{ color: bodyColor, fontSize: 15, lineHeight: 23, marginTop: Spacing.two }} numberOfLines={3}>
              {brand
                ? 'Eşyalarını satışa çıkarmadan, ihtiyacın olan şeylerle değiştir. Ücretsiz ilan ver, güvenle takasla.'
                : [price, p.city, p.swap_expectation && p.listing_type !== 'satilik' ? `Takas: ${p.swap_expectation}` : null].filter(Boolean).join(' · ')}
            </ThemedText>
          </Animated.View>

          <Animated.View style={[ctaStyle, { gap: Spacing.four, marginTop: Spacing.four }]}>
            <View style={{ flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' }}>
              {brand ? (
                <>
                  <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/add')} {...data('cta', 'light')} style={[styles.btnFilled, { backgroundColor: '#ffffff' }]}>
                    <ThemedText style={{ color: Brand.wordmark, fontWeight: '800' }}>İlan Ver</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/search')} {...data('cta', 'ghost')} style={[styles.btnOutline, { borderColor: 'rgba(255, 255, 255, 0.55)' }]}>
                    <ThemedText style={{ color: '#ffffff', fontWeight: '700' }}>Keşfetmeye Başla →</ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/product/${p.id}`)} style={[styles.btnFilled, { backgroundColor: Brand.accent }, css({ backgroundImage: Gradient.cta })]}>
                  <ThemedText style={{ color: '#fff', fontWeight: '700' }}>İlana Git →</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {brand && !compact && <FeatureChips tone="dark" align="flex-start" />}
          </Animated.View>
        </View>

        {/* ---- görsel ---- */}
        {!compact && (
          <Animated.View style={[styles.mediaCol, mediaStyle]} pointerEvents="box-none">
            {brand ? (
              <ExchangeEmblem />
            ) : photo ? (
              <View {...data('ambient', 'a')}>
                <Animated.View style={[styles.photoCard, css({ boxShadow: '0 26px 54px rgba(12, 60, 34, 0.28), 0 2px 6px rgba(12, 60, 34, 0.10)' }), { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }]}>
                  <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  <View style={[StyleSheet.absoluteFill, css({ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.50) 100%)' })]} />
                  {!!p.city && (
                    <View style={[styles.glass, { top: 12, left: 12 }]}>
                      <ThemedText style={styles.glassText}>{p.city}</ThemedText>
                    </View>
                  )}
                  {favs > 0 && (
                    <View style={[styles.glass, { top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <IconSymbol name="heart.fill" size={12} color={Brand.danger} />
                      <ThemedText style={styles.glassText}>{favs}</ThemedText>
                    </View>
                  )}
                  {!!price && (
                    <View style={[styles.pricePill, { bottom: 12, left: 12 }]}>
                      <ThemedText style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>{price}</ThemedText>
                    </View>
                  )}
                </Animated.View>
              </View>
            ) : (
              <ExchangeEmblem />
            )}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

export function HeroCarousel() {
  const desktop = useIsDesktopWeb();
  const reduced = useReducedMotion();
  const [products, setProducts] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [appActive, setAppActive] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api.get('/products', { params: { sort: 'popular', per_page: 3 } })
      .then((r) => setProducts((r.data.data ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const slides: Slide[] = useMemo(() => [{ key: 'brand', kind: 'brand' as const }, ...products.map((p) => ({ key: `p${p.id}`, kind: 'listing' as const, product: p }))], [products]);
  const count = slides.length;
  const autoplay = count > 1 && !reduced && !hovered && appActive;
  const dark = slides[index]?.kind === 'brand';

  // slayt değişince ilerleme baştan başlar (elle geçişte de)
  const go = useCallback((to: number) => {
    progress.stopAnimation();
    progress.setValue(0);
    setIndex(((to % count) + count) % count);
  }, [count, progress]);

  // ilerleme çubuğu + otomatik geçiş: durunca (fare üstünde/sekme arkada) kaldığı yerden devam eder
  useEffect(() => {
    if (!autoplay) {
      progress.stopAnimation();
      return;
    }
    let cancelled = false;
    progress.stopAnimation((value) => {
      const remaining = Math.max(0, (1 - value) * SLIDE_MS);
      Animated.timing(progress, { toValue: 1, duration: remaining, easing: (t) => t, useNativeDriver: true }).start(({ finished }) => {
        if (finished && !cancelled) {
          progress.setValue(0);
          go(index + 1);
        }
      });
    });
    return () => { cancelled = true; progress.stopAnimation(); };
  }, [autoplay, index, count, go, progress]);

  // dokunmatik: yatay kaydırma ile önceki/sonraki
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_e, g) => {
      if (g.dx < -40) go(index + 1);
      else if (g.dx > 40) go(index - 1);
    },
  }), [go, index]);

  const height = desktop ? 360 : 380;

  return (
    <View
      accessibilityLabel="Öne çıkanlar"
      {...({ 'aria-roledescription': 'carousel' } as any)}
      style={[styles.wrap, desktop ? { marginHorizontal: Spacing.seven, marginTop: Spacing.six } : { marginHorizontal: Spacing.four, marginTop: Spacing.three }]}
      {...pan.panHandlers}
    >
      <Pressable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[styles.frame, { height, backgroundColor: '#14532D', cursor: 'default' as any }, css({ boxShadow: '0 22px 48px rgba(15, 60, 35, 0.18), 0 2px 6px rgba(15, 60, 35, 0.08)' })]}
      >
        {slides.map((s, i) => (
          <SlideView key={s.key} slide={s} active={i === index} hovered={hovered} height={height} compact={!desktop} />
        ))}

        {count > 1 && desktop && (
          <>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Önceki slayt" onPress={() => go(index - 1)} style={[styles.arrow, { left: Spacing.three }]}>
              <IconSymbol name="chevron.left" size={20} color={Brand.wordmark} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sonraki slayt" onPress={() => go(index + 1)} style={[styles.arrow, { right: Spacing.three }]}>
              <IconSymbol name="chevron.right" size={20} color={Brand.wordmark} />
            </TouchableOpacity>
          </>
        )}

        {count > 1 && (
          <View style={styles.segments}>
            {slides.map((s, i) => (
              <TouchableOpacity key={s.key} accessibilityRole="button" accessibilityLabel={`${i + 1}. slayta git`} accessibilityState={{ selected: i === index }} onPress={() => go(i)} hitSlop={{ top: 8, bottom: 8 }} style={styles.segmentHit}>
                <View style={[styles.segmentTrack, { backgroundColor: dark ? 'rgba(255, 255, 255, 0.26)' : 'rgba(20, 70, 45, 0.18)' }]}>
                  {i === index && (
                    <Animated.View
                      style={[styles.segmentFill, { width: '100%', backgroundColor: dark ? '#ffffff' : Brand.accent, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] }]}
                    />
                  )}
                  {i < index && <View style={[styles.segmentFill, { width: '100%', backgroundColor: dark ? '#ffffff' : Brand.accent }]} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  frame: { borderRadius: Radius.xl, overflow: 'hidden' },
  // yatay dolgu: yan oklar başlığın üstüne binmesin
  slide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.seven, paddingHorizontal: 68, gap: Spacing.five, overflow: 'hidden' },
  slideCompact: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: Spacing.five, paddingVertical: Spacing.five },
  textCol: { flex: 1, maxWidth: 540 },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.three, paddingVertical: 5, borderRadius: Radius.full, marginBottom: Spacing.three, borderWidth: 1 },
  badgeDark: { backgroundColor: 'rgba(255, 255, 255, 0.10)', borderColor: 'rgba(255, 255, 255, 0.22)' },
  badgeLight: { backgroundColor: 'rgba(255, 255, 255, 0.70)', borderColor: 'rgba(27, 122, 67, 0.20)' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, lineHeight: 14 },
  title: { fontSize: 36, fontWeight: '800', lineHeight: 42, letterSpacing: -0.5 },
  titleCompact: { fontSize: 25, fontWeight: '800', lineHeight: 31, letterSpacing: -0.3 },
  btnFilled: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full },
  btnOutline: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full, borderWidth: 1.5 },
  mediaCol: { width: 470, height: '100%', alignItems: 'center', justifyContent: 'center' },
  softBlob: { position: 'absolute', width: 520, height: 520, borderRadius: 260 },
  photoCard: { width: 340, height: 244, borderRadius: Radius.xl, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.85)', backgroundColor: '#e5e7eb' },
  glass: { position: 'absolute', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: 'rgba(255, 255, 255, 0.88)' },
  glassText: { color: '#111827', fontSize: 12, fontWeight: '700', lineHeight: 15 },
  pricePill: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Brand.accent },
  arrow: { position: 'absolute', top: '45%', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  segments: { position: 'absolute', bottom: Spacing.three, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, zIndex: 2 },
  segmentHit: { paddingVertical: 6 },
  segmentTrack: { width: 40, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: 4, borderRadius: 2 },
});
