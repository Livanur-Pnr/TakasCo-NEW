import { StyleSheet, FlatList, View, ActivityIndicator, useWindowDimensions } from 'react-native';
import { TextInput } from '@/components/ui/text-input';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FadeInUp } from '@/components/ui/motion';
import { ProductCard } from '@/components/product-card';
import { ErrorState } from '@/components/ui/error-state';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { SearchSuggestions } from '@/components/search-suggestions';
import { saveRecent } from '@/utils/recent-searches';
import { useFavorites } from '@/hooks/use-favorites';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { usePageTitle } from '@/utils/use-page-title';

interface Product {
  id: number;
  title: string;
  image_path: string | null;
  thumb_path?: string | null;
  swap_expectation: string;
  category_id: number;
  condition?: string | null;
  city?: string | null;
  created_at?: string;
  favorited_by_count?: number;
}

interface ProductsPage {
  data: Product[];
  current_page: number;
  last_page: number;
}

interface Category {
  id: number;
  name: string;
}

const CONDITIONS = ['Sıfır', 'Az Kullanılmış', 'Eskimiş'];
type SortValue = 'newest' | 'oldest' | 'popular' | 'price_asc' | 'price_desc';
const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'popular', label: 'En Çok Favorilenen' },
  { value: 'price_asc', label: 'Fiyat Artan' },
  { value: 'price_desc', label: 'Fiyat Azalan' },
  { value: 'oldest', label: 'En Eski' },
];
const TYPE_OPTIONS = [
  { value: 'takas', label: 'Takasa Açık' },
  { value: 'satilik', label: 'Satılık' },
];

// Masaüstü sidebar'daki "Kategori"/"Durum" filtre satırı (radyo görünümlü, tek seçimli)
function FilterOption({ label, selected, onPress, theme }: { label: string; selected: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      style={desktopSearchStyles.filterOptionRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[desktopSearchStyles.radioOuter, { borderColor: selected ? Brand.accent : theme.border }]}>
        {selected && <View style={desktopSearchStyles.radioInner} />}
      </View>
      <ThemedText style={{ fontSize: 14, color: selected ? Brand.accent : theme.text, fontWeight: selected ? '700' : '400' }} numberOfLines={1}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isDesktopWeb = useIsDesktopWeb();
  const { width } = useWindowDimensions();
  // Masaüstünde sidebar (~260px) ızgaradan yer kaplar, sütun sayısı ona göre hesaplanır
  const gridWidth = isDesktopWeb ? width - 260 : width;
  const numColumns = isDesktopWeb ? (gridWidth >= 1200 ? 5 : gridWidth >= 950 ? 4 : gridWidth >= 700 ? 3 : 2) : 2;
  const params = useLocalSearchParams<{ categoryId?: string, categoryName?: string, q?: string, condition?: string, sort?: string, city?: string, type?: string, minPrice?: string, maxPrice?: string }>();
  usePageTitle(params.categoryName ? `${params.categoryName} İlanları` : params.q ? `“${params.q}” araması` : 'Tüm İlanlar', params.categoryName ? `${params.categoryName} kategorisindeki takas ilanlarını keşfet.` : 'TakasCo’daki tüm takas ilanlarını filtrele, ara ve keşfet.');

  // Filtrelerin kaynağı URL: sayfa yenilense de paylaşılsa da filtreler kaybolmaz
  const selectedCondition = params.condition || null;
  const selectedCity = params.city || null;
  const sort: SortValue = SORT_OPTIONS.some((o) => o.value === params.sort) ? (params.sort as SortValue) : 'newest';
  const selectedType = params.type === 'takas' || params.type === 'satilik' ? params.type : null;
  const minPrice = params.minPrice || '';
  const maxPrice = params.maxPrice || '';
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);
  const setFilter = (key: 'condition' | 'sort' | 'city' | 'type' | 'minPrice' | 'maxPrice', value: string | null) => router.setParams({ [key]: value ?? '' });
  const applyPrice = () => router.setParams({ minPrice: minInput.replace(/\D/g, ''), maxPrice: maxInput.replace(/\D/g, '') });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(params.q ?? '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(params.q ?? '');
  const canSaveSearch = !!debouncedQuery.trim() || !!params.categoryId || !!selectedCondition || !!selectedCity;
  const saveSearch = async () => {
    try {
      await api.post('/saved-searches', {
        q: debouncedQuery.trim() || undefined,
        category_id: params.categoryId ? Number(params.categoryId) : undefined,
        city: selectedCity || undefined,
        condition: selectedCondition || undefined,
      });
      Alert.alert('Kaydedildi', 'Bu aramaya uyan yeni bir ilan yayınlanınca bildirim alacaksın.');
    } catch (e: any) {
      Alert.alert('Uyarı', e.response?.data?.message || 'Arama kaydedilemedi. Giriş yaptığından emin ol.');
    }
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    api.get<Category[]>('/categories').then(res => setCategories(res.data)).catch(() => {});
    api.get<string[]>('/cities').then(res => setCities(res.data)).catch(() => {});
  }, []);

  // WebHeader'daki arama kutusundan gelen ?q= değişirse yerel arama kutusunu da güncelle
  useEffect(() => {
    if (params.q !== undefined && params.q !== searchQuery) {
      setSearchQuery(params.q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q]);

  // arama metnini yazarken her tuş vuruşunda değil, kısa bir bekleme sonrası sorgula
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.categoryId, debouncedQuery, selectedCondition, selectedCity, selectedType, minPrice, maxPrice, sort]);

  const fetchProducts = async (pageToLoad: number) => {
    try {
      if (pageToLoad === 1) setLoading(true);
      else setLoadingMore(true);
      if (pageToLoad === 1) setError(false);
      const response = await api.get<ProductsPage>('/products', {
        params: {
          page: pageToLoad,
          per_page: 20,
          category_id: params.categoryId || undefined,
          q: debouncedQuery || undefined,
          condition: selectedCondition || undefined,
          city: selectedCity || undefined,
          listing_type: selectedType || undefined,
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          sort,
        },
      });
      setProducts(prev => pageToLoad === 1 ? response.data.data : [...prev, ...response.data.data]);
      setPage(response.data.current_page);
      setLastPage(response.data.last_page);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
      if (pageToLoad === 1) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingMore || loading || page >= lastPage) return;
    fetchProducts(page + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, loading, page, lastPage]);

  // Hem mobil hem masaüstü ızgarasında kullanılan aynı ürün kartı
  const renderProductItem = ({ item, index }: { item: Product; index: number }) => (
    <FadeInUp once={`p${item.id}`} delay={(index % 6) * 45} distance={8} style={{ flex: 1 }}>
      <ProductCard item={item} isFavorite={isFavorite(item.id)} onToggleFavorite={() => toggleFavorite(item.id)} />
    </FadeInUp>
  );

  const emptyOrErrorState = error ? (
    <ErrorState message="Sonuçlar yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={() => fetchProducts(1)} />
  ) : (
    <FadeInUp style={{ alignItems: 'center', padding: Spacing.eight, flex: 1 }}>
      <IconSymbol name="magnifyingglass" size={48} color={theme.textSecondary} />
      <ThemedText style={{ marginTop: Spacing.four, color: theme.textSecondary }}>Aramana uygun bir ilan bulamadık.</ThemedText>
    </FadeInUp>
  );

  if (isDesktopWeb) {
    const hasActiveFilters = !!params.categoryId || !!selectedCondition || !!selectedCity || !!selectedType || !!minPrice || !!maxPrice || sort !== 'newest';

    return (
      <ThemedView style={styles.container}>
        <View style={desktopSearchStyles.page}>
          <View style={desktopSearchStyles.sidebar}>
            <View style={desktopSearchStyles.sidebarHeaderRow}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>Filtreler</ThemedText>
              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={() => {
                    router.setParams({ categoryId: '', categoryName: '', condition: '', city: '', sort: '', type: '', minPrice: '', maxPrice: '' });
                    setMinInput('');
                    setMaxInput('');
                  }}
                >
                  <ThemedText style={{ color: Brand.accent, fontSize: 13, fontWeight: '600' }}>Temizle</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <View style={desktopSearchStyles.filterGroup}>
              <ThemedText style={[desktopSearchStyles.filterLabel, { color: theme.textSecondary }]}>KATEGORİ</ThemedText>
              <FilterOption
                label="Tümü"
                selected={!params.categoryId}
                onPress={() => router.setParams({ categoryId: '', categoryName: '' })}
                theme={theme}
              />
              {categories.map((cat) => (
                <FilterOption
                  key={cat.id}
                  label={cat.name}
                  selected={params.categoryId === String(cat.id)}
                  onPress={() => router.setParams({ categoryId: String(cat.id), categoryName: cat.name })}
                  theme={theme}
                />
              ))}
            </View>

            <View style={desktopSearchStyles.filterGroup}>
              <ThemedText style={[desktopSearchStyles.filterLabel, { color: theme.textSecondary }]}>İLAN TÜRÜ</ThemedText>
              <FilterOption label="Tümü" selected={!selectedType} onPress={() => setFilter('type', null)} theme={theme} />
              {TYPE_OPTIONS.map((t) => (
                <FilterOption key={t.value} label={t.label} selected={selectedType === t.value} onPress={() => setFilter('type', selectedType === t.value ? null : t.value)} theme={theme} />
              ))}
            </View>

            <View style={desktopSearchStyles.filterGroup}>
              <ThemedText style={[desktopSearchStyles.filterLabel, { color: theme.textSecondary }]}>FİYAT ARALIĞI (TL)</ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                <TextInput
                  value={minInput}
                  onChangeText={setMinInput}
                  onEndEditing={applyPrice}
                  onSubmitEditing={applyPrice}
                  placeholder="En az"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  accessibilityLabel="En düşük fiyat"
                  style={[styles.priceInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={maxInput}
                  onChangeText={setMaxInput}
                  onEndEditing={applyPrice}
                  onSubmitEditing={applyPrice}
                  placeholder="En çok"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  accessibilityLabel="En yüksek fiyat"
                  style={[styles.priceInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                />
              </View>
            </View>

            <View style={desktopSearchStyles.filterGroup}>
              <ThemedText style={[desktopSearchStyles.filterLabel, { color: theme.textSecondary }]}>ÜRÜN DURUMU</ThemedText>
              <FilterOption label="Tümü" selected={!selectedCondition} onPress={() => setFilter('condition', null)} theme={theme} />
              {CONDITIONS.map((cond) => (
                <FilterOption
                  key={cond}
                  label={cond}
                  selected={selectedCondition === cond}
                  onPress={() => setFilter('condition', selectedCondition === cond ? null : cond)}
                  theme={theme}
                />
              ))}
            </View>
          {cities.length > 0 && (
            <View style={desktopSearchStyles.filterGroup}>
              <ThemedText style={[desktopSearchStyles.filterLabel, { color: theme.textSecondary }]}>ŞEHİR</ThemedText>
              <FilterOption label="Tümü" selected={!selectedCity} onPress={() => setFilter('city', null)} theme={theme} />
              {cities.map((c) => (
                <FilterOption key={c} label={c} selected={selectedCity === c} onPress={() => setFilter('city', selectedCity === c ? null : c)} theme={theme} />
              ))}
            </View>
          )}
          </View>

          <View style={desktopSearchStyles.resultsCol}>
            <View style={desktopSearchStyles.resultsHeaderRow}>
              <ThemedText type="title" style={{ fontSize: 22, color: Brand.wordmark }}>
                {params.categoryName || 'Tüm İlanlar'}
              </ThemedText>
              <View style={desktopSearchStyles.sortRow}>
                <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>Sırala:</ThemedText>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[desktopSearchStyles.sortPill, { backgroundColor: sort === opt.value ? Brand.accent : theme.backgroundSelected }]}
                    onPress={() => setFilter('sort', opt.value === 'newest' ? null : opt.value)}
                  >
                    <ThemedText style={{ fontSize: 12, color: sort === opt.value ? '#fff' : theme.text, fontWeight: '600' }}>{opt.label}</ThemedText>
                  </TouchableOpacity>
                ))}
                {canSaveSearch && (
                  <TouchableOpacity onPress={saveSearch} accessibilityRole="button" style={[desktopSearchStyles.sortPill, { backgroundColor: Brand.accent + '18', marginLeft: 'auto' }]}>
                    <ThemedText style={{ fontSize: 12, color: Brand.accent, fontWeight: '700' }}>🔔 Bu aramayı kaydet</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {loading ? (
              <ProductGridSkeleton numColumns={numColumns} horizontalPadding={Spacing.two} />
            ) : (
              <FlatList
                key={`desktop-${numColumns}`}
                data={products}
                keyExtractor={(item) => String(item.id)}
                numColumns={numColumns}
                columnWrapperStyle={{ gap: Spacing.four }}
                contentContainerStyle={{ gap: Spacing.four, flexGrow: 1 }}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={Brand.accent} style={{ marginVertical: Spacing.four }} /> : null}
                ListEmptyComponent={emptyOrErrorState}
                renderItem={renderProductItem}
              />
            )}
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          {params.categoryId && (
            <TouchableOpacity
              onPress={() => {
                router.setParams({ categoryId: '', categoryName: '' });
                router.push('/(tabs)');
              }}
              style={{ padding: Spacing.two }}
              accessibilityRole="button"
              accessibilityLabel="Ana sayfaya dön"
            >
              <IconSymbol name="chevron.left" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Keşfet</ThemedText>
        </View>
        {params.categoryName && (
          <TouchableOpacity
            style={{ backgroundColor: Brand.accent + '20', paddingHorizontal: Spacing.three, paddingVertical: 4, borderRadius: Radius.full }}
            onPress={() => router.setParams({ categoryId: '', categoryName: '' })}
          >
            <ThemedText style={{ color: Brand.accent, fontSize: 12, fontWeight: 'bold' }}>{params.categoryName} ✕</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.three }}>
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Ürün ara..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onSubmitEditing={() => { if (searchQuery.trim()) saveRecent(searchQuery.trim()).catch(() => {}); setSearchFocused(false); }}
            returnKeyType="search"
          />
        </View>
        <SearchSuggestions
          query={searchQuery}
          visible={searchFocused}
          onPickProduct={(id) => { setSearchFocused(false); router.push(`/product/${id}`); }}
          onPickCategory={(id, name) => { setSearchFocused(false); setSearchQuery(''); router.setParams({ categoryId: String(id), categoryName: name }); }}
          onPickTerm={(t) => { setSearchFocused(false); setSearchQuery(t); saveRecent(t).catch(() => {}); }}
        />
        {canSaveSearch && (
          <TouchableOpacity onPress={saveSearch} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
            <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }}>🔔 Bu aramayı kaydet</ThemedText>
          </TouchableOpacity>
        )}

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[...TYPE_OPTIONS.map((t) => `type:${t.value}`), ...CONDITIONS]}
          keyExtractor={(c) => c}
          contentContainerStyle={{ gap: Spacing.two }}
          renderItem={({ item: cond }) => {
            const isType = cond.startsWith('type:');
            const typeValue = isType ? cond.slice(5) : null;
            const active = isType ? selectedType === typeValue : selectedCondition === cond;
            const label = isType ? TYPE_OPTIONS.find((t) => t.value === typeValue)!.label : cond;
            return (
              <TouchableOpacity
                style={[styles.conditionPill, { backgroundColor: active ? Brand.accent : theme.backgroundSelected }]}
                onPress={() => (isType ? setFilter('type', active ? null : typeValue) : setFilter('condition', active ? null : cond))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <ThemedText style={{ color: active ? '#fff' : theme.text, fontSize: 12 }}>{label}</ThemedText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <ProductGridSkeleton numColumns={numColumns} horizontalPadding={Spacing.four} />
      ) : (
        <FlatList
          key={numColumns}
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          contentContainerStyle={{ padding: Spacing.four, paddingTop: Spacing.four, gap: Spacing.four, flexGrow: 1 }}
          columnWrapperStyle={{ gap: Spacing.four }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Brand.accent} style={{ marginVertical: Spacing.four }} /> : null}
          ListEmptyComponent={emptyOrErrorState}
          renderItem={renderProductItem}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.sm, borderWidth: 1, gap: Spacing.two },
  searchInput: { flex: 1, fontSize: 16, height: 40 },
  priceInput: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.two, height: 38, fontSize: 14 },
  conditionPill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full },
  productCard: { flex: 1, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  imagePlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  favoriteButton: { position: 'absolute', top: Spacing.two, right: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  favCount: { fontSize: 11, fontWeight: '700' },
  productInfo: { padding: Spacing.three },
  productTitle: { fontWeight: '600', marginBottom: 2 },
  productDesc: { fontSize: 12, opacity: 0.7 }
});

const desktopSearchStyles = StyleSheet.create({
  page: { flexDirection: 'row', gap: Spacing.seven, paddingHorizontal: Spacing.seven, paddingVertical: Spacing.six, flex: 1 },
  sidebar: { width: 228, gap: Spacing.six },
  sidebarHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterGroup: { gap: Spacing.two },
  filterLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  filterOptionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 6 },
  radioOuter: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.accent },

  resultsCol: { flex: 1, gap: Spacing.four },
  resultsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.three },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sortPill: { paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: Radius.full },
});
