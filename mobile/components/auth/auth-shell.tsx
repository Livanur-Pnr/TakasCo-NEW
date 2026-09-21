import { ReactNode } from 'react';
import { Image, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeatureChips } from '@/components/auth/feature-chips';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FadeInUp } from '@/components/ui/motion';
import { TouchableOpacity } from '@/components/ui/touchable';
import { Brand, Gradient, Radius, Spacing } from '@/constants/theme';
import { Duration, Shadow } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';

export const AUTH_SLOGAN = 'Eşyalarınızı kolayca takas edin, yenilerini keşfedin ve israfı önleyin.';

export type AuthLayout = 'desktop' | 'tablet' | 'mobile';

// Ekran genişliğine göre üç ayrı kompozisyon: masaüstü (bölünmüş: marka paneli + form), tablet (ortalanmış kart), telefon (kompakt, kartsız form)
export function useAuthLayout(): AuthLayout {
  const { width } = useWindowDimensions();
  return width >= 1000 ? 'desktop' : width >= 640 ? 'tablet' : 'mobile';
}

const web = Platform.OS === 'web';
const webOnly = (style: object) => (web ? (style as any) : null);

// Kart içi öğelerin sıralı girişi: kısa (≈50 ms) adımlarla, toplamda yarım saniyeyi geçmez
export function AuthItem({ i, children }: { i: number; children: ReactNode }) {
  return <FadeInUp delay={70 + Math.min(i, 6) * 45} distance={8}>{children}</FadeInUp>;
}

// Ekran başlığı + açıklaması (Giriş, Kayıt, Şifre…): güçlü ama ekranı kaplamayan boyut
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="title" accessibilityRole="header" style={{ color: Brand.wordmark, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 }}>{title}</ThemedText>
      {!!subtitle && <ThemedText style={{ opacity: 0.68, lineHeight: 22 }}>{subtitle}</ThemedText>}
    </View>
  );
}

// "veya" ayırıcısı
export function AuthDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(16, 40, 28, 0.10)' }} />
      <ThemedText style={{ fontSize: 12, opacity: 0.55 }}>{label}</ThemedText>
      <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(16, 40, 28, 0.10)' }} />
    </View>
  );
}

function LogoTile({ size }: { size: number }) {
  return (
    <View style={[styles.tile, { width: size + 20, height: size + 20, borderRadius: (size + 20) / 3.2 }]}>
      <Image source={require('@/assets/images/takasco-logo.png')} style={{ width: size, height: size }} accessibilityLabel="TakasCo logosu" />
    </View>
  );
}

function MockCard({ icon }: { icon: 'tshirt.fill' | 'book.fill' | 'desktopcomputer' }) {
  return (
    <View style={[styles.mock, webOnly({ backdropFilter: 'blur(8px)' })]}>
      <View style={styles.mockImage}>
        <IconSymbol name={icon} size={28} color="rgba(255, 255, 255, 0.92)" />
      </View>
      <View style={[styles.mockLine, { width: '72%' }]} />
      <View style={[styles.mockLine, { width: '44%', opacity: 0.6 }]} />
    </View>
  );
}

// Masaüstü sol panel: koyu yeşil zemin üzerinde soyut "takas akışı" kompozisyonu (ürün kartları + değişim düğümü + halkalar).
// Süs öğeleri düşük opaklıklı ve tıklanamaz; yalnızca transform ile çok yavaş salınır (hareket azaltmada durur).
function BrandPanel() {
  return (
    <View style={[styles.panel, webOnly({ backgroundImage: Gradient.brandPanel })]}>
      <FadeInUp distance={0} duration={Duration.slow} delay={80} style={styles.panelTop}>
        <LogoTile size={40} />
        <ThemedText style={styles.panelName}>TakasCo</ThemedText>
      </FadeInUp>

      <View style={styles.stage} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={[styles.glow, webOnly({ backgroundImage: Gradient.brandGlow })]} />
        <View style={[styles.ring, { width: 440, height: 440, borderRadius: 220, right: -110, top: -30 }]} />
        <View style={[styles.ring, { width: 260, height: 260, borderRadius: 130, left: -60, bottom: -20, opacity: 0.7 }]} />

        <View style={{ position: 'absolute', left: '4%', top: '6%', transform: [{ rotate: '-4deg' }] }}>
          <View {...({ dataSet: { ambient: 'a' } } as any)}><MockCard icon="tshirt.fill" /></View>
        </View>
        <View style={{ position: 'absolute', right: '4%', bottom: '4%', transform: [{ rotate: '3deg' }] }}>
          <View {...({ dataSet: { ambient: 'b' } } as any)}><MockCard icon="desktopcomputer" /></View>
        </View>
        <View style={{ position: 'absolute', left: '16%', bottom: '-2%', transform: [{ rotate: '2deg' }], opacity: 0.75 }}>
          <View {...({ dataSet: { ambient: 'c' } } as any)}><MockCard icon="book.fill" /></View>
        </View>
        <View style={styles.node}>
          <IconSymbol name="arrow.left.arrow.right" size={24} color={Brand.accent} />
        </View>
      </View>

      <FadeInUp distance={6} duration={Duration.slow} delay={160} style={{ gap: Spacing.five }}>
        <ThemedText style={styles.panelSlogan}>{AUTH_SLOGAN}</ThemedText>
        <FeatureChips tone="dark" align="flex-start" />
      </FadeInUp>
    </View>
  );
}

// Tablet/telefon üst marka alanı. `hero` (karşılama): büyük logo + ad + slogan + çipler; aksi hâlde kompakt logo + ad.
function BrandHeader({ hero }: { hero: boolean }) {
  if (hero) {
    return (
      <View style={styles.heroBlock}>
        <FadeInUp scaleFrom={0.96} distance={6}>
          <Image source={require('@/assets/images/takasco-logo.png')} style={styles.heroLogo} accessibilityLabel="TakasCo logosu" />
        </FadeInUp>
        <FadeInUp delay={60}>
          <ThemedText type="title" style={styles.heroName}>TakasCo</ThemedText>
        </FadeInUp>
        <FadeInUp delay={110}>
          <ThemedText style={styles.heroSlogan}>{AUTH_SLOGAN}</ThemedText>
        </FadeInUp>
        <FadeInUp delay={160}>
          <FeatureChips tone="light" />
        </FadeInUp>
      </View>
    );
  }
  return (
    <FadeInUp scaleFrom={0.97} distance={6} style={styles.compactBrand}>
      <Image source={require('@/assets/images/takasco-logo.png')} style={styles.compactLogo} accessibilityLabel="TakasCo logosu" />
      <ThemedText type="title" style={styles.compactName}>TakasCo</ThemedText>
    </FadeInUp>
  );
}

// Tüm kimlik doğrulama ekranlarının ortak iskeleti (karşılama, giriş, kayıt, şifre yenileme).
export function AuthShell({ children, hero = false, onBack }: { children: ReactNode; hero?: boolean; onBack?: () => void }) {
  const layout = useAuthLayout();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const desktop = layout === 'desktop';
  const mobile = layout === 'mobile';

  const card = (
    <FadeInUp
      duration={Duration.slow}
      style={[
        styles.card,
        !mobile && styles.cardRaised,
        !mobile && webOnly({ boxShadow: Shadow.authCard }),
        !mobile && { backgroundColor: theme.cardBg },
        desktop && { padding: 40 },
      ]}
    >
      {children}
    </FadeInUp>
  );

  const back = onBack ? (
    <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Geri" style={styles.back}>
      <IconSymbol name="chevron.left" size={18} color={theme.textSecondary} />
      <ThemedText style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>Geri</ThemedText>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }, webOnly({ backgroundImage: Gradient.authBackdrop })]}>
      {/* düşük opaklıklı yumuşak lekeler: form alanının önüne geçmez, çok yavaş süzülür */}
      {web && (
        <>
          <View pointerEvents="none" style={[styles.blob, { width: 520, height: 520, top: -200, right: -160, backgroundImage: Gradient.blobMint } as any]} {...({ dataSet: { ambient: 'c' } } as any)} />
          <View pointerEvents="none" style={[styles.blob, { width: 460, height: 460, bottom: -220, left: desktop ? '44%' : -160, backgroundImage: Gradient.blobGreen } as any]} {...({ dataSet: { ambient: 'a' } } as any)} />
        </>
      )}

      <View style={styles.split}>
        {desktop && <BrandPanel />}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingTop: Math.max(insets.top, 16) + (mobile ? 8 : 24), paddingBottom: Math.max(insets.bottom, 16) + 24, paddingHorizontal: mobile ? 20 : 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.column, hero && !desktop && { flexGrow: 1, justifyContent: 'space-between' }]}>
            {back}
            {!desktop && (
              <View style={hero ? { flex: 1, justifyContent: 'center', paddingVertical: Spacing.six } : { paddingBottom: Spacing.five }}>
                <BrandHeader hero={hero} />
              </View>
            )}
            {card}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  split: { flex: 1, flexDirection: 'row' },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: Spacing.two },
  card: { gap: Spacing.five },
  cardRaised: { borderRadius: Radius.modal, borderWidth: 1, borderColor: 'rgba(16, 40, 28, 0.07)', padding: 32 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: Spacing.two, paddingRight: Spacing.three, borderRadius: Radius.sm, minHeight: 44 },
  blob: { position: 'absolute', borderRadius: 999, opacity: 0.9 },

  tile: { backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)' },
  panel: { flex: 1, maxWidth: 640, minWidth: 460, backgroundColor: '#14532D', padding: 48, justifyContent: 'space-between', overflow: 'hidden' },
  panelTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  panelName: { color: '#ffffff', fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  panelSlogan: { color: '#ffffff', fontSize: 26, lineHeight: 36, fontWeight: '700', letterSpacing: -0.3, maxWidth: 460 },
  stage: { flex: 1, minHeight: 260, marginVertical: Spacing.six },
  glow: { position: 'absolute', width: 420, height: 420, right: '10%', top: '18%' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.10)' },
  node: { position: 'absolute', left: '50%', top: '50%', marginLeft: -28, marginTop: -28, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', ...(web ? ({ boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)' } as any) : { elevation: 4 }) },
  mock: { width: 176, padding: 12, gap: 10, borderRadius: Radius.lg, backgroundColor: 'rgba(255, 255, 255, 0.10)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.20)' },
  mockImage: { height: 68, borderRadius: Radius.md, backgroundColor: 'rgba(255, 255, 255, 0.14)', alignItems: 'center', justifyContent: 'center' },
  mockLine: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.30)' },

  heroBlock: { alignItems: 'center', gap: Spacing.three },
  heroLogo: { width: 88, height: 88 },
  heroName: { color: Brand.wordmark, fontSize: 38, lineHeight: 44, letterSpacing: -0.5, textAlign: 'center' },
  heroSlogan: { textAlign: 'center', opacity: 0.72, lineHeight: 24, maxWidth: 380, marginBottom: Spacing.two },
  compactBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  compactLogo: { width: 40, height: 40 },
  compactName: { color: Brand.wordmark, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
});
