import { FadeInUp, Stagger } from '@/components/ui/motion';
import { StyleSheet, View, ScrollView, ActivityIndicator, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { cashSummary } from '@/components/cash-adjustment';
import { ShippableTrade, ShippingBox } from '@/components/shipment';

interface Product {
  id: number;
  title: string;
  image_path: string | null;
}

interface Trade extends ShippableTrade {
  status: string;
  cash_amount?: number | null;
  cash_direction?: string | null;
  receiver?: { name?: string };
  offered_product: Product;
  requested_product: Product;
}

// Sipariş durumu: takasın kendi durumu + (onaylandıysa) kargo alt durumu birlikte, sipariş takibi diliyle
const ORDER_STATUS: Record<string, { label: string; description: string; color: (t: typeof Brand) => string }> = {
  'beklemede': { label: 'Siparişiniz Alındı', description: 'Satıcının onayını bekliyor.', color: (b) => b.warning },
  'karşı teklif': { label: 'Karşı Teklif Geldi', description: 'Satıcı karşı teklif gönderdi. Yanıtlamak için Tekliflerim\'e gidin.', color: (b) => b.accent },
  'reddedildi': { label: 'Reddedildi', description: 'Bu teklif satıcı tarafından reddedildi.', color: (b) => b.danger },
  'iptal edildi': { label: 'İptal Edildi', description: 'Bu teklifi iptal ettiniz.', color: (b) => b.danger },
  'onaylandı': { label: 'Onaylandı', description: 'Teklifiniz onaylandı, iletişim bilgileri paylaşıldı.', color: (b) => b.success },
};

// Siparişlerim: verdiğiniz TÜM teklifler (takas + satılık, bekleyen/onaylanan/reddedilen/iptal — geçmiş dahil).
// Her biri durumuyla birlikte görünür; onaylanmış ve kargo seçenekli olanlarda ayrıca kargo alt durumu (hazırlanıyor/kargoda/teslim edildi) gösterilir.
export default function SiparislerimScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Siparişlerim');
  const isDesktopWeb = useIsDesktopWeb();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTrades();
    }, [])
  );

  const fetchTrades = async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/trades');
      setTrades(response.data.outgoing || []);
    } catch (e) {
      console.error('Siparişler yüklenirken hata:', e);
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

  const renderTradeCard = (trade: Trade) => {
    const info = ORDER_STATUS[trade.status] ?? ORDER_STATUS['beklemede'];
    const color = info.color(Brand);

    return (
      <View key={trade.id} style={[styles.tradeCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.tradeHeader}>
          <ThemedText style={{ fontWeight: 'bold', flex: 1 }}>{trade.receiver?.name} kişisinden</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
            <ThemedText style={{ fontSize: 10, color, fontWeight: 'bold' }}>{info.label.toLocaleUpperCase('tr-TR')}</ThemedText>
          </View>
        </View>

        <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>{info.description}</ThemedText>

        <View style={styles.tradeBody}>
          <View style={styles.tradeItem}>
            <ThemedText style={styles.tradeItemLabel}>Karşılığında Verdiğiniz</ThemedText>
            <View style={styles.productRow}>
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                {renderProductImage(trade.offered_product?.image_path)}
              </View>
              <ThemedText style={styles.productTitle} numberOfLines={2}>{trade.offered_product?.title}</ThemedText>
            </View>
          </View>

          <IconSymbol name="arrow.left.arrow.right" size={24} color={theme.textSecondary} style={{ marginHorizontal: Spacing.two }} />

          <View style={styles.tradeItem}>
            <ThemedText style={styles.tradeItemLabel}>Sipariş Ettiğiniz</ThemedText>
            <View style={styles.productRow}>
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                {renderProductImage(trade.requested_product?.image_path)}
              </View>
              <ThemedText style={styles.productTitle} numberOfLines={2}>{trade.requested_product?.title}</ThemedText>
            </View>
          </View>
        </View>

        {!!cashSummary(trade, true) && (
          <ThemedText style={{ fontSize: 13, fontWeight: '600', color: Brand.accent }}>+ {cashSummary(trade, true)}</ThemedText>
        )}

        {trade.status === 'onaylandı' && <ShippingBox trade={trade} canManage={false} />}
      </View>
    );
  };

  const empty = (
    <>
      <IconSymbol name="shippingbox.fill" size={isDesktopWeb ? 56 : 64} color={theme.textSecondary} />
      <ThemedText style={{ marginTop: Spacing.four, textAlign: 'center', color: theme.textSecondary }}>
        Henüz verdiğiniz bir sipariş/teklif bulunmuyor.
      </ThemedText>
    </>
  );

  if (isDesktopWeb) {
    return (
      <ThemedView style={styles.container}>
        <StorefrontHeader />
        <FadeInUp style={{ flex: 1 }}><ScrollView contentContainerStyle={desktopActivityStyles.page}>
          <View style={desktopActivityStyles.titleRow}>
            <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Siparişlerim</ThemedText>
            {!loading && !error && <ThemedText style={{ color: theme.textSecondary }}>{trades.length} sipariş</ThemedText>}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
          ) : error ? (
            <ErrorState message="Siparişler yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchTrades} />
          ) : trades.length === 0 ? (
            <View style={desktopActivityStyles.emptyState}>{empty}</View>
          ) : (
            <View style={desktopActivityStyles.cardGrid}>
              {trades.map((trade) => (
                <View key={trade.id} style={desktopActivityStyles.cardGridItem}>{renderTradeCard(trade)}</View>
              ))}
            </View>
          )}
        <SiteFooter />
        </ScrollView></FadeInUp>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Geri">
          <IconSymbol name="chevron.right" size={24} color={theme.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <ThemedText type="title" style={{ fontSize: 20, color: Brand.wordmark }}>Siparişlerim</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <FadeInUp style={{ flex: 1 }}><ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.four, flexGrow: 1 }}>
        {loading ? (
          <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
        ) : error ? (
          <ErrorState message="Siparişler yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchTrades} />
        ) : trades.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.eight }}>{empty}</View>
        ) : (
          trades.map((trade, index) => <Stagger key={trade.id} id={`sp${trade.id}`} index={index}>{renderTradeCard(trade)}</Stagger>)
        )}
      </ScrollView></FadeInUp>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four, gap: Spacing.three },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full },
  tradeBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tradeItem: { flex: 1, gap: Spacing.two },
  tradeItemLabel: { fontSize: 12, opacity: 0.7 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  imagePlaceholder: { width: 48, height: 48, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
});
