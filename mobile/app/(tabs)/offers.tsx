import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, Pressable } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ErrorState } from '@/components/ui/error-state';
import { desktopActivityStyles } from '@/components/ui/desktop-activity-styles';
import { SiteFooter } from '@/components/web-storefront';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { api, getImageUrl } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { usePageTitle } from '@/utils/use-page-title';
import { ReviewModal } from '@/components/review-modal';
import { MatchesSection } from '@/components/matches-section';
import { CashAdjustment, CashValue, NO_CASH, cashError, cashPayload, cashSummary } from '@/components/cash-adjustment';

interface Product {
  id: number;
  title: string;
  image_path: string | null;
}

interface Trade {
  id: number;
  status: string;
  cash_amount?: number | null;
  cash_direction?: string | null;
  parent_trade_id?: number | null;
  reviewed?: boolean;
  extra_products?: { id: number; title: string }[];
  sender_id?: number;
  sender?: { id: number; name: string };
  receiver?: { id: number; name: string };
  offered_product: Product;
  requested_product: Product;
}

// Alıcı, gelen teklife karşı teklif verir: karşı tarafın hangi ürününü istediğini ve para farkını değiştirebilir
function CounterModal({ trade, onClose, onDone }: { trade: Trade; onClose: () => void; onDone: () => void }) {
  const theme = useTheme();
  const [products, setProducts] = useState<{ id: number; title: string; listing_type?: string }[]>([]);
  const [selected, setSelected] = useState<number>(trade.offered_product?.id);
  const [cash, setCash] = useState<CashValue>(NO_CASH);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!trade.sender?.id) return;
    api.get(`/users/${trade.sender.id}/products`)
      .then((r) => setProducts(r.data.filter((p: { listing_type?: string }) => p.listing_type !== 'satilik')))
      .catch(() => {});
  }, [trade.sender?.id]);

  const submit = async () => {
    const problem = cashError(cash);
    if (problem) {
      Alert.alert('Uyarı', problem);
      return;
    }
    setBusy(true);
    try {
      await api.post(`/trades/${trade.id}/counter`, { requested_product_id: selected, ...cashPayload(cash) });
      Alert.alert('Gönderildi', 'Karşı teklifin iletildi.');
      onDone();
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join(' ') : e.response?.data?.message || 'Karşı teklif gönderilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ gap: Spacing.four }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>Karşı Teklif Yap</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              Senin ürünün ({trade.requested_product?.title}) karşılığında {trade.sender?.name} kişisinin hangi ürününü istediğini seç ve istersen para farkı ekle.
            </ThemedText>
            <View style={{ gap: Spacing.two }}>
              {(products.length ? products : [{ id: trade.offered_product?.id, title: trade.offered_product?.title }]).map((p) => {
                const active = selected === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelected(p.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.pick, { borderColor: active ? Brand.accent : theme.border, borderWidth: active ? 2 : 1 }]}
                  >
                    <ThemedText style={{ fontWeight: active ? '700' : '500' }} numberOfLines={1}>{p.title}</ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
            <CashAdjustment value={cash} onChange={setCash} />
            <View style={{ flexDirection: 'row', gap: Spacing.three, justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={onClose} accessibilityRole="button" style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={{ fontWeight: '600' }}>Vazgeç</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={submit} disabled={busy} accessibilityRole="button" style={[styles.button, { backgroundColor: Brand.accent, opacity: busy ? 0.6 : 1 }]}>
                {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Karşı Teklifi Gönder</ThemedText>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function OffersScreen() {
  const theme = useTheme();
  usePageTitle('Tekliflerim');
  const isDesktopWeb = useIsDesktopWeb();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [incoming, setIncoming] = useState<Trade[]>([]);
  const [outgoing, setOutgoing] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [counterFor, setCounterFor] = useState<Trade | null>(null);
  const [reviewFor, setReviewFor] = useState<{ trade: Trade; partner?: string } | null>(null);

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
      setIncoming(response.data.incoming || []);
      setOutgoing(response.data.outgoing || []);
    } catch (error) {
      console.error('Teklifler yüklenirken hata:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      const response = await api.post(`/trades/${id}/accept`);
      Alert.alert('Başarılı', response.data.message || 'Teklif kabul edildi!');
      fetchTrades(); // Refresh lists
    } catch (error: any) {
      console.error('Kabul etme hatası:', error.response?.data);
      Alert.alert('Hata', error.response?.data?.message || 'Bir hata oluştu.');
    }
  };

  const handleReject = (id: number) => {
    Alert.alert('Teklifi Reddet', 'Bu teklifi reddetmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.post(`/trades/${id}/reject`);
            Alert.alert('Reddedildi', response.data.message || 'Teklif reddedildi.');
            fetchTrades();
          } catch (error: any) {
            console.error('Reddetme hatası:', error.response?.data);
            Alert.alert('Hata', error.response?.data?.message || 'Bir hata oluştu.');
          }
        },
      },
    ]);
  };

  const handleCancel = (id: number) => {
    Alert.alert('Teklifi İptal Et', 'Gönderdiğiniz bu teklifi geri çekmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.post(`/trades/${id}/cancel`);
            Alert.alert('İptal Edildi', response.data.message || 'Teklif iptal edildi.');
            fetchTrades();
          } catch (error: any) {
            console.error('İptal etme hatası:', error.response?.data);
            Alert.alert('Hata', error.response?.data?.message || 'Bir hata oluştu.');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'onaylandı') return Brand.success;
    if (status === 'karşı teklif') return Brand.accent;
    if (status === 'reddedildi' || status === 'iptal edildi') return Brand.danger;
    return Brand.warning;
  };

  const renderProductImage = (path: string | null) => {
    if (!path) return <IconSymbol name="house.fill" size={24} color={theme.textSecondary} />;
    const parsedPath = path.startsWith('[') ? JSON.parse(path)[0] : path;
    return <Image source={{ uri: getImageUrl(parsedPath) || undefined }} style={{ width: '100%', height: '100%' }} />;
  };

  const renderTrades = (trades: Trade[], isIncoming: boolean) => {
    if (trades.length === 0) {
      return (
        <ThemedView style={[styles.emptyState, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <ThemedText style={{ color: theme.textSecondary }}>
            Henüz {isIncoming ? 'gelen' : 'gönderilen'} bir teklif bulunmuyor.
          </ThemedText>
        </ThemedView>
      );
    }

    const cards = trades.map((trade) => (
      <View key={trade.id} style={[styles.tradeCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.tradeHeader}>
          <ThemedText style={{ fontWeight: 'bold', flex: 1 }}>
            {isIncoming
              ? `${trade.sender?.name} ${trade.parent_trade_id ? 'karşı teklif gönderdi' : 'teklif gönderdi'}`
              : `${trade.receiver?.name} kişisine ${trade.parent_trade_id ? 'karşı teklif ettiniz' : 'teklif ettiniz'}`}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.status) + '20' }]}>
            <ThemedText style={{ fontSize: 10, color: getStatusColor(trade.status), fontWeight: 'bold' }}>
              {trade.status.toLocaleUpperCase('tr-TR')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.tradeBody}>
          <View style={styles.tradeItem}>
            <ThemedText style={styles.tradeItemLabel}>{isIncoming ? 'Karşı Tarafın Ürünü' : 'Sizin Ürününüz'}{trade.extra_products?.length ? ` (+${trade.extra_products.length})` : ''}</ThemedText>
            <View style={styles.productRow}>
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                {renderProductImage(trade.offered_product?.image_path)}
              </View>
              <ThemedText style={styles.productTitle} numberOfLines={2}>{trade.offered_product?.title}</ThemedText>
            </View>
          </View>

          <IconSymbol name="arrow.left.arrow.right" size={24} color={theme.textSecondary} style={{ marginHorizontal: Spacing.two }} />

          <View style={styles.tradeItem}>
            <ThemedText style={styles.tradeItemLabel}>{isIncoming ? 'Sizin Ürününüz' : 'Karşı Tarafın Ürünü'}</ThemedText>
            <View style={styles.productRow}>
              <View style={[styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                {renderProductImage(trade.requested_product?.image_path)}
              </View>
              <ThemedText style={styles.productTitle} numberOfLines={2}>{trade.requested_product?.title}</ThemedText>
            </View>
          </View>
        </View>

        {!!trade.extra_products?.length && (
          <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>
            Ayrıca teklife dahil: {trade.extra_products.map((p) => p.title).join(', ')}
          </ThemedText>
        )}

        {!!cashSummary(trade, !isIncoming) && (
          <ThemedText style={{ fontSize: 13, fontWeight: '600', color: Brand.accent }}>+ {cashSummary(trade, !isIncoming)}</ThemedText>
        )}

        {trade.status === 'onaylandı' && (trade.reviewed ? (
          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>✓ Değerlendirdin</ThemedText>
        ) : (
          <TouchableOpacity
            onPress={() => setReviewFor({ trade, partner: isIncoming ? trade.sender?.name : trade.receiver?.name })}
            accessibilityRole="button"
            style={{ alignSelf: 'flex-start', backgroundColor: Brand.accent + '18', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full }}
          >
            <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }}>★ Karşı tarafı değerlendir</ThemedText>
          </TouchableOpacity>
        ))}

        {isIncoming && trade.status === 'beklemede' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Brand.accent, flex: 1 }]}
              onPress={() => handleAccept(trade.id)}
              accessibilityRole="button"
              accessibilityLabel="Teklifi kabul et"
            >
              <ThemedText style={styles.buttonText}>Kabul Et</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.backgroundSelected, flex: 1 }]}
              onPress={() => handleReject(trade.id)}
              accessibilityRole="button"
              accessibilityLabel="Teklifi reddet"
            >
              <ThemedText style={[styles.buttonText, { color: Brand.danger }]}>Reddet</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: Brand.accent + '18', flex: 1 }]}
              onPress={() => setCounterFor(trade)}
              accessibilityRole="button"
              accessibilityLabel="Karşı teklif yap"
            >
              <ThemedText style={[styles.buttonText, { color: Brand.accent }]}>Karşı Teklif</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {!isIncoming && trade.status === 'beklemede' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.backgroundSelected, flex: 1 }]}
              onPress={() => handleCancel(trade.id)}
              accessibilityRole="button"
              accessibilityLabel="Teklifi iptal et"
            >
              <ThemedText style={[styles.buttonText, { color: Brand.danger }]}>Teklifi İptal Et</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ));

    if (isDesktopWeb) {
      return (
        <View style={desktopActivityStyles.cardGrid}>
          {cards.map((card, index) => (
            <View key={trades[index].id} style={desktopActivityStyles.cardGridItem}>
              {card}
            </View>
          ))}
        </View>
      );
    }

    return cards;
  };

  return (
    <ThemedView style={styles.container}>
      {!isDesktopWeb && (
        <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Tekliflerim</ThemedText>
        </View>
      )}

      <ScrollView contentContainerStyle={isDesktopWeb ? desktopActivityStyles.page : { padding: Spacing.four, gap: Spacing.four }}>
        {isDesktopWeb && (
          <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark, marginBottom: Spacing.five }}>Tekliflerim</ThemedText>
        )}

        <MatchesSection />

        <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'incoming' && { borderBottomColor: Brand.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('incoming')}
          >
            <ThemedText style={{ fontWeight: activeTab === 'incoming' ? 'bold' : 'normal', color: activeTab === 'incoming' ? theme.text : theme.textSecondary }}>Gelen Teklifler</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'outgoing' && { borderBottomColor: Brand.accent, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab('outgoing')}
          >
            <ThemedText style={{ fontWeight: activeTab === 'outgoing' ? 'bold' : 'normal', color: activeTab === 'outgoing' ? theme.text : theme.textSecondary }}>Giden Teklifler</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: Spacing.four, gap: Spacing.four }}>
          {loading ? (
            <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.eight }} />
          ) : error ? (
            <ErrorState message="Teklifler yüklenirken bir sorun oluştu. Lütfen tekrar dene." onRetry={fetchTrades} />
          ) : (
            renderTrades(activeTab === 'incoming' ? incoming : outgoing, activeTab === 'incoming')
          )}
        </View>
      {isDesktopWeb && <SiteFooter />}
      </ScrollView>
      {reviewFor && (
        <ReviewModal
          tradeId={reviewFor.trade.id}
          partnerName={reviewFor.partner}
          onClose={() => setReviewFor(null)}
          onDone={() => {
            setReviewFor(null);
            fetchTrades();
          }}
        />
      )}
      {counterFor && (
        <CounterModal
          trade={counterFor}
          onClose={() => setCounterFor(null)}
          onDone={() => {
            setCounterFor(null);
            fetchTrades();
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, padding: Spacing.four, alignItems: 'center' },
  emptyState: { padding: Spacing.six, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.six },
  tradeCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four, gap: Spacing.three },
  tradeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  statusBadge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full },
  tradeBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tradeItem: { flex: 1, gap: Spacing.two },
  tradeItemLabel: { fontSize: 12, opacity: 0.7 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  imagePlaceholder: { width: 48, height: 48, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productTitle: { fontSize: 14, fontWeight: '500', flex: 1 },
  actionButtons: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four },
  button: { padding: Spacing.three, borderRadius: Radius.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '90%', borderRadius: Radius.md, borderWidth: 1, padding: Spacing.four },
  pick: { padding: Spacing.three, borderRadius: Radius.sm },
});
