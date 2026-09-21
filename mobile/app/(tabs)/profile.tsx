import { StyleSheet, View, ScrollView, ActivityIndicator, Image } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import * as SecureStore from '@/utils/storage';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api, getImageUrl } from '@/utils/api';
import { SiteFooter } from '@/components/web-storefront';
import { useIsDesktopWeb } from '@/hooks/use-is-desktop-web';
import { usePageTitle } from '@/utils/use-page-title';
import { disconnectRealtime } from '@/utils/realtime';

interface User {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  profile_photo_path?: string | null;
  city?: string | null;
  created_at?: string;
  is_admin?: boolean;
}

interface Stats {
  products: number;
  favorites: number;
  completedTrades: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  usePageTitle('Profilim');
  const isDesktopWeb = useIsDesktopWeb();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      if (isDesktopWeb) fetchStats();
    }, [isDesktopWeb])
  );

  const fetchUser = async () => {
    try {
      const response = await api.get('/user');
      setUser(response.data);
    } catch (error) {
      console.error('Kullanıcı bilgileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sadece masaüstünde gösterilen profil özet istatistikleri — hepsi gerçek, canlı veri
  const fetchStats = async () => {
    try {
      const [productsRes, favoritesRes, tradesRes] = await Promise.all([
        api.get('/user/products'),
        api.get('/favorites'),
        api.get('/trades'),
      ]);
      const incoming = tradesRes.data.incoming || [];
      const outgoing = tradesRes.data.outgoing || [];
      const completedTrades = [...incoming, ...outgoing].filter((t: any) => t.status === 'onaylandı').length;
      setStats({
        products: productsRes.data.length,
        favorites: favoritesRes.data.length,
        completedTrades,
      });
    } catch (error) {
      console.error('Profil istatistikleri alınamadı:', error);
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    disconnectRealtime();
    router.replace('/(auth)/welcome');
  };

  if (isDesktopWeb) {
    const memberSince = user?.created_at
      ? new Date(user.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
      : null;

    const navItems: { label: string; href: any; danger?: boolean }[] = [
      { label: 'Profil Ayarlarım', href: '/profile-settings' },
      { label: 'İlanlarım', href: '/my-listings' },
      { label: 'Takaslarım', href: '/my-trades' },
      { label: 'Favorilerim', href: '/favorites' },
      { label: 'Mesajlarım', href: '/messages' },
      { label: 'Bildirimlerim', href: '/notifications' },
      { label: 'Kayıtlı Aramalarım', href: '/saved-searches' },
      { label: 'Ayarlar', href: '/settings' },
      ...(user?.is_admin ? [{ label: 'Yönetim Paneli', href: '/admin' }] : []),
    ];

    const statCards: { label: string; value: number | undefined; icon: 'house.fill' | 'heart.fill' | 'arrow.left.arrow.right'; href: any }[] = [
      { label: 'Aktif İlan', value: stats?.products, icon: 'house.fill', href: '/my-listings' },
      { label: 'Favori', value: stats?.favorites, icon: 'heart.fill', href: '/favorites' },
      { label: 'Tamamlanan Takas', value: stats?.completedTrades, icon: 'arrow.left.arrow.right', href: '/my-trades' },
    ];

    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={desktopProfileStyles.page}>
          <View style={desktopProfileStyles.mainRow}>
            <View style={desktopProfileStyles.sideCol}>
              <View style={[desktopProfileStyles.profileCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={[styles.avatar, { width: 84, height: 84, borderRadius: 42, backgroundColor: theme.backgroundSelected, overflow: 'hidden' }]}>
                  {user?.profile_photo_path ? (
                    <Image source={{ uri: getImageUrl(user.profile_photo_path) || undefined }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <IconSymbol name="person.fill" size={36} color={theme.textSecondary} />
                  )}
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color={Brand.accent} style={{ marginTop: Spacing.three }} />
                ) : user ? (
                  <>
                    <ThemedText type="subtitle" style={{ fontSize: 18, marginTop: Spacing.three }}>{user.name}</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2, textAlign: 'center' }}>
                      {[user.city, memberSince ? `${memberSince}'dan beri üye` : null].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText type="subtitle" style={{ marginTop: Spacing.three }}>Kullanıcı Bulunamadı</ThemedText>
                )}
                <TouchableOpacity
                  style={[desktopProfileStyles.editBtn, { borderColor: Brand.accent }]}
                  onPress={() => router.push('/profile-settings')}
                >
                  <ThemedText style={{ color: Brand.accent, fontWeight: '700', fontSize: 13 }}>Profili Düzenle</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={[desktopProfileStyles.navCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                {navItems.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[desktopProfileStyles.navRow, { borderBottomColor: theme.border }]}
                    onPress={() => router.push(item.href)}
                  >
                    <ThemedText style={{ fontSize: 14 }}>{item.label}</ThemedText>
                    <IconSymbol name="chevron.right" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[desktopProfileStyles.navRow, { borderBottomWidth: 0 }]} onPress={handleLogout}>
                  <ThemedText style={{ color: Brand.danger, fontWeight: '700', fontSize: 14 }}>Çıkış Yap</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={desktopProfileStyles.statsCol}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>Hesabım</ThemedText>
              <View style={desktopProfileStyles.statsRow}>
                {statCards.map((card) => (
                  <TouchableOpacity
                    key={card.label}
                    style={[desktopProfileStyles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                    onPress={() => router.push(card.href)}
                  >
                    <View style={[desktopProfileStyles.statIconCircle, { backgroundColor: Brand.accent + '1A' }]}>
                      <IconSymbol name={card.icon} size={20} color={Brand.accent} />
                    </View>
                    <ThemedText style={desktopProfileStyles.statValue}>
                      {card.value === undefined ? '—' : card.value}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{card.label}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        <SiteFooter />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="title" style={{ fontSize: 24, color: Brand.wordmark }}>Profil</ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.four, gap: Spacing.six }}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected, overflow: 'hidden' }]}>
            {user?.profile_photo_path ? (
              <Image source={{ uri: getImageUrl(user.profile_photo_path) || undefined }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <IconSymbol name="person.fill" size={40} color={theme.textSecondary} />
            )}
          </View>
          <View>
            {loading ? (
              <ActivityIndicator size="small" color={Brand.accent} />
            ) : user ? (
              <>
                <ThemedText type="subtitle">{user.name}</ThemedText>
                <ThemedText style={{ color: theme.textSecondary }}>{user.email}</ThemedText>
              </>
            ) : (
              <ThemedText type="subtitle">Kullanıcı Bulunamadı</ThemedText>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/profile-settings')}
          >
            <ThemedText style={{ fontWeight: 'bold' }}>Profil Ayarlarım</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/my-listings')}
          >
            <ThemedText>İlanlarım</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/my-trades')}
          >
            <ThemedText>Takaslarım</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/favorites')}
          >
            <ThemedText>Favorilerim</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/messages')}
          >
            <ThemedText>Mesajlarım</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/notifications')}
          >
            <ThemedText>Bildirimlerim</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/saved-searches')}
          >
            <ThemedText>Kayıtlı Aramalarım</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
            onPress={() => router.push('/settings')}
          >
            <ThemedText>Ayarlar</ThemedText>
            <IconSymbol name="chevron.right" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: theme.cardBg, borderBottomColor: 'transparent', marginTop: Spacing.four }]}
            onPress={handleLogout}
          >
            <ThemedText style={{ color: Brand.danger, fontWeight: 'bold' }}>Çıkış Yap</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.four, paddingTop: Spacing.eight },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  section: { borderRadius: Radius.md, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.four, borderBottomWidth: 1 }
});

const desktopProfileStyles = StyleSheet.create({
  page: { paddingHorizontal: Spacing.seven, paddingVertical: Spacing.six, maxWidth: 1000, width: '100%', alignSelf: 'center' },
  mainRow: { flexDirection: 'row', gap: Spacing.seven, alignItems: 'flex-start' },

  sideCol: { width: 260, gap: Spacing.five },
  profileCard: { alignItems: 'center', padding: Spacing.six, borderRadius: Radius.lg, borderWidth: 1 },
  editBtn: { marginTop: Spacing.four, borderWidth: 1.5, borderRadius: Radius.full, paddingHorizontal: Spacing.five, paddingVertical: Spacing.two },
  navCard: { borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.five, paddingVertical: Spacing.four, borderBottomWidth: 1 },

  statsCol: { flex: 1, gap: Spacing.four },
  statsRow: { flexDirection: 'row', gap: Spacing.four },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.six, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.two },
  statIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.two },
  statValue: { fontSize: 24, fontWeight: '800' },
});
