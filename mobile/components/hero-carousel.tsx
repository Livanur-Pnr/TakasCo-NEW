import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useReducedMotion } from '@/components/ui/motion';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { Distance, Duration, Ease } from '@/constants/motion';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { useTheme } from '@/hooks/use-theme';
import { api, getImageUrl } from '@/utils/api';
import { formatPrice } from '@/utils/listing';

// Ana sayfa vitrini (carousel). İçerik tamamen gerçek: ilk slayt TakasCo tanıtımı, sonrakiler en çok favorilenen ilanlar.
// İlan yoksa yalnızca tanıtım slaytı görünür (uydurma reklam/içerik yoktur).
// Geçiş: çıkan slayt solar ve hafif büyür, gelen slayt belirir ve yerine oturur; metin ve düğme sırayla belirir.
// Otomatik oynatma 6 sn, fareyle durur, ilerleme çubuğu süreyi gösterir. "Hareketi azalt" açıkken otomatik oynatma kapalıdır.

const SLIDE_MS = 6000;

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
  const zoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const d = reduced ? 0 : Duration.ad;
    Animated.timing(fade, { toValue: active ? 1 : 0, duration: d, easing: Ease.emphasized, useNativeDriver: true }).start();
    if (active) {
      text.setValue(reduced ? 1 : 0);
      cta.setValue(reduced ? 1 : 0);
      if (!reduced) {
        Animated.timing(text, { toValue: 1, duration: Duration.slow, delay: 180, easing: Ease.decelerate, useNativeDriver: true }).start();
        Animated.timing(cta, { toValue: 1, duration: Duration.slow, delay: 320, easing: Ease.decelerate, useNativeDriver: true }).start();
      }
    }
  }, [active, reduced, fade, text, cta]);

  useEffect(() => {
    Animated.timing(zoom, { toValue: hovered && active && !reduced ? 1 : 0, duration: Duration.slow, easing: Ease.standard, useNativeDriver: true }).start();
  }, [hovered, active, reduced, zoom]);

  const enter = fade.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }); // çıkarken 1 → 1.02, girerken 1.02 → 1
  const textStyle = { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [Distance.sm + 2, 0] }) }] };
  const ctaStyle = { opacity: cta, transform: [{ translateY: cta.interpolate({ inputRange: [0, 1], outputRange: [Distance.sm, 0] }) }] };

  const p = slide.product;
  const imagePath = p ? (p.images?.[0]?.image_path ?? p.image_path) : null;
  const clean = typeof imagePath === 'string' && imagePath.startsWith('[') ? JSON.parse(imagePath)[0] : imagePath;
  const price = p ? formatPrice(p.price) : null;

  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      {...({ 'aria-hidden': !active } as any)}
      style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale: enter }] }]}
    >
      <View style={[styles.slide, compact && styles.slideCompact, { height, backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.textCol, compact && { flex: undefined }]}>
          <Animated.View style={textStyle}>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{slide.kind === 'brand' ? 'GÜVENLİ VE ÜCRETSİZ' : 'ÖNE ÇIKAN İLAN'}</ThemedText>
            </View>
            <ThemedText style={[compact ? styles.titleCompact : styles.title, { color: Brand.wordmark }]} numberOfLines={3}>
              {slide.kind === 'brand' ? "TakasCo'da takasla, kullanmadıkların birinin favorisi olsun" : p.title}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22, marginTop: Spacing.two }} numberOfLines={3}>
              {slide.kind === 'brand'
                ? 'Eşyalarını satışa çıkarmadan, ihtiyacın olan şeylerle değiştir. Ücretsiz ilan ver, güvenle takasla.'
                : [price, p.city, p.swap_expectation && p.listing_type !== 'satilik' ? `Takas: ${p.swap_expectation}` : null].filter(Boolean).join(' · ')}
            </ThemedText>
          </Animated.View>

          <Animated.View style={[ctaStyle, { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four, flexWrap: 'wrap' }]}>
            {slide.kind === 'brand' ? (
              <>
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/add')} style={[styles.btnFilled, { backgroundColor: Brand.accent }]}>
                  <ThemedText style={{ color: '#fff', fontWeight: '700' }}>İlan Ver</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/search')} style={[styles.btnOutline, { borderColor: Brand.accent }]}>
                  <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Keşfetmeye Başla →</ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push(`/product/${p.id}`)} style={[styles.btnFilled, { backgroundColor: Brand.accent }]}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>İlana Git →</ThemedText>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        {!compact && (
          <View style={styles.mediaCol} pointerEvents="none">
            {slide.kind === 'listing' && clean ? (
              <Animated.View style={[styles.media, { transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }] }]}>
                <Image source={{ uri: getImageUrl(clean) || undefined }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Animated.View>
            ) : (
              <View style={[styles.emblem, { backgroundColor: Brand.accent }]}>
                <IconSymbol name="arrow.left.arrow.right" size={64} color="#fff" />
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function HeroCarousel() {
  const theme = useTheme();
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

  const height = desktop ? 300 : 360;

  return (
    <View
      accessibilityLabel="Öne çıkanlar"
      {...({ 'aria-roledescription': 'carousel' } as any)}
      style={[styles.wrap, desktop ? { marginHorizontal: Spacing.seven, marginTop: Spacing.six } : { marginHorizontal: Spacing.four, marginTop: Spacing.three }]}
      {...pan.panHandlers}
    >
      <Pressable onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={[styles.frame, { height, backgroundColor: theme.backgroundSelected, cursor: 'default' as any }]}>
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
                <View style={styles.segmentTrack}>
                  {i === index && (
                    <Animated.View
                      style={[styles.segmentFill, { width: '100%', transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] }]}
                    />
                  )}
                  {i < index && <View style={[styles.segmentFill, { width: '100%' }]} />}
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
  frame: { borderRadius: Radius.lg, overflow: 'hidden' },
  slide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.seven, gap: Spacing.six },
  slideCompact: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: Spacing.five },
  textCol: { flex: 1, maxWidth: 560 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.65)', paddingHorizontal: Spacing.three, paddingVertical: 4, borderRadius: Radius.full, marginBottom: Spacing.three },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  title: { fontSize: 32, fontWeight: '800', lineHeight: 38 },
  titleCompact: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  btnFilled: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full },
  btnOutline: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full, borderWidth: 1.5 },
  mediaCol: { width: 300, alignItems: 'center', justifyContent: 'center' },
  media: { width: 300, height: 220, borderRadius: Radius.lg, overflow: 'hidden' },
  emblem: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center' },
  arrow: { position: 'absolute', top: '45%', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  segments: { position: 'absolute', bottom: Spacing.three, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  segmentHit: { paddingVertical: 6 },
  segmentTrack: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(20, 70, 45, 0.18)', overflow: 'hidden' },
  segmentFill: { height: 4, borderRadius: 2, backgroundColor: Brand.accent },
});
