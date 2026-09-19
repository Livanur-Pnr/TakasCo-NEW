import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ErrorState } from '@/components/ui/error-state';
import { StorefrontHeader, SiteFooter } from '@/components/web-storefront';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { desktopActivityStyles } from '@/components/ui/desktop-activity-styles';
import { api, getImageUrl } from '@/utils/api';
import { usePageTitle } from '@/utils/use-page-title';

//// API'den gelecek ürün verisinin veri tipini tanımlama
interface Product {
  id: number;
  title: string;
  image_path: string | null;
  thumb_path?: string | null;
  swap_expectation: string;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Favorilerim');
  const isDesktopWeb = useIsDesktopWeb();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Favoriler yüklenirken hata:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: number) => {
    try {
      await api.post(`/products/${id}/favorite`);
      setFavorites(favorites.filter(item => item.id !== id));
    } catch (error) {
      console.error('Favorilerden çıkarılırken hata:', error);
    }
  };

  if (isDesktopWeb) {
    return (
      <ThemedView style={styles.container}>
        <StorefrontHeader />
        <ScrollView contentContainerStyle={desktopActivityStyles.page}>
          <View style={desktopActivityStyles.titleRow}>
            <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Favorilerim</ThemedText>
            {!loading && !error && (
              <ThemedText style={{ color: theme.textSecondary }}>{favorites.length} ürün</ThemedText>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
          ) : error ? (
            <ErrorState message="Favorilerin yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchFavorites} />
          ) : favorites.length === 0 ? (
            <View style={desktopActivityStyles.emptyState}>
              <IconSymbol name="heart.slash.fill" size={56} color={theme.textSecondary} />
              <ThemedText style={{ marginTop: Spacing.four, color: theme.textSecondary }}>Henüz favori ürününüz bulunmamaktadır.</ThemedText>
              <TouchableOpacity style={[desktopActivityStyles.ctaButton, { backgroundColor: Brand.accent }]} onPress={() => router.push('/(tabs)/search')}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Keşfetmeye Başla</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={desktopActivityStyles.grid}>
              {favorites.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[desktopActivityStyles.gridCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                  onPress={() => router.push(`/product/${item.id}`)}
                >
                  <View style={[desktopActivityStyles.gridImageWrap, { backgroundColor: theme.backgroundSelected }]}>
                    {item.image_path ? (
                      <Image
                        source={{ uri: getImageUrl(((item.thumb_path ?? item.image_path) as string).startsWith('[') ? JSON.parse((item.thumb_path ?? item.image_path) as string)[0] : (item.thumb_path ?? item.image_path)) || undefined }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <IconSymbol name="house.fill" size={28} color={theme.textSecondary} />
                    )}
                    <TouchableOpacity
                      style={[desktopActivityStyles.removeBadge, { backgroundColor: theme.backgroundElement }]}
                      onPress={(e) => { e.stopPropagation(); removeFavorite(item.id); }}
                      accessibilityRole="button"
                      accessibilityLabel="Favorilerden çıkar"
                    >
                      <IconSymbol name="heart.fill" size={14} color={Brand.danger} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ padding: Spacing.three }}>
                    <ThemedText style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item.title}</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>Takas: {item.swap_expectation}</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        <SiteFooter />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri">
          <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>Favorilerim</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, flexGrow: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
        ) : error ? (
          <ErrorState message="Favorilerin yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchFavorites} />
        ) : favorites.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.eight }}>
            <IconSymbol name="heart.slash.fill" size={64} color={theme.textSecondary} />
            <ThemedText style={{ marginTop: Spacing.four, textAlign: 'center', color: theme.textSecondary }}>Henüz favori ürününüz bulunmamaktadır.</ThemedText>
          </View>
        ) : (
          favorites.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.productCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                {item.image_path ? (
                  <Image 
                    source={{ uri: getImageUrl(item.image_path.startsWith('[') ? JSON.parse(item.image_path)[0] : item.image_path) || undefined }} 
                    style={{ width: '100%', height: '100%' }} 
                  />
                ) : (
                  <IconSymbol name="house.fill" size={32} color={theme.textSecondary} />
                )}
              </View>
              <View style={styles.productInfo}>
                <ThemedText style={styles.productTitle} numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText style={styles.productDesc} numberOfLines={1}>Takas: {item.swap_expectation}</ThemedText>
              </View>
              <TouchableOpacity style={styles.heartIcon} onPress={() => removeFavorite(item.id)} accessibilityRole="button" accessibilityLabel="Favorilerden çıkar">
                <IconSymbol name="heart.fill" size={24} color={Brand.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productCard: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  productInfo: { padding: Spacing.three, flex: 1 },
  productTitle: { fontWeight: '600', marginBottom: 2 },
  productDesc: { fontSize: 12, opacity: 0.7 },
  heartIcon: { padding: Spacing.four }
});
