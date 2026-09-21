import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TouchableOpacity } from '@/components/ui/touchable';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/utils/api';
import { clearRecent, loadRecent } from '@/utils/recent-searches';

interface Suggestions { products: { id: number; title: string }[]; categories: { id: number; name: string }[]; brands: string[] }
const EMPTY: Suggestions = { products: [], categories: [], brands: [] };

// Arama kutusunun altında satır içi öneri listesi (mobil arama ekranı): 2+ karakterde gerçek öneriler, boşken son aramalar
export function SearchSuggestions({ query, visible, onPickProduct, onPickCategory, onPickTerm }: {
  query: string;
  visible: boolean;
  onPickProduct: (id: number) => void;
  onPickCategory: (id: number, name: string) => void;
  onPickTerm: (term: string) => void;
}) {
  const theme = useTheme();
  const [recent, setRecent] = useState<string[]>([]);
  const [data, setData] = useState<Suggestions>(EMPTY);
  const term = query.trim();

  useEffect(() => {
    if (visible) loadRecent().then(setRecent);
  }, [visible]);

  useEffect(() => {
    if (term.length < 2) {
      setData(EMPTY);
      return;
    }
    const timer = setTimeout(() => {
      api.get('/search/suggestions', { params: { q: term } }).then((r) => setData(r.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [term]);

  if (!visible) return null;

  const hasData = data.products.length + data.categories.length + data.brands.length > 0;
  const showRecent = term.length < 2 && recent.length > 0;
  if (!showRecent && !(term.length >= 2 && hasData)) return null;

  const row = (key: string, label: string, hint: string | undefined, onPress: () => void) => (
    <TouchableOpacity key={key} onPress={onPress} accessibilityRole="link" style={styles.row}>
      <ThemedText style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{label}</ThemedText>
      {!!hint && <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>{hint}</ThemedText>}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.box, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      {showRecent ? (
        <>
          <View style={styles.header}>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: theme.textSecondary }}>SON ARAMALAR</ThemedText>
            <TouchableOpacity onPress={async () => { await clearRecent(); setRecent([]); }} accessibilityRole="button">
              <ThemedText style={{ fontSize: 12, color: Brand.accent }}>Temizle</ThemedText>
            </TouchableOpacity>
          </View>
          {recent.map((t) => row(`r-${t}`, t, undefined, () => onPickTerm(t)))}
        </>
      ) : (
        <>
          {data.products.map((p) => row(`p-${p.id}`, p.title, 'İlan', () => onPickProduct(p.id)))}
          {data.categories.map((c) => row(`c-${c.id}`, c.name, 'Kategori', () => onPickCategory(c.id, c.name)))}
          {data.brands.map((b) => row(`b-${b}`, b, 'Marka', () => onPickTerm(b)))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
