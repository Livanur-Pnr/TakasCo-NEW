import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { Alert } from '@/utils/alert';

export default function BlockedUsersScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/blocks');
      setItems(r.data.data);
    } catch {
      // 401 durumunu api interceptor'ı yönetir
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unblock = async (u: { id: number; name: string }) => {
    try {
      await api.delete(`/users/${u.id}/block`);
      setItems((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e: any) {
      Alert.alert('Hata', e.response?.data?.message || 'Engel kaldırılamadı.');
    }
  };

  return (
    <SubPage title="Engellenen Kullanıcılar" gap={Spacing.three}>
      {loading ? (
        <ActivityIndicator color={Brand.accent} style={{ marginTop: Spacing.six }} />
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', padding: Spacing.eight, gap: Spacing.three }}>
          <IconSymbol name="person.fill" size={48} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Engellediğin bir kullanıcı yok.</ThemedText>
        </View>
      ) : (
        items.map((u) => (
          <View key={u.id} style={[styles.row, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <ThemedText style={{ flex: 1, fontWeight: '600' }}>{u.name}</ThemedText>
            <TouchableOpacity onPress={() => unblock(u)} accessibilityRole="button" style={[styles.btn, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Engeli Kaldır</ThemedText>
            </TouchableOpacity>
          </View>
        ))
      )}
    </SubPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four, borderRadius: Radius.md, borderWidth: 1 },
  btn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.full },
});
