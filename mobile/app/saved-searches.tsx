import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

interface SavedSearch { id: number; q: string | null; category_id: number | null; category_name: string | null; city: string | null; condition: string | null; label: string }

export default function SavedSearchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/saved-searches');
      setItems(r.data.data);
    } catch {
      // 401 durumunu api interceptor'ı yönetir
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (s: SavedSearch) => {
    const params = new URLSearchParams();
    if (s.q) params.set('q', s.q);
    if (s.category_id) { params.set('categoryId', String(s.category_id)); if (s.category_name) params.set('categoryName', s.category_name); }
    if (s.city) params.set('city', s.city);
    if (s.condition) params.set('condition', s.condition);
    router.push(`/(tabs)/search?${params.toString()}` as any);
  };

  const remove = (s: SavedSearch) => {
    Alert.alert('Aramayı Sil', `"${s.label}" araması silinsin mi? Bu arama için bildirim almayacaksın.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/saved-searches/${s.id}`);
            setItems((prev) => prev.filter((x) => x.id !== s.id));
          } catch (e: any) {
            Alert.alert('Hata', e.response?.data?.message || 'Silinemedi.');
          }
        },
      },
    ]);
  };

  return (
    <SubPage title="Kayıtlı Aramalarım" gap={Spacing.three}>
      {loading ? (
        <ActivityIndicator color={Brand.accent} style={{ marginTop: Spacing.six }} />
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', padding: Spacing.eight, gap: Spacing.three }}>
          <IconSymbol name="magnifyingglass" size={48} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
            Henüz kayıtlı aramanın yok. Keşfet sayfasında bir arama yapıp Bu aramayı kaydet seçeneğine dokunursan, uyan yeni ilanlar için bildirim alırsın.
          </ThemedText>
        </View>
      ) : (
        items.map((s) => (
          <View key={s.id} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => open(s)} accessibilityRole="link">
              <ThemedText style={{ fontWeight: '700' }} numberOfLines={2}>{s.label}</ThemedText>
              <ThemedText style={{ color: Brand.accent, fontSize: 12, marginTop: 2 }}>Sonuçları gör</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(s)} accessibilityRole="button" accessibilityLabel="Aramayı sil" style={{ padding: Spacing.two }}>
              <IconSymbol name="trash.fill" size={20} color={Brand.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </SubPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.md, borderWidth: 1 },
});
