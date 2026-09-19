import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getImageUrl } from '@/utils/api';
import { Alert } from '@/utils/alert';
import { timeAgo } from '@/utils/date';

type Tab = 'overview' | 'products' | 'users' | 'reports';

interface Overview { users: number; active_products: number; removed_products: number; active_trades: number; completed_trades: number; conversations: number; pending_reports: number }
interface AdminReport { id: number; target_type: 'product' | 'user'; target_id: number; target_label: string; reason: string; details: string | null; status: string; reporter: string | null; created_at: string }

const REASON_LABEL: Record<string, string> = { spam: 'Spam / reklam', yaniltici: 'Yanıltıcı bilgi', uygunsuz: 'Uygunsuz içerik', sahte: 'Sahte / taklit', diger: 'Diğer' };
interface AdminProduct { id: number; title: string; status: number; thumb_path: string | null; category: string | null; owner: { id: number; name: string; email: string } | null; created_at: string; deleted: boolean }
interface AdminUser { id: number; name: string; email: string; city: string | null; is_admin: boolean; suspended: boolean; products_count: number; created_at: string }

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: 'Yayında', color: Brand.success },
  2: { label: 'Yayında', color: Brand.success },
  3: { label: 'Takaslandı', color: Brand.accent },
  4: { label: 'Kaldırıldı', color: Brand.danger },
};

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.pill, { backgroundColor: active ? Brand.accent : theme.backgroundSelected }]}
    >
      <ThemedText style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>{label}</ThemedText>
    </TouchableOpacity>
  );
}

export default function AdminScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('overview');
  const [forbidden, setForbidden] = useState(false);

  // Yetki kararı backend'de (IsAdmin middleware): 403 gelirse panel gösterilmez
  const onError = useCallback((e: any) => {
    if (e.response?.status === 403) setForbidden(true);
  }, []);

  return (
    <SubPage title="Yönetim Paneli" wide gap={Spacing.four}>
      {forbidden ? (
        <View style={{ alignItems: 'center', padding: Spacing.eight, gap: Spacing.three }}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={Brand.warning} />
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Bu sayfaya erişim yetkin yok.</ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            <Pill label="Genel Bakış" active={tab === 'overview'} onPress={() => setTab('overview')} />
            <Pill label="İlanlar" active={tab === 'products'} onPress={() => setTab('products')} />
            <Pill label="Kullanıcılar" active={tab === 'users'} onPress={() => setTab('users')} />
            <Pill label="Şikayetler" active={tab === 'reports'} onPress={() => setTab('reports')} />
          </View>
          {tab === 'overview' && <OverviewTab onError={onError} />}
          {tab === 'products' && <ProductsTab onError={onError} />}
          {tab === 'users' && <UsersTab onError={onError} />}
          {tab === 'reports' && <ReportsTab onError={onError} />}
        </>
      )}
    </SubPage>
  );
}

function OverviewTab({ onError }: { onError: (e: any) => void }) {
  const theme = useTheme();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    api.get('/admin/overview').then((r) => setData(r.data)).catch(onError);
  }, [onError]);

  if (!data) return <ActivityIndicator color={Brand.accent} style={{ marginTop: Spacing.six }} />;

  const cards: { label: string; value: number }[] = [
    { label: 'Kullanıcı', value: data.users },
    { label: 'Yayındaki İlan', value: data.active_products },
    { label: 'Kaldırılan İlan', value: data.removed_products },
    { label: 'Bekleyen Teklif', value: data.active_trades },
    { label: 'Tamamlanan Takas', value: data.completed_trades },
    { label: 'Konuşma', value: data.conversations },
    { label: 'Bekleyen Şikayet', value: data.pending_reports },
  ];

  return (
    <View style={styles.cardGrid}>
      {cards.map((c) => (
        <View key={c.label} style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <ThemedText style={{ fontSize: 28, fontWeight: '800' }}>{c.value}</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{c.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function ProductsTab({ onError }: { onError: (e: any) => void }) {
  const theme = useTheme();
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    try {
      const r = await api.get('/admin/products', { params: { page: pageToLoad, q: debounced || undefined, status: status ?? undefined } });
      setItems((prev) => (pageToLoad === 1 ? r.data.data : [...prev, ...r.data.data]));
      setPage(r.data.current_page);
      setLastPage(r.data.last_page);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [debounced, status, onError]);

  useEffect(() => { load(1); }, [load]);

  const act = (p: AdminProduct, kind: 'remove' | 'restore') => {
    const remove = kind === 'remove';
    Alert.alert(remove ? 'İlanı Kaldır' : 'İlanı Geri Yükle', remove
      ? `"${p.title}" ilanı yayından kaldırılacak ve üzerindeki bekleyen teklifler reddedilecek.`
      : `"${p.title}" ilanı yeniden yayına alınacak.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: remove ? 'Kaldır' : 'Geri Yükle',
        style: remove ? 'destructive' : 'default',
        onPress: async () => {
          try {
            const r = await api.post(`/admin/products/${p.id}/${kind}`);
            Alert.alert('Başarılı', r.data.message);
            load(1);
          } catch (e: any) {
            Alert.alert('Hata', e.response?.data?.message || 'İşlem yapılamadı.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <TextInput
        style={[styles.search, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        placeholder="İlan başlığında ara..."
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="İlan ara"
      />
      <View style={styles.tabs}>
        <Pill label="Tümü" active={status === null} onPress={() => setStatus(null)} />
        <Pill label="Yayında" active={status === 1} onPress={() => setStatus(1)} />
        <Pill label="Takaslandı" active={status === 3} onPress={() => setStatus(3)} />
        <Pill label="Kaldırıldı" active={status === 4} onPress={() => setStatus(4)} />
      </View>

      {items.map((p) => {
        const s = STATUS_LABEL[p.status] ?? { label: 'Bilinmiyor', color: theme.textSecondary };
        return (
          <View key={p.id} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
              {!!p.thumb_path && <Image source={{ uri: getImageUrl(p.thumb_path.startsWith('[') ? JSON.parse(p.thumb_path)[0] : p.thumb_path) || undefined }} style={{ width: '100%', height: '100%' }} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText style={{ fontWeight: '700' }} numberOfLines={1}>{p.title}</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
                {p.owner?.name} · {p.category ?? '—'} · {timeAgo(p.created_at)}
              </ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: s.color + '20' }]}>
              <ThemedText style={{ color: s.color, fontSize: 11, fontWeight: '700' }}>{s.label}</ThemedText>
            </View>
            {p.status === 4 ? (
              <TouchableOpacity onPress={() => act(p, 'restore')} accessibilityRole="button" style={[styles.action, { backgroundColor: Brand.accent }]}>
                <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Geri Yükle</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => act(p, 'remove')} accessibilityRole="button" style={[styles.action, { backgroundColor: Brand.danger + '18' }]}>
                <ThemedText style={{ color: Brand.danger, fontWeight: '700', fontSize: 12 }}>Kaldır</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {loading && <ActivityIndicator color={Brand.accent} />}
      {!loading && items.length === 0 && <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Kayıt bulunamadı.</ThemedText>}
      {!loading && page < lastPage && (
        <TouchableOpacity onPress={() => load(page + 1)} accessibilityRole="button" style={{ alignSelf: 'center' }}>
          <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Daha fazla yükle</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ReportsTab({ onError }: { onError: (e: any) => void }) {
  const theme = useTheme();
  const [status, setStatus] = useState<'beklemede' | 'çözüldü' | 'reddedildi'>('beklemede');
  const [items, setItems] = useState<AdminReport[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    try {
      const r = await api.get('/admin/reports', { params: { page: pageToLoad, status } });
      setItems((prev) => (pageToLoad === 1 ? r.data.data : [...prev, ...r.data.data]));
      setPage(r.data.current_page);
      setLastPage(r.data.last_page);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [status, onError]);

  useEffect(() => { load(1); }, [load]);

  const resolve = async (r: AdminReport, result: 'çözüldü' | 'reddedildi') => {
    try {
      await api.post(`/admin/reports/${r.id}/resolve`, { status: result });
      setItems((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e: any) {
      Alert.alert('Hata', e.response?.data?.message || 'İşlem yapılamadı.');
    }
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <View style={styles.tabs}>
        <Pill label="Bekleyen" active={status === 'beklemede'} onPress={() => setStatus('beklemede')} />
        <Pill label="Çözüldü" active={status === 'çözüldü'} onPress={() => setStatus('çözüldü')} />
        <Pill label="Reddedildi" active={status === 'reddedildi'} onPress={() => setStatus('reddedildi')} />
      </View>

      {items.map((r) => (
        <View key={r.id} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={{ fontWeight: '700' }} numberOfLines={1}>
              {r.target_type === 'product' ? 'İlan' : 'Kullanıcı'}: {r.target_label}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>
              {REASON_LABEL[r.reason] ?? r.reason} · {r.reporter ?? '—'} · {timeAgo(r.created_at)}
            </ThemedText>
            {!!r.details && <ThemedText style={{ fontSize: 13 }}>{r.details}</ThemedText>}
          </View>
          {status === 'beklemede' && (
            <>
              <TouchableOpacity onPress={() => resolve(r, 'reddedildi')} accessibilityRole="button" style={[styles.action, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={{ fontWeight: '700', fontSize: 12 }}>Reddet</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => resolve(r, 'çözüldü')} accessibilityRole="button" style={[styles.action, { backgroundColor: Brand.accent }]}>
                <ThemedText style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Çözüldü</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}

      {loading && <ActivityIndicator color={Brand.accent} />}
      {!loading && items.length === 0 && <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Şikayet yok.</ThemedText>}
      {!loading && page < lastPage && (
        <TouchableOpacity onPress={() => load(page + 1)} accessibilityRole="button" style={{ alignSelf: 'center' }}>
          <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Daha fazla yükle</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

function UsersTab({ onError }: { onError: (e: any) => void }) {
  const theme = useTheme();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async (pageToLoad: number) => {
    setLoading(true);
    try {
      const r = await api.get('/admin/users', { params: { page: pageToLoad, q: debounced || undefined } });
      setItems((prev) => (pageToLoad === 1 ? r.data.data : [...prev, ...r.data.data]));
      setPage(r.data.current_page);
      setLastPage(r.data.last_page);
    } catch (e) {
      onError(e);
    } finally {
      setLoading(false);
    }
  }, [debounced, onError]);

  useEffect(() => { load(1); }, [load]);

  const toggleSuspend = (u: AdminUser) => {
    const suspend = !u.suspended;
    Alert.alert(suspend ? 'Hesabı Askıya Al' : 'Askıyı Kaldır', suspend
      ? `${u.name} oturumları kapatılacak ve giriş yapamayacak.`
      : `${u.name} yeniden giriş yapabilecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: suspend ? 'Askıya Al' : 'Askıyı Kaldır',
        style: suspend ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await api.post(`/admin/users/${u.id}/${suspend ? 'suspend' : 'unsuspend'}`);
            setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, suspended: suspend } : x)));
          } catch (e: any) {
            Alert.alert('Hata', e.response?.data?.message || 'İşlem yapılamadı.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <TextInput
        style={[styles.search, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
        placeholder="İsim veya e-posta ile ara..."
        placeholderTextColor={theme.textSecondary}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Kullanıcı ara"
      />
      {items.map((u) => (
        <View key={u.id} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={{ fontWeight: '700' }} numberOfLines={1}>{u.name}{u.is_admin ? '  ·  Yönetici' : ''}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }} numberOfLines={1}>{u.email}{u.city ? ` · ${u.city}` : ''}</ThemedText>
          </View>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>{u.products_count} ilan · {timeAgo(u.created_at)} üye</ThemedText>
          {u.suspended && (
            <View style={[styles.badge, { backgroundColor: Brand.danger + '20' }]}>
              <ThemedText style={{ color: Brand.danger, fontSize: 11, fontWeight: '700' }}>Askıda</ThemedText>
            </View>
          )}
          {!u.is_admin && (
            <TouchableOpacity onPress={() => toggleSuspend(u)} accessibilityRole="button" style={[styles.action, { backgroundColor: u.suspended ? Brand.accent : Brand.danger + '18' }]}>
              <ThemedText style={{ color: u.suspended ? '#fff' : Brand.danger, fontWeight: '700', fontSize: 12 }}>{u.suspended ? 'Askıyı Kaldır' : 'Askıya Al'}</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {loading && <ActivityIndicator color={Brand.accent} />}
      {!loading && items.length === 0 && <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Kayıt bulunamadı.</ThemedText>}
      {!loading && page < lastPage && (
        <TouchableOpacity onPress={() => load(page + 1)} accessibilityRole="button" style={{ alignSelf: 'center' }}>
          <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Daha fazla yükle</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: Radius.full },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  statCard: { flexBasis: 200, flexGrow: 1, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.five, gap: Spacing.one },
  search: { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: Spacing.four, height: 44, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1 },
  thumb: { width: 48, height: 48, borderRadius: Radius.sm, overflow: 'hidden' },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.full },
  action: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full },
});
