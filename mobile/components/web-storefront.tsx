// Sadece genis web tarayicisinda (Dolap tarzi masaustu magaza gorunumu) kullanilan bilesenler.
// Telefon/Expo Go uzerindeki gercek mobil deneyimi etkilemez.
import { TakascoMark } from '@/components/brand/takasco-mark';
import { TakascoWordmark } from '@/components/brand/takasco-wordmark';
import { StyleSheet, View, Image, ScrollView } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { HeroCarousel } from '@/components/hero-carousel';
import { AnimatedModal } from '@/components/ui/animated-modal';
import { Reveal } from '@/components/ui/motion';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api, getImageUrl } from '@/utils/api';
import * as SecureStore from '@/utils/storage';
import { useNotifications } from '@/hooks/use-notifications';
import { useUnreadMessages } from '@/hooks/use-unread-messages';
import { NotificationList } from '@/components/notification-list';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { clearRecent as clearRecentStore, loadRecent, saveRecent } from '@/utils/recent-searches';

interface Category {
  id: number;
  name: string;
}

const CATEGORY_VISUALS: Record<string, { icon: any; color: string }> = {
  'Elektronik': { icon: 'desktopcomputer', color: '#2563EB' },
  'Moda': { icon: 'tshirt.fill', color: '#DB2777' },
  'Kitap & Hobi': { icon: 'book.fill', color: '#D97706' },
  'Ev & Yaşam': { icon: 'sofa.fill', color: '#0EA5A4' },
  'Spor': { icon: 'sportscourt.fill', color: '#16A34A' },
};
const DEFAULT_VISUAL = { icon: 'square.grid.2x2.fill' as const, color: Brand.accent };

function visualFor(name: string) {
  return CATEGORY_VISUALS[name] ?? DEFAULT_VISUAL;
}

interface CachedUser {
  name: string;
  is_admin?: boolean;
  profile_photo_path?: string | null;
}

interface Suggestions { products: { id: number; title: string }[]; categories: { id: number; name: string }[]; brands: string[] }
const NO_SUGGESTIONS: Suggestions = { products: [], categories: [], brands: [] };

// Üst bar: logo + arama çubuğu + hızlı erişim ikonları (Dolap'ın header'ı referans alındı)
export function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<CachedUser | null>(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestions>(NO_SUGGESTIONS);
  const { items, unread, refresh, markRead, markAllRead } = useNotifications({ enabled: !!user, poll: true });
  const { unread: unreadMessages } = useUnreadMessages(!!user);

  // Sayfa değiştikçe (ör. profil düzenlemeden dönüldüğünde) önbellekteki kullanıcıyı tazele
  useEffect(() => {
    SecureStore.getItemAsync('user').then((raw) => {
      if (!raw) return setUser(null);
      try { setUser(JSON.parse(raw)); } catch { setUser(null); }
    });
  }, [pathname]);

  // 2+ karakterde kısa bir beklemeyle gerçek ilan/kategori/marka önerileri getirilir
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSuggestions(NO_SUGGESTIONS);
      return;
    }
    const timer = setTimeout(() => {
      api.get('/search/suggestions', { params: { q: term } }).then((r) => setSuggestions(r.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const runSearch = (term: string) => {
    setSearchFocused(false);
    setQuery(term);
    saveRecent(term).catch(() => {});
    router.push(`/(tabs)/search?q=${encodeURIComponent(term)}`);
  };

  const clearRecent = async () => {
    setRecent([]);
    await clearRecentStore();
  };

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed) saveRecent(trimmed).catch(() => {});
    setSearchFocused(false);
    // Aynı /search ekranındayken tekrar arama yapıldığında expo-router'ın
    // eski parametreleri (ör. categoryId) sessizce koruyup q'yu görmezden
    // gelmesini önlemek için düz bir URL string'i ile tam yeniden gezinme yapılır.
    router.push(trimmed ? `/(tabs)/search?q=${encodeURIComponent(trimmed)}` : '/(tabs)/search');
  };

  const isFavoritesActive = pathname === '/favorites';
  const isOffersActive = pathname === '/offers';
  const isProfileActive = pathname === '/profile';

  return (
    <View style={[webStyles.headerBar, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border }]}>
      <TouchableOpacity style={webStyles.logoRow} onPress={() => router.push('/(tabs)')} accessibilityRole="link" accessibilityLabel="TakasCo ana sayfa">
        <TakascoMark size={32} variant="light" animate="entrance" />
        <TakascoWordmark size={22} />
      </TouchableOpacity>

      <View style={webStyles.searchWrap}>
        <View style={[webStyles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <IconSymbol name="magnifyingglass" size={18} color={theme.textSecondary} />
          <TextInput
            style={[webStyles.searchInput, { color: theme.text }]}
            placeholder="Marka, kategori veya ürün ara"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            onFocus={() => { setSearchFocused(true); loadRecent().then(setRecent); }}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            returnKeyType="search"
          />
        </View>
        {searchFocused && (() => {
          const term = query.trim();
          const hasSuggestions = suggestions.products.length + suggestions.categories.length + suggestions.brands.length > 0;
          const showRecent = term.length < 2 && recent.length > 0;
          if (!showRecent && !(term.length >= 2 && hasSuggestions)) return null;
          const row = (key: string, label: string, onPress: () => void, hint?: string) => (
            <TouchableOpacity key={key} onPress={onPress} accessibilityRole="link" style={webStyles.suggestRow}>
              <ThemedText style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>{label}</ThemedText>
              {!!hint && <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>{hint}</ThemedText>}
            </TouchableOpacity>
          );
          return (
            <View style={[webStyles.suggestBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              {showRecent ? (
                <>
                  <View style={webStyles.suggestHeader}>
                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>SON ARAMALAR</ThemedText>
                    <TouchableOpacity onPress={clearRecent} accessibilityRole="button"><ThemedText style={{ fontSize: 12, color: Brand.accent }}>Temizle</ThemedText></TouchableOpacity>
                  </View>
                  {recent.map((t) => row(`r-${t}`, t, () => runSearch(t)))}
                </>
              ) : (
                <>
                  {suggestions.products.map((p) => row(`p-${p.id}`, p.title, () => { setSearchFocused(false); router.push(`/product/${p.id}`); }, 'İlan'))}
                  {suggestions.categories.map((c) => row(`c-${c.id}`, c.name, () => { setSearchFocused(false); router.push(`/(tabs)/search?categoryId=${c.id}&categoryName=${encodeURIComponent(c.name)}`); }, 'Kategori'))}
                  {suggestions.brands.map((b) => row(`b-${b}`, b, () => runSearch(b), 'Marka'))}
                </>
              )}
            </View>
          );
        })()}
        <TouchableOpacity style={[webStyles.searchBtn, { backgroundColor: Brand.accent }]} onPress={handleSearch}>
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Ara</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={webStyles.iconsRow}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/add')} accessibilityRole="button" accessibilityLabel="İlan Ekle" style={webStyles.headerIconBtn}>
          <IconSymbol name="plus.circle.fill" size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/favorites')}
          accessibilityRole="button"
          accessibilityLabel="Favorilerim"
          style={[webStyles.headerIconBtn, isFavoritesActive && { backgroundColor: Brand.danger + '15' }]}
        >
          <IconSymbol name="heart.fill" size={22} color={Brand.danger} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/offers')}
          accessibilityRole="button"
          accessibilityLabel="Tekliflerim"
          style={[webStyles.headerIconBtn, isOffersActive && { backgroundColor: Brand.accent + '15' }]}
        >
          <IconSymbol name="arrow.left.arrow.right" size={22} color={isOffersActive ? Brand.accent : theme.text} />
        </TouchableOpacity>
        {!!user && (
          <TouchableOpacity
            onPress={() => router.push('/messages')}
            accessibilityRole="button"
            accessibilityLabel={unreadMessages > 0 ? `Mesajlar, ${unreadMessages} okunmamış` : 'Mesajlar'}
            style={[webStyles.headerIconBtn, pathname === '/messages' && { backgroundColor: Brand.accent + '15' }]}
          >
            <IconSymbol name="message.fill" size={22} color={pathname === '/messages' ? Brand.accent : theme.text} />
            {unreadMessages > 0 && (
              <View style={webStyles.bellBadge}>
                <ThemedText style={webStyles.bellBadgeText}>{unreadMessages > 9 ? '9+' : unreadMessages}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        )}
        {!!user && (
          <TouchableOpacity
            onPress={() => { setBellOpen(true); refresh(); }}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Bildirimler, ${unread} okunmamış` : 'Bildirimler'}
            style={[webStyles.headerIconBtn, bellOpen && { backgroundColor: Brand.accent + '15' }]}
          >
            <IconSymbol name="bell.fill" size={22} color={bellOpen ? Brand.accent : theme.text} />
            {unread > 0 && (
              <View style={webStyles.bellBadge}>
                <ThemedText style={webStyles.bellBadgeText}>{unread > 9 ? '9+' : unread}</ThemedText>
              </View>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profilim"
          style={[webStyles.headerIconBtn, webStyles.profileBtn, isProfileActive && { backgroundColor: Brand.accent + '15' }]}
        >
          {user?.profile_photo_path ? (
            <Image source={{ uri: getImageUrl(user.profile_photo_path) || undefined }} style={webStyles.headerAvatar} />
          ) : (
            <IconSymbol name="person.fill" size={22} color={isProfileActive ? Brand.accent : theme.text} />
          )}
          {!!user?.name && (
            <ThemedText style={{ fontSize: 13, fontWeight: '600', color: isProfileActive ? Brand.accent : theme.text }} numberOfLines={1}>
              {user.name.split(' ')[0]}
            </ThemedText>
          )}
        </TouchableOpacity>
        {!!user?.is_admin && (
          <TouchableOpacity
            onPress={() => router.push('/admin')}
            accessibilityRole="link"
            accessibilityLabel="Yönetim paneli"
            style={[webStyles.headerIconBtn, { paddingHorizontal: Spacing.three, borderWidth: 1, borderColor: Brand.accent + '30' }, pathname === '/admin' && { backgroundColor: Brand.accent + '15' }]}
          >
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: Brand.accent }}>Yönetim</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <AnimatedModal visible={bellOpen} onClose={() => setBellOpen(false)} variant="dropdown">
          <View style={[webStyles.bellPanel, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[webStyles.bellPanelHeader, { borderBottomColor: theme.border }]}>
              <ThemedText style={{ fontWeight: '800', fontSize: 16 }}>Bildirimler</ThemedText>
              {unread > 0 && (
                <TouchableOpacity onPress={markAllRead} accessibilityRole="button">
                  <ThemedText style={{ color: Brand.accent, fontSize: 13, fontWeight: '700' }}>Tümünü okundu işaretle</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {items.length === 0 ? (
              <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', padding: Spacing.six }}>
                Henüz bildirimin yok.
              </ThemedText>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                <NotificationList
                  items={items}
                  limit={8}
                  onPressItem={(n) => {
                    if (!n.read_at) markRead(n.id);
                    setBellOpen(false);
                    if (n.product_id) router.push(`/product/${n.product_id}`);
                    else router.push('/(tabs)/offers');
                  }}
                />
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => { setBellOpen(false); router.push('/notifications'); }}
              accessibilityRole="link"
              style={[webStyles.bellPanelFooter, { borderTopColor: theme.border }]}
            >
              <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }}>Tüm bildirimleri gör</ThemedText>
            </TouchableOpacity>
          </View>
        </AnimatedModal>
    </View>
  );
}

// Header altındaki yatay kategori menüsü
export function CategoryNav({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const theme = useTheme();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ categoryId?: string }>();
  const activeCategoryId = pathname === '/search' ? params.categoryId : undefined;

  if (categories.length === 0) return null;
  return (
    <View style={[webStyles.navBar, { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border }]}>
      {categories.map((cat) => {
        const active = activeCategoryId === String(cat.id);
        return (
          <TouchableOpacity
            key={cat.id}
            style={webStyles.navItemBtn}
            {...({ dataSet: { nav: 'link', active: active ? 'true' : 'false' } } as any)}
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { categoryId: cat.id, categoryName: cat.name } })}
          >
            <ThemedText style={[webStyles.navItem, { color: active ? Brand.accent : theme.text, fontWeight: active ? '800' : '600' }]}>
              {cat.name}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Kategori banner grid'i (Dolap ana sayfasındaki "Elbise / Ayakkabı / Çanta / Aksesuar" kartları)
export function CategoryBanners({ categories }: { categories: Category[] }) {
  const router = useRouter();
  if (categories.length === 0) return null;
  return (
    <Reveal style={webStyles.bannerGrid}>
      {categories.map((cat) => {
        const visual = visualFor(cat.name);
        return (
          <TouchableOpacity
            key={cat.id}
            style={[webStyles.bannerCard, { backgroundColor: visual.color + '1A', borderColor: visual.color + '33' }]}
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { categoryId: cat.id, categoryName: cat.name } })}
          >
            <View style={[webStyles.bannerIconCircle, { backgroundColor: visual.color }]}>
              <IconSymbol name={visual.icon} size={26} color="#fff" />
            </View>
            <ThemedText style={webStyles.bannerTitle}>{cat.name}</ThemedText>
            <ThemedText style={[webStyles.bannerLink, { color: visual.color }]}>Keşfet →</ThemedText>
          </TouchableOpacity>
        );
      })}
    </Reveal>
  );
}

// Popüler arama önerileri (statik, Dolap'taki "Popüler Aramalar" satırı gibi)
export function PopularSearches({ terms }: { terms: string[] }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <View style={webStyles.popularWrap}>
      <ThemedText style={[webStyles.popularLabel, { color: theme.textSecondary }]}>POPÜLER ARAMALAR</ThemedText>
      <View style={webStyles.popularRow}>
        {terms.map((term) => (
          <TouchableOpacity
            key={term}
            style={[webStyles.popularPill, { borderColor: theme.border }]}
            onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: term } })}
          >
            <ThemedText style={{ color: theme.text }}>{term}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Ana sayfa üst kısmındaki büyük tanıtım alanı (Dolap'ın "Dolap'ta sat..." hero'su)
// Ana sayfa vitrini: bkz. components/hero-carousel.tsx (gerçek ilanlarla, otomatik oynatmalı, fareyle duran carousel)
export function HomeHero() {
  return <HeroCarousel />;
}

export function SellCta() {
  const router = useRouter();
  const theme = useTheme();
  return (
    <View style={[webStyles.sellCta, { backgroundColor: theme.backgroundSelected }]}>
      <View style={{ flex: 1, gap: Spacing.two }}>
        <ThemedText style={{ color: Brand.accent, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 }}>İLAN VER</ThemedText>
        <ThemedText style={[webStyles.sellCtaTitle, { color: Brand.wordmark }]}>Kullanmadıkların birine değer katsın</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 14 }}>Dakikalar içinde ilan ver, teklifleri uygulamadan yönet. İlan vermek tamamen ücretsiz.</ThemedText>
      </View>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/add')} style={[webStyles.heroBtnFilled, { backgroundColor: Brand.accent }]}>
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Ücretsiz İlan Ver</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

// Alt kısımdaki güven rozetleri (Dolap'ın "Güvenli ödeme / Anlaşmalı kargo / Uygun fiyat" satırı)
export function TrustBadges() {
  const theme = useTheme();
  const items: { icon: any; title: string; desc: string }[] = [
    { icon: 'checkmark.seal.fill', title: 'Güvenli Takas', desc: 'Hesabın korunur, iletişim bilgilerin yalnızca takas kabul edilince paylaşılır' },
    { icon: 'arrow.left.arrow.right', title: 'Doğrudan İletişim', desc: 'Teklif kabul edilince iletişim bilgileri paylaşılır' },
    { icon: 'sofa.fill', title: 'Döngüsel Ekonomi', desc: 'Kullanmadıklarını değerlendir, israfı önle' },
  ];
  return (
    <View style={webStyles.trustRow}>
      {items.map((item) => (
        <View key={item.title} style={webStyles.trustItem}>
          <View style={[webStyles.trustIconCircle, { backgroundColor: Brand.accent + '1A' }]}>
            <IconSymbol name={item.icon} size={22} color={Brand.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: '700', fontSize: 14 }}>{item.title}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{item.desc}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

// Tabs navigator'ın paylaşılan header'ı: üst bar + kategori menüsü tek seferde
export function StorefrontHeader() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  return (
    <View>
      <WebHeader />
      <CategoryNav categories={categories} />
    </View>
  );
}

// "Nasıl çalışır?" — üç adımda takas akışı
export function HowItWorks() {
  const theme = useTheme();
  const steps: { n: string; title: string; desc: string }[] = [
    { n: '1', title: 'İlan ver', desc: 'Kullanmadığın eşyanın fotoğrafını ekle, ne karşılığında takas etmek istediğini yaz.' },
    { n: '2', title: 'Teklif gönder veya al', desc: 'Beğendiğin ilana kendi ürünlerinden birini teklif et; sana gelen teklifleri incele.' },
    { n: '3', title: 'Takas et', desc: 'Teklif kabul edilince iletişim bilgileri paylaşılır, buluşup eşyaları değiştirirsiniz.' },
  ];
  return (
    <View style={webStyles.howWrap}>
      <ThemedText style={{ fontSize: 22, fontWeight: '800', color: Brand.wordmark }}>TakasCo nasıl çalışır?</ThemedText>
      <View style={webStyles.howRow}>
        {steps.map((step) => (
          <View key={step.n} style={[webStyles.howCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[webStyles.howNumber, { backgroundColor: Brand.accent }]}>
              <ThemedText style={{ color: '#fff', fontWeight: '800' }}>{step.n}</ThemedText>
            </View>
            <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>{step.title}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>{step.desc}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

// En çok favorilenen ilanlar — yalnızca gerçekten favorilenmiş ilan varsa gösterilir (sahte içerik yok)
export function PopularListings() {
  return (
    <ListingStrip
      title="Popüler İlanlar"
      params={{ sort: 'popular', per_page: 5 }}
      filter={(p) => p.favorited_by_count > 0}
      subtitle={(p) => `♥ ${p.favorited_by_count} favori`}
    />
  );
}

// giriş yapmış kullanıcının kendi etkinliğinden (favoriler, ilanlar, kayıtlı aramalar) türetilen öneriler; sinyal yoksa görünmez
export function RecommendedListings() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('auth_token').then((t) => setLoggedIn(!!t)).catch(() => {});
  }, []);

  if (!loggedIn) return null;

  return <ListingStrip title="Sana Özel" endpoint="/recommendations" params={{}} subtitle={(p) => p.reason ?? ''} />;
}

// kullanıcının kayıtlı şehrindeki gerçek ilanlar; şehir yoksa veya ilan yoksa hiç gösterilmez
export function CityListings() {
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('user')
      .then((s) => setCity(s ? JSON.parse(s).city || null : null))
      .catch(() => {});
  }, []);

  if (!city) return null;

  return <ListingStrip title={`${city} Şehrindeki İlanlar`} params={{ city, per_page: 5 }} subtitle={(p) => p.condition} />;
}

function ListingStrip({ title, params, filter, subtitle, endpoint = '/products' }: { title: string; params: Record<string, any>; filter?: (p: any) => boolean; subtitle: (p: any) => string; endpoint?: string }) {
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useIsDesktopWeb();
  const [items, setItems] = useState<any[]>([]);
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    api.get(endpoint, { params: JSON.parse(paramKey) })
      .then((res) => setItems((res.data.data ?? []).slice(0, 5).filter(filter ?? (() => true))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey, endpoint]);

  if (items.length === 0) return null;

  // masaüstünde sarmalı ızgara, telefonda yatay kaydırılan şerit
  const cards = (
      <View style={isDesktop ? webStyles.popularListRow : webStyles.stripRow}>
        {items.map((item) => {
          const raw = item.thumb_path ?? item.images?.[0]?.thumb_path ?? item.image_path;
          const path = typeof raw === 'string' && raw.startsWith('[') ? JSON.parse(raw)[0] : raw;
          return (
            <TouchableOpacity
              key={item.id}
              style={[webStyles.popularListCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => router.push(`/product/${item.id}`)}
              accessibilityRole="link"
              accessibilityLabel={item.title}
            >
              <View style={[webStyles.popularListImage, { backgroundColor: theme.backgroundSelected }]}>
                {!!path && <Image source={{ uri: getImageUrl(path) || undefined }} style={{ width: '100%', height: '100%' }} />}
              </View>
              <View style={{ padding: Spacing.three, gap: 2 }}>
                <ThemedText style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: Brand.danger }}>{subtitle(item)}</ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
  );

  return (
    <Reveal style={isDesktop ? webStyles.popularListWrap : webStyles.stripWrap}>
      <ThemedText style={{ fontSize: isDesktop ? 22 : 18, fontWeight: '800' }}>{title}</ThemedText>
      {isDesktop ? cards : <ScrollView horizontal showsHorizontalScrollIndicator={false}>{cards}</ScrollView>}
    </Reveal>
  );
}

// Masaüstü sayfalarının altındaki site footer'ı (gerçek sayfalara giden bağlantılar)
export function SiteFooter() {
  const router = useRouter();
  const theme = useTheme();

  const columns: { title: string; links: { label: string; onPress: () => void }[] }[] = [
    {
      title: 'Keşfet',
      links: [
        { label: 'Tüm İlanlar', onPress: () => router.push('/(tabs)/search') },
        { label: 'İlan Ver', onPress: () => router.push('/(tabs)/add') },
        { label: 'Favorilerim', onPress: () => router.push('/favorites') },
      ],
    },
    {
      title: 'TakasCo',
      links: [
        { label: 'Hakkımızda', onPress: () => router.push('/hakkimizda') },
        { label: 'Nasıl Çalışır?', onPress: () => router.push('/nasil-calisir') },
        { label: 'Güvenli Takas', onPress: () => router.push('/guvenli-takas') },
        { label: 'Sık Sorulan Sorular', onPress: () => router.push('/sss') },
        { label: 'İletişim', onPress: () => router.push('/iletisim') },
      ],
    },
    {
      title: 'Yasal',
      links: [
        { label: 'Topluluk Kuralları', onPress: () => router.push('/topluluk-kurallari') },
        { label: 'Kullanım Koşulları', onPress: () => router.push('/terms') },
        { label: 'Gizlilik Politikası', onPress: () => router.push('/privacy-policy') },
        { label: 'KVKK Aydınlatma Metni', onPress: () => router.push('/kvkk') },
      ],
    },
  ];

  return (
    <View style={[footerStyles.footer, { borderTopColor: theme.border }]}>
      <View style={footerStyles.row}>
        <View style={footerStyles.brandCol}>
          <View style={webStyles.logoRow}>
            <TakascoMark size={32} variant="light" animate="entrance" />
            <TakascoWordmark size={22} />
          </View>
          <ThemedText style={{ fontWeight: '700', color: Brand.wordmark }}>Değiştir. Keşfet. Yeniden değerlendir.</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
            Kullanmadığın eşyalar başka birinin ihtiyacı olabilir. TakasCo ile eşyalarını takas et, israfı azalt.
          </ThemedText>
        </View>
        {columns.map((col) => (
          <View key={col.title} style={footerStyles.col}>
            <ThemedText style={[footerStyles.colTitle, { color: theme.textSecondary }]}>{col.title.toLocaleUpperCase('tr-TR')}</ThemedText>
            {col.links.map((link) => (
              <TouchableOpacity key={link.label} onPress={link.onPress} accessibilityRole="link" style={webStyles.navItemBtn}>
                <ThemedText style={{ fontSize: 14 }} {...({ dataSet: { textlink: 'true' } } as any)}>{link.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>© {new Date().getFullYear()} TakasCo. Tüm hakları saklıdır.</ThemedText>
    </View>
  );
}

const footerStyles = StyleSheet.create({
  footer: { borderTopWidth: 1, marginTop: Spacing.eight, paddingTop: Spacing.six, paddingBottom: Spacing.six, gap: Spacing.five },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.seven },
  brandCol: { flexBasis: 320, flexGrow: 2, gap: Spacing.three },
  col: { flexBasis: 160, flexGrow: 1, gap: Spacing.two },
  colTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: Spacing.one },
});

export const webStyles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.six,
    paddingHorizontal: Spacing.seven,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    zIndex: 30, // arama önerileri altındaki sayfa içeriğinin üstünde görünsün
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, cursor: 'pointer' as any },
  suggestBox: { position: 'absolute' as any, top: 48, left: 0, right: 0, borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.one, zIndex: 50, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 2, cursor: 'pointer' as any },
  suggestHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  searchWrap: { flex: 1, flexDirection: 'row', maxWidth: 640, gap: Spacing.two },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.four, height: 44 },
  searchInput: { flex: 1, fontSize: 15, height: '100%', outlineStyle: 'none' as any },
  searchBtn: { paddingHorizontal: Spacing.six, height: 44, borderRadius: Radius.full, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
  iconsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  headerIconBtn: { padding: Spacing.one, borderRadius: Radius.full, cursor: 'pointer' as any },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two },
  headerAvatar: { width: 24, height: 24, borderRadius: 12 },
  bellBadge: { position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: Brand.danger, justifyContent: 'center', alignItems: 'center' },
  bellBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 12 },
  bellBackdrop: { flex: 1, backgroundColor: 'transparent' },
  bellPanel: { position: 'absolute', top: 64, right: Spacing.seven, width: 380, maxWidth: '92%', borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  bellPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four, borderBottomWidth: 1 },
  bellPanelFooter: { padding: Spacing.three, alignItems: 'center', borderTopWidth: 1 },

  navBar: { flexDirection: 'row', gap: Spacing.six, paddingHorizontal: Spacing.seven, paddingVertical: Spacing.three, borderBottomWidth: 1 },
  navItemBtn: { paddingVertical: Spacing.one, cursor: 'pointer' as any },
  navItem: { fontSize: 15, fontWeight: '600' },
  navItemUnderline: { height: 2, borderRadius: 1, marginTop: 4 },

  // Not: bu bilesenler (tab)/index.tsx'teki FlatList'in ListHeader/Footer'i olarak
  // kullanilir; o listenin contentContainerStyle'i zaten yatay kenar bosluklarini
  // sagladigi icin burada ekstra paddingHorizontal/marginHorizontal eklenmez.
  bannerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, paddingTop: Spacing.six },
  bannerCard: { flexBasis: 220, flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.five, gap: Spacing.two, cursor: 'pointer' as any },
  bannerIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.two },
  bannerTitle: { fontSize: 18, fontWeight: '700' },
  bannerLink: { fontSize: 13, fontWeight: '600' },

  popularWrap: { paddingTop: Spacing.six, gap: Spacing.two },
  popularLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  popularPill: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.full, borderWidth: 1, cursor: 'pointer' as any },

  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, padding: Spacing.seven, gap: Spacing.six },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: Spacing.three, paddingVertical: 4, borderRadius: Radius.full },
  heroBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { fontSize: 34, fontWeight: '800', lineHeight: 40 },
  heroBtnFilled: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full, cursor: 'pointer' as any },
  heroBtnOutline: { paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full, borderWidth: 1.5, cursor: 'pointer' as any },
  heroEmblem: { width: 250, height: 250, justifyContent: 'center', alignItems: 'center' },
  heroRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: Brand.accent },
  heroDot: { position: 'absolute', borderRadius: 99 },
  heroIconCircle: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center' },

  sellCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.eight, borderRadius: Radius.lg, padding: Spacing.six, gap: Spacing.six },
  sellCtaTitle: { fontSize: 22, fontWeight: '800' },

  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.six, marginTop: Spacing.seven, marginBottom: Spacing.four },
  trustItem: { flexBasis: 260, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },

  howWrap: { marginTop: Spacing.eight, gap: Spacing.four },
  howRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  howCard: { flexBasis: 260, flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.five, gap: Spacing.two },
  howNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.one },

  stripWrap: { paddingTop: Spacing.four, gap: Spacing.three },
  stripRow: { flexDirection: 'row', gap: Spacing.three },
  popularListWrap: { paddingTop: Spacing.seven, gap: Spacing.four },
  popularListRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  popularListCard: { width: 200, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', cursor: 'pointer' as any },
  popularListImage: { height: 130 },
  trustIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
