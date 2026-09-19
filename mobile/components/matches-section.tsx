import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, getImageUrl } from '@/utils/api';
import { formatPrice } from '@/utils/listing';

interface Match {
  mutual: boolean;
  score: number;
  my_product: { id: number; title: string; thumb_path: string | null };
  their_product: { id: number; title: string; thumb_path: string | null; city: string | null; price: number | null; user: { id: number; name: string } };
}

const COLLAPSED = 3;

function Thumb({ path }: { path: string | null }) {
  const theme = useTheme();
  const clean = typeof path === 'string' && path.startsWith('[') ? JSON.parse(path)[0] : path;
  return (
    <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
      {clean ? <Image source={{ uri: getImageUrl(clean) || undefined }} style={{ width: '100%', height: '100%' }} /> : <IconSymbol name="house.fill" size={18} color={theme.textSecondary} />}
    </View>
  );
}

// "Sana Uygun Takaslar": ilanlarındaki takas beklentisiyle gerçek ilanların eşleşmesi. Eşleşme yoksa bölüm hiç görünmez.
export function MatchesSection() {
  const theme = useTheme();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(() => {
    api.get('/matches').then((r) => setMatches(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  if (matches.length === 0) return null;
  const shown = expanded ? matches : matches.slice(0, COLLAPSED);

  return (
    <View style={{ gap: Spacing.three }}>
      <View>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>Sana Uygun Takaslar</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>İlanlarındaki takas beklentisine göre bulundu</ThemedText>
      </View>

      {shown.map((m) => (
        <TouchableOpacity
          key={`${m.my_product.id}-${m.their_product.id}`}
          onPress={() => router.push(`/product/${m.their_product.id}/offer?offered=${m.my_product.id}` as any)}
          accessibilityRole="link"
          accessibilityLabel={`${m.my_product.title} ile ${m.their_product.title} takası için teklif gönder`}
          style={[styles.card, { backgroundColor: theme.cardBg, borderColor: m.mutual ? Brand.accent : theme.border }]}
        >
          <View style={styles.side}>
            <Thumb path={m.my_product.thumb_path} />
            <ThemedText style={styles.title} numberOfLines={2}>{m.my_product.title}</ThemedText>
          </View>
          <IconSymbol name="arrow.left.arrow.right" size={20} color={Brand.accent} />
          <View style={styles.side}>
            <Thumb path={m.their_product.thumb_path} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.title} numberOfLines={2}>{m.their_product.title}</ThemedText>
              <ThemedText style={{ fontSize: 11, color: theme.textSecondary }} numberOfLines={1}>
                {[m.their_product.user?.name, m.their_product.city, formatPrice(m.their_product.price)].filter(Boolean).join(' · ')}
              </ThemedText>
            </View>
          </View>
          {m.mutual && (
            <View style={[styles.badge, { backgroundColor: Brand.accent }]}>
              <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>KARŞILIKLI</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {matches.length > COLLAPSED && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>{expanded ? 'Daha az göster' : `Tümünü gör (${matches.length})`}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md, borderWidth: 1, position: 'relative' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thumb: { width: 44, height: 44, borderRadius: Radius.sm, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  badge: { position: 'absolute', top: -8, right: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
});
