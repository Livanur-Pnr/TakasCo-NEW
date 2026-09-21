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
import { ReviewModal } from '@/components/review-modal';

interface Product {
  id: number;
  title: string;
  image_path: string | null;
}

interface Trade {
  id: number;
  status: string;
  reviewed?: boolean;
  sender?: { name: string };
  receiver?: { name: string };
  offered_product: Product;
  requested_product: Product;
}

export default function MyTradesScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Gerçekleşen Takaslarım');
  const isDesktopWeb = useIsDesktopWeb();
  const [completedTrades, setCompletedTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviewFor, setReviewFor] = useState<Trade | null>(null);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/trades');
      // Hem gelen hem giden tekliflerden sadece onaylananları (Takaslandı olanları) alıyoruz.
      const incoming: Trade[] = response.data.incoming || [];
      const outgoing: Trade[] = response.data.outgoing || [];
      const allTrades = [...incoming, ...outgoing];
      const completed = allTrades.filter(trade => trade.status === 'onaylandı');
      setCompletedTrades(completed);
    } catch (error) {
      console.error('Takaslar yüklenirken hata:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const renderProductImage = (path: string | null) => {
    if (!path) return <IconSymbol name="house.fill" size={24} color={theme.textSecondary} />;
    const parsedPath = path.startsWith('[') ? JSON.parse(path)[0] : path;
    return <Image source={{ uri: getImageUrl(parsedPath) || undefined }} style={{ width: '100%', height: '100%' }} />;
  };

  const renderTradeCard = (trade: Trade) => (
    <View key={trade.id} style={[styles.tradeCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.tradeHeader}>
        <ThemedText style={{ fontWeight: 'bold' }}>
          {trade.sender?.name || trade.receiver?.name} ile Takaslandı
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: Brand.accent + '20' }]}>
          <ThemedText style={{ fontSize: 10, color: Brand.accent, fontWeight: 'bold' }}>
            TAKASLANDI
          </ThemedText>
        </View>
      </View>

      <View style={styles.tradeBody}>
        <View style={styles.tradeItem}>
          <ThemedText style={styles.tradeItemLabel}>Verdiğiniz Ürün</ThemedText>
          <View style={styles.productRow}>
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
              {renderProductImage(trade.offered_product?.image_path)}
            </View>
            <ThemedText style={styles.productTitle} numberOfLines={2}>{trade.offered_product?.title}</ThemedText>
          </View>
        </View>

        <IconSymbol name="arrow.left.arrow.right" size={24} color={Brand.accent} style={{ marginHorizontal: Spacing.two }} />

        <View style={styles.tradeItem}>
          <ThemedText style={styles.tradeItemLabel}>Aldığınız Ürün</ThemedText>
          <View style={styles.productRow}>
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
              {renderProductImage(trade.requested_product?.image_path)}
            </View>
            <ThemedText style={styles.productTitle} numberOfLines={2}>{trade.requested_product?.title}</ThemedText>
          </View>
        </View>
      </View>

      {trade.reviewed ? (
        <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>✓ Değerlendirdin</ThemedText>
      ) : (
        <TouchableOpacity
          onPress={() => setReviewFor(trade)}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-start', backgroundColor: Brand.accent + '18', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full }}
        >
          <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }}>★ Karşı tarafı değerlendir</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isDesktopWeb) {
    return (
      <ThemedView style={styles.container}>
        <StorefrontHeader />
        <ScrollView contentContainerStyle={desktopActivityStyles.page}>
          <View style={desktopActivityStyles.titleRow}>
            <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Gerçekleşen Takaslarım</ThemedText>
            {!loading && !error && (
              <ThemedText style={{ color: theme.textSecondary }}>{completedTrades.length} takas</ThemedText>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
          ) : error ? (
            <ErrorState message="Takasların yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchTrades} />
          ) : completedTrades.length === 0 ? (
            <View style={desktopActivityStyles.emptyState}>
              <IconSymbol name="checkmark.seal.fill" size={56} color={theme.textSecondary} />
              <ThemedText style={{ marginTop: Spacing.four, color: theme.textSecondary }}>
                Henüz tamamlanmış (onaylanmış) bir takasınız bulunmuyor.
              </ThemedText>
            </View>
          ) : (
            <View style={desktopActivityStyles.cardGrid}>
              {completedTrades.map((trade) => (
                <View key={trade.id} style={desktopActivityStyles.cardGridItem}>
                  {renderTradeCard(trade)}
                </View>
              ))}
            </View>
          )}
        <SiteFooter />
        </ScrollView>
      {reviewFor && (
        <ReviewModal
          tradeId={reviewFor.id}
          partnerName={reviewFor.sender?.name || reviewFor.receiver?.name}
          onClose={() => setReviewFor(null)}
          onDone={() => {
            setReviewFor(null);
            fetchTrades();
          }}
        />
      )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri">
          <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>Gerçekleşen Takaslarım</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, flexGrow: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
        ) : error ? (
          <ErrorState message="Takasların yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchTrades} />
        ) : completedTrades.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.eight }}>
            <IconSymbol name="checkmark.seal.fill" size={64} color={theme.textSecondary} />
            <ThemedText style={{ marginTop: Spacing.four, textAlign: 'center', color: theme.textSecondary }}>
              Henüz tamamlanmış (onaylanmış) bir takasınız bulunmuyor.
            </ThemedText>
          </View>
        ) : (
          completedTrades.map((trade) => renderTradeCard(trade))
        )}
      </ScrollView>
      {reviewFor && (
        <ReviewModal
          tradeId={reviewFor.id}
          partnerName={reviewFor.sender?.name || reviewFor.receiver?.name}
          onClose={() => setReviewFor(null)}
          onDone={() => {
            setReviewFor(null);
            fetchTrades();
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four, gap: Spacing.three },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  statusBadge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full },
  tradeBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tradeItem: { flex: 1, gap: Spacing.two },
  tradeItemLabel: { fontSize: 12, opacity: 0.7 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  imagePlaceholder: { width: 48, height: 48, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
});
