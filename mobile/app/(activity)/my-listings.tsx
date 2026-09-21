import { StyleSheet, View, ScrollView, ActivityIndicator, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
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
import { Alert } from '@/utils/alert';

interface Product {
  id: number;
  title: string;
  image_path: string | null;
  thumb_path?: string | null;
  swap_expectation: string;
  status: number;
  is_expired?: boolean;
  expires_at?: string | null;
}

export default function MyListingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('İlanlarım');
  const isDesktopWeb = useIsDesktopWeb();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMyProducts();
  }, []);

  const fetchMyProducts = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/user/products');
      setProducts(response.data);
    } catch (error) {
      console.error('İlanlar yüklenirken hata:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // yayın süresi: kalan gün (yalnızca süreli ilanlarda)
  const daysLeft = (p: Product) => (p.expires_at ? Math.max(0, Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / 86400000)) : null);

  const toggleReserve = async (p: Product) => {
    try {
      const r = await api.post(`/products/${p.id}/reserve`);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: r.data.status } : x)));
    } catch (e: any) {
      Alert.alert('Uyarı', e.response?.data?.message || 'İşlem yapılamadı.');
    }
  };

  const renew = async (p: Product) => {
    try {
      const r = await api.post(`/products/${p.id}/renew`);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_expired: false, expires_at: r.data.expires_at } : x)));
      Alert.alert('Tamam', 'İlanının yayın süresi yenilendi.');
    } catch (e: any) {
      Alert.alert('Uyarı', e.response?.data?.message || 'İlan yenilenemedi.');
    }
  };

  // Rezerve / yenile düğmeleri (takaslanmış ya da kaldırılmış ilanlarda gösterilmez)
  const renderActions = (p: Product) => {
    if (p.status === 3 || p.status === 4) return null;
    const left = daysLeft(p);
    return (
      <View style={{ gap: Spacing.two }}>
        {left !== null && !p.is_expired && (
          <ThemedText style={{ fontSize: 11, color: left <= 7 ? Brand.warning : theme.textSecondary }}>{left} gün yayında kalacak</ThemedText>
        )}
        <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
          {(p.is_expired || (left !== null && left <= 7)) && (
            <TouchableOpacity onPress={() => renew(p)} accessibilityRole="button" style={[styles.actionBtn, { backgroundColor: Brand.accent }]}>
              <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Yenile</ThemedText>
            </TouchableOpacity>
          )}
          {!p.is_expired && (
            <TouchableOpacity onPress={() => toggleReserve(p)} accessibilityRole="button" style={[styles.actionBtn, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={{ fontSize: 12, fontWeight: '700' }}>{p.status === 5 ? 'Aktif Et' : 'Rezerve Et'}</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const statusInfo = (status: number, expired?: boolean) => {
    if (expired) return { label: 'Süresi Doldu', color: Brand.danger };
    if (status === 5) return { label: 'Rezerve', color: Brand.warning };
    if (status === 1) return { label: 'Yayında', color: Brand.success };
    if (status === 3) return { label: 'Takaslandı', color: Brand.accent };
    if (status === 4) return { label: 'Yayından Kaldırıldı', color: Brand.danger };
    return { label: 'Onay Bekliyor', color: Brand.warning };
  };

  if (isDesktopWeb) {
    return (
      <ThemedView style={styles.container}>
        <StorefrontHeader />
        <ScrollView contentContainerStyle={desktopActivityStyles.page}>
          <View style={desktopActivityStyles.titleRow}>
            <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>İlanlarım</ThemedText>
            {!loading && !error && (
              <ThemedText style={{ color: theme.textSecondary }}>{products.length} ilan</ThemedText>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
          ) : error ? (
            <ErrorState message="İlanların yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchMyProducts} />
          ) : products.length === 0 ? (
            <View style={desktopActivityStyles.emptyState}>
              <IconSymbol name="doc.text.magnifyingglass" size={56} color={theme.textSecondary} />
              <ThemedText style={{ marginTop: Spacing.four, color: theme.textSecondary }}>Henüz bir ilanınız bulunmamaktadır.</ThemedText>
              <TouchableOpacity style={[desktopActivityStyles.ctaButton, { backgroundColor: Brand.accent }]} onPress={() => router.push('/(tabs)/add')}>
                <ThemedText style={{ color: '#fff', fontWeight: '700' }}>İlan Ekle</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={desktopActivityStyles.grid}>
              {products.map((item) => {
                const info = statusInfo(item.status, item.is_expired);
                return (
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
                    </View>
                    <View style={{ padding: Spacing.three, gap: Spacing.two }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item.title}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>Takas: {item.swap_expectation}</ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: info.color + '20', alignSelf: 'flex-start' }]}>
                        <ThemedText style={{ fontSize: 10, fontWeight: 'bold', color: info.color }}>{info.label}</ThemedText>
                      </View>
                      {renderActions(item)}
                    </View>
                  </TouchableOpacity>
                );
              })}
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
        <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>İlanlarım</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, flexGrow: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
        ) : error ? (
          <ErrorState message="İlanların yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchMyProducts} />
        ) : products.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.eight }}>
            <IconSymbol name="doc.text.magnifyingglass" size={64} color={theme.textSecondary} />
            <ThemedText style={{ marginTop: Spacing.four, textAlign: 'center', color: theme.textSecondary }}>Henüz bir ilanınız bulunmamaktadır.</ThemedText>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: Brand.accent }]}
              onPress={() => router.push('/(tabs)/add')}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>İlan Ekle</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          products.map((item) => (
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
                <View style={[styles.statusBadge, { backgroundColor: statusInfo(item.status, item.is_expired).color + '20' }]}>
                  <ThemedText style={{ fontSize: 10, fontWeight: 'bold', color: statusInfo(item.status, item.is_expired).color }}>
                    {statusInfo(item.status, item.is_expired).label}
                  </ThemedText>
                </View>
                {renderActions(item)}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBtn: { paddingHorizontal: Spacing.three, paddingVertical: 6, borderRadius: Radius.full },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productCard: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  productInfo: { padding: Spacing.three, flex: 1 },
  productTitle: { fontWeight: '600', marginBottom: 2 },
  productDesc: { fontSize: 12, opacity: 0.7, marginBottom: Spacing.two },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full },
  addButton: { marginTop: Spacing.six, paddingHorizontal: Spacing.six, paddingVertical: Spacing.three, borderRadius: Radius.full }
});
