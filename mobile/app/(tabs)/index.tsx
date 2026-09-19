import { StyleSheet, FlatList, ScrollView, View, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProductCard } from '@/components/product-card';
import { ErrorState } from '@/components/ui/error-state';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { api } from '@/utils/api';
import { useFavorites } from '@/hooks/use-favorites';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { CategoryBanners, PopularSearches, HomeHero, SellCta, TrustBadges, SiteFooter, HowItWorks, PopularListings, CityListings, RecommendedListings } from '@/components/web-storefront';
import { usePageTitle } from '@/utils/use-page-title';

interface Product {
  id: number;
  title: string;
  image_path: string | null;
  thumb_path?: string | null;
  swap_expectation: string;
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

const POPULAR_TERMS = ['iPhone', 'Gitar', 'Kamp Çadırı', 'Kitap', 'Bisiklet'];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle(null);
  const isDesktopWeb = useIsDesktopWeb();
  const { width } = useWindowDimensions();
  const numColumns = isDesktopWeb ? (width >= 1300 ? 5 : width >= 1100 ? 4 : 3) : 2;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    fetchProducts(1);
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Kategoriler alınamadı:', error);
    }
  };

  const fetchProducts = async (pageToLoad: number) => {
    if (pageToLoad === 1) setError(false);
    try {
      const response = await api.get<ProductsPage>('/products', { params: { page: pageToLoad, per_page: 20 } });
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
    setLoadingMore(true);
    fetchProducts(page + 1);
  }, [loadingMore, loading, page, lastPage]);

  const renderHeader = () => (
    <>
      {isDesktopWeb ? (
        <>
          <HomeHero />
          <CategoryBanners categories={categories} />
          <PopularSearches terms={POPULAR_TERMS} />
          <RecommendedListings />
          <PopularListings />
          <CityListings />
        </>
      ) : (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Kategoriler</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, { backgroundColor: theme.backgroundSelected }]}
                onPress={() => router.push({ pathname: '/(tabs)/search', params: { categoryId: cat.id, categoryName: cat.name } })}
              >
                <ThemedText style={{ color: theme.text }}>{cat.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={isDesktopWeb ? { paddingHorizontal: Spacing.seven, marginTop: Spacing.six, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } : undefined}>
        <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, isDesktopWeb ? { fontSize: 22 } : { marginTop: Spacing.six, marginBottom: Spacing.three }]}>
          {isDesktopWeb ? 'Keşfet' : 'En Yeni İlanlar'}
        </ThemedText>
        {isDesktopWeb && <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>Sana özel seçilmiş parçalar</ThemedText>}
      </View>
    </>
  );

  return (
    <ThemedView style={styles.container}>
      {!isDesktopWeb && (
        <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>TakasCo</ThemedText>
          <TouchableOpacity onPress={() => router.push('/favorites')} accessibilityRole="button" accessibilityLabel="Favorilerim">
            <IconSymbol name="heart.fill" size={24} color={Brand.danger} />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ProductGridSkeleton numColumns={numColumns} horizontalPadding={isDesktopWeb ? Spacing.seven : Spacing.four} />
      ) : error && products.length === 0 ? (
        <ErrorState message="İlanlar yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={() => { setLoading(true); fetchProducts(1); }} />
      ) : (
        <FlatList
          key={numColumns}
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          contentContainerStyle={isDesktopWeb ? { paddingHorizontal: Spacing.seven, paddingTop: Spacing.four, paddingBottom: Spacing.eight, gap: Spacing.four } : { padding: Spacing.four, gap: Spacing.four }}
          columnWrapperStyle={{ gap: Spacing.four }}
          ListHeaderComponent={renderHeader}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <>
              {loadingMore && <ActivityIndicator color={Brand.accent} style={{ marginVertical: Spacing.four }} />}
              {isDesktopWeb && !loading && (
                <>
                  <SellCta />
                  <HowItWorks />
                  <TrustBadges />
                  <SiteFooter />
                </>
              )}
            </>
          }
          renderItem={({ item }) => (
            <ProductCard item={item} isFavorite={isFavorite(item.id)} onToggleFavorite={() => toggleFavorite(item.id)} />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.four, paddingTop: Spacing.eight },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 18 },
  categoryPill: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.full },
  productCard: { flex: 1, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  imagePlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  favoriteButton: { position: 'absolute', top: Spacing.two, right: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  favCount: { fontSize: 11, fontWeight: '700' },
  productInfo: { padding: Spacing.three },
  productTitle: { fontWeight: '600', marginBottom: 2 },
  productDesc: { fontSize: 12, opacity: 0.7 }
});
