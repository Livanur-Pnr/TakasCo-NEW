import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api, getImageUrl } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { StorefrontHeader, SiteFooter } from '@/components/web-storefront';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { desktopActivityStyles } from '@/components/ui/desktop-activity-styles';
import { usePageTitle } from '@/utils/use-page-title';
import { CashAdjustment, CashValue, NO_CASH, cashError, cashPayload } from '@/components/cash-adjustment';

const MAX_OFFERED = 4; // backend ile aynı (1 birincil + 3 ek)

interface Product {
  id: number;
  title: string;
  image_path: string | null;
}

export default function OfferScreen() {
  const { id, offered } = useLocalSearchParams<{ id: string; offered?: string }>(); // id: istenen ürün, offered: önceden seçilecek kendi ürünüm
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Takas Teklifi Gönder');
  const isDesktopWeb = useIsDesktopWeb();

  const [selectedIds, setSelectedIds] = useState<number[]>([]); // ilki birincil ürün, kalanlar ek ürünler
  const selectedProduct = selectedIds[0] ?? null;
  const toggleProduct = (pid: number) =>
    setSelectedIds((prev) => {
      if (prev.includes(pid)) return prev.filter((x) => x !== pid);
      if (prev.length >= MAX_OFFERED) {
        Alert.alert('Uyarı', `Bir teklifte en fazla ${MAX_OFFERED} ürün verebilirsin.`);
        return prev;
      }
      return [...prev, pid];
    });
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cash, setCash] = useState<CashValue>(NO_CASH);

  useEffect(() => {
    fetchMyProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyProducts = async () => {
    try {
      const response = await api.get('/user/products');
      // takaslanmış (status 3) ürünler teklif edilemez, backend de 409 ile reddeder
      const usable = response.data.filter((p: { status?: number; listing_type?: string; is_expired?: boolean }) => p.status !== 3 && p.status !== 4 && p.listing_type !== 'satilik' && !p.is_expired);
      setMyProducts(usable);
      if (offered && usable.some((p: { id: number }) => String(p.id) === String(offered))) setSelectedIds([Number(offered)]);
    } catch (error) {
      console.error('İlanlar yüklenirken hata:', error);
      Alert.alert('Hata', 'İlanlarınız yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOffer = async () => {
    if (!selectedProduct) return;
    const problem = cashError(cash);
    if (problem) {
      Alert.alert('Uyarı', problem);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/trades', {
        offered_product_id: selectedIds[0],
        ...(selectedIds.length > 1 ? { extra_offered_product_ids: selectedIds.slice(1) } : {}),
        requested_product_id: Number(id),
        ...cashPayload(cash),
      });
      
      Alert.alert('Başarılı', 'Takas teklifiniz başarıyla gönderildi!', [
        { text: 'Tamam', onPress: () => router.replace('/(tabs)/offers') }
      ]);
    } catch (error: any) {
      console.error('Teklif gönderim hatası:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Teklif gönderilirken bir hata oluştu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const emptyState = (
    <View style={{ alignItems: 'center', marginTop: Spacing.four }}>
      <IconSymbol name="doc.text.magnifyingglass" size={48} color={theme.textSecondary} />
      <ThemedText style={{ marginTop: Spacing.two, color: theme.textSecondary }}>
        Takas teklif edebileceğiniz bir ilanınız yok.
      </ThemedText>
    </View>
  );

  if (isDesktopWeb) {
    return (
      <ThemedView style={styles.container}>
        <StorefrontHeader />
        <ScrollView contentContainerStyle={desktopActivityStyles.page}>
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Teklif Gönder</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.two, marginBottom: Spacing.six }}>
            Bu ürüne karşılık teklif etmek istediğiniz kendi ürününüzü seçin. İstersen birden fazla ürün ekleyebilirsin (en fazla 4).
          </ThemedText>

          {loading ? (
            <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.four }} />
          ) : myProducts.length === 0 ? (
            emptyState
          ) : (
            <>
              <View style={desktopActivityStyles.grid}>
                {myProducts.map((item) => {
                  const selected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        desktopActivityStyles.gridCard,
                        { backgroundColor: theme.cardBg, borderColor: selected ? Brand.accent : theme.border, borderWidth: selected ? 2 : 1 },
                      ]}
                      onPress={() => toggleProduct(item.id)}
                    >
                      <View style={[desktopActivityStyles.gridImageWrap, { backgroundColor: theme.backgroundSelected }]}>
                        {item.image_path ? (
                          <Image
                            source={{ uri: getImageUrl(item.image_path.startsWith('[') ? JSON.parse(item.image_path)[0] : item.image_path) || undefined }}
                            style={{ width: '100%', height: '100%' }}
                          />
                        ) : (
                          <IconSymbol name="house.fill" size={28} color={theme.textSecondary} />
                        )}
                        {selected && (
                          <View style={[styles.selectedBadge, { backgroundColor: Brand.accent }]}>
                            <IconSymbol name="checkmark.seal.fill" size={14} color="#fff" />
                          </View>
                        )}
                      </View>
                      <View style={{ padding: Spacing.three }}>
                        <ThemedText style={{ fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{item.title}</ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ marginTop: Spacing.six, maxWidth: 520 }}>
                <CashAdjustment value={cash} onChange={setCash} />
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: selectedProduct ? Brand.accent : theme.backgroundSelected, marginTop: Spacing.six, alignSelf: 'flex-start', paddingHorizontal: Spacing.eight }]}
                disabled={!selectedProduct || submitting}
                onPress={handleSendOffer}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={[styles.buttonText, { color: selectedProduct ? '#fff' : theme.textSecondary }]}>{selectedIds.length > 1 ? `Teklifi Gönder (${selectedIds.length} ürün)` : 'Teklifi Gönder'}</ThemedText>
                )}
              </TouchableOpacity>
            </>
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
        <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>Teklif Gönder</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.six }}>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          Bu ürüne karşılık ne teklif ediyorsun?
        </ThemedText>
        <ThemedText style={{ textAlign: 'center', opacity: 0.7, marginTop: -Spacing.four }}>
          Takas etmek istediğiniz kendi ürününüzü seçin. Birden fazla ürün ekleyebilirsin (en fazla 4).
        </ThemedText>

        {loading ? (
          <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.four }} />
        ) : myProducts.length === 0 ? (
          emptyState
        ) : (
          <View style={styles.grid}>
            {myProducts.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.productCard,
                  { backgroundColor: theme.cardBg, borderColor: selectedIds.includes(item.id) ? Brand.accent : theme.border },
                  selectedIds.includes(item.id) && { borderWidth: 2 }
                ]}
                onPress={() => toggleProduct(item.id)}
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
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!loading && myProducts.length > 0 && <CashAdjustment value={cash} onChange={setCash} />}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: selectedProduct ? Brand.accent : theme.backgroundSelected }]}
          disabled={!selectedProduct || submitting}
          onPress={handleSendOffer}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={[styles.buttonText, { color: selectedProduct ? '#fff' : theme.textSecondary }]}>{selectedIds.length > 1 ? `Teklifi Gönder (${selectedIds.length} ürün)` : 'Teklifi Gönder'}</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { gap: Spacing.four },
  productCard: { borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  imagePlaceholder: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  productInfo: { padding: Spacing.three, flex: 1 },
  productTitle: { fontWeight: '600' },
  footer: { padding: Spacing.four, paddingBottom: Spacing.six, borderTopWidth: 1 },
  button: { padding: Spacing.four, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { fontWeight: 'bold', fontSize: 16 },
  selectedBadge: { position: 'absolute', top: Spacing.two, right: Spacing.two, borderRadius: Radius.full, padding: 6 },
});
