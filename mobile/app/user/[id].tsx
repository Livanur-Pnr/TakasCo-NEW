import { StyleSheet, View, ActivityIndicator, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { desktopActivityStyles } from '@/components/ui/desktop-activity-styles';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { api, getImageUrl } from '@/utils/api';
import { usePageTitle } from '@/utils/use-page-title';
import * as SecureStore from '@/utils/storage';
import { ReportModal } from '@/components/report-modal';
import { StatsLine, TrustBadges, UserStatsData } from '@/components/trust';
import { timeAgo } from '@/utils/date';
import { formatPrice } from '@/utils/listing';

interface PublicUser {
  id: number;
  name: string;
  city: string | null;
  district: string | null;
  profile_photo_path: string | null;
  bio?: string | null;
  created_at: string;
}

interface Product {
  id: number;
  title: string;
  image_path: string | null;
  swap_expectation: string;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const isDesktopWeb = useIsDesktopWeb();

  const [user, setUser] = useState<PublicUser | null>(null);
  usePageTitle(user?.name ? `${user.name} — Profil` : 'Profil');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'traded' | 'reviews'>('active');
  const [traded, setTraded] = useState<Product[] | null>(null);
  const [stats, setStats] = useState<UserStatsData | undefined>();
  const [reviews, setReviews] = useState<{ id: number; rating: number; comment: string | null; reviewer: string; created_at: string }[]>([]);
  const [meId, setMeId] = useState<number | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('user').then((u) => setMeId(u ? JSON.parse(u).id : null)).catch(() => {});
    fetchUser();
    fetchProducts();
    api.get(`/users/${id}/reviews`).then((r) => { setStats(r.data.stats); setReviews(r.data.data); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${id}`);
      setUser(response.data);
    } catch (error) {
      console.error('Kullanıcı profili alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/users/${id}/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Kullanıcının ilanları alınamadı:', error);
    }
  };

  // "Takaslananlar" sekmesi ilk açıldığında yüklenir
  useEffect(() => {
    if (tab !== 'traded' || traded !== null) return;
    api.get(`/users/${id}/products`, { params: { status: 'traded' } }).then((r) => setTraded(r.data)).catch(() => setTraded([]));
  }, [tab, traded, id]);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
    : null;

  const renderProducts = (list: Product[], emptyText: string, dimmed: boolean) => (
    <View style={styles.section}>
      {list.length === 0 ? (
        <View style={{ alignItems: 'center', padding: Spacing.six }}>
          <IconSymbol name="doc.text.magnifyingglass" size={48} color={theme.textSecondary} />
          <ThemedText style={{ marginTop: Spacing.three, color: theme.textSecondary }}>{emptyText}</ThemedText>
        </View>
      ) : (
        <View style={isDesktopWeb ? desktopActivityStyles.grid : styles.grid}>
          {list.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={[isDesktopWeb ? desktopActivityStyles.gridCard : styles.productCard, { backgroundColor: theme.cardBg, borderColor: theme.border, opacity: dimmed ? 0.85 : 1 }]}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <View style={[isDesktopWeb ? desktopActivityStyles.gridImageWrap : styles.imagePlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                {item.image_path ? (
                  <Image
                    source={{ uri: getImageUrl(item.image_path.startsWith('[') ? JSON.parse(item.image_path)[0] : item.image_path) || undefined }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <IconSymbol name="house.fill" size={32} color={theme.textSecondary} />
                )}
                {dimmed && (
                  <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: Brand.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm }}>
                    <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>TAKASLANDI</ThemedText>
                  </View>
                )}
              </View>
              <View style={styles.productInfo}>
                <ThemedText style={styles.productTitle} numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText style={styles.productDesc} numberOfLines={1}>{formatPrice(item.price) ?? `Takas: ${item.swap_expectation}`}</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Brand.accent} />
      </ThemedView>
    );
  }

  return (
    <SubPage title="Profil" wide>
      {!user ? (
        <View style={{ alignItems: 'center', padding: Spacing.eight }}>
          <ThemedText style={{ color: theme.textSecondary }}>Kullanıcı bulunamadı.</ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected, overflow: 'hidden' }]}>
              {user.profile_photo_path ? (
                <Image source={{ uri: getImageUrl(user.profile_photo_path) || undefined }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <IconSymbol name="person.fill" size={40} color={theme.textSecondary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle">{user.name}</ThemedText>
              {(user.city || user.district) && (
                <ThemedText style={{ color: theme.textSecondary, marginTop: 2 }}>
                  📍 {user.city}{user.city && user.district ? ', ' : ''}{user.district}
                </ThemedText>
              )}
              {memberSince && (
                <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {memberSince} tarihinden beri üye
                </ThemedText>
              )}
              <View style={{ marginTop: 4, gap: 4 }}>
                <StatsLine stats={stats} size={13} />
                <TrustBadges badges={stats?.badges} />
              </View>
            </View>
            {meId !== null && meId !== user.id && (
              <TouchableOpacity onPress={() => setReportOpen(true)} accessibilityRole="button" accessibilityLabel="Kullanıcıyı şikayet et" style={{ padding: Spacing.two }}>
                <IconSymbol name="flag.fill" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <ReportModal visible={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={user.id} title={user.name} />

          {!!user.bio && (
            <ThemedText style={{ color: theme.textSecondary, lineHeight: 21 }}>{user.bio}</ThemedText>
          )}

          <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
            {([['active', `Aktif İlanlar (${products.length})`], ['traded', 'Takaslananlar'], ['reviews', `Değerlendirmeler (${stats?.reviews_count ?? 0})`]] as const).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === key }}
                style={{ paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.full, backgroundColor: tab === key ? Brand.accent : theme.backgroundSelected }}
              >
                <ThemedText style={{ color: tab === key ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'reviews' && (
            <View style={styles.section}>
              {reviews.length === 0 ? (
                <ThemedText style={{ color: theme.textSecondary }}>Bu kullanıcı henüz değerlendirilmemiş. Değerlendirmeler yalnızca tamamlanan takaslardan sonra yazılabilir.</ThemedText>
              ) : (
                reviews.map((r) => (
                  <View key={r.id} style={{ gap: 2, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                    <ThemedText style={{ fontWeight: '700' }}>
                      <ThemedText style={{ color: Brand.warning }}>{'★'.repeat(r.rating)}</ThemedText>
                      <ThemedText style={{ color: theme.border }}>{'★'.repeat(5 - r.rating)}</ThemedText>
                      {'  '}{r.reviewer}
                    </ThemedText>
                    {!!r.comment && <ThemedText>{r.comment}</ThemedText>}
                    <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>{timeAgo(r.created_at)}</ThemedText>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'active' && renderProducts(products, 'Bu kullanıcının yayında bir ilanı yok.', false)}
          {tab === 'traded' && (traded === null ? <ActivityIndicator color={Brand.accent} /> : renderProducts(traded, 'Bu kullanıcı henüz bir takas tamamlamamış.', true))}
        </>
      )}

    </SubPage>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  productCard: { width: '47%', borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  imagePlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center' },
  productInfo: { padding: Spacing.three },
  productTitle: { fontWeight: '600', marginBottom: 2 },
  productDesc: { fontSize: 12, opacity: 0.7 },
});
