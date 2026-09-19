import { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getImageUrl } from '@/utils/api';
import { timeAgo } from '@/utils/date';
import { badgeFor, formatPrice } from '@/utils/listing';

export interface ProductCardItem {
  id: number;
  title: string;
  image_path: string | null;
  thumb_path?: string | null;
  swap_expectation: string;
  condition?: string | null;
  city?: string | null;
  created_at?: string;
  favorited_by_count?: number;
  price?: number | null;
  listing_type?: string;
  brand?: string | null;
}

// Ana sayfa ve keşfet ızgarasında ortak kullanılan ürün kartı
export function ProductCard({ item, isFavorite, onToggleFavorite }: { item: ProductCardItem; isFavorite: boolean; onToggleFavorite: () => void }) {
  const router = useRouter();
  const theme = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const stored = item.thumb_path ?? item.image_path;
  const imagePath = stored?.startsWith('[') ? JSON.parse(stored)[0] : stored;
  const meta = [item.brand, item.condition, item.city, timeAgo(item.created_at)].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
      onPress={() => router.push(`/product/${item.id}`)}
      accessibilityRole="link"
      accessibilityLabel={item.title}
    >
      <View style={[styles.image, { backgroundColor: theme.backgroundSelected }]}>
        {imagePath && !imageFailed ? (
          <Image source={{ uri: getImageUrl(imagePath) || undefined }} style={{ width: '100%', height: '100%' }} onError={() => setImageFailed(true)} />
        ) : (
          <IconSymbol name="house.fill" size={32} color={theme.textSecondary} />
        )}
        <View style={[styles.badge, { backgroundColor: item.listing_type === 'satilik' ? theme.backgroundElement : Brand.accent }]}>
          <ThemedText style={{ fontSize: 10, fontWeight: '700', color: item.listing_type === 'satilik' ? theme.text : '#fff' }}>{badgeFor(item.listing_type)}</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.favorite, { backgroundColor: theme.backgroundElement }]}
          onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          accessibilityState={{ selected: isFavorite }}
        >
          <IconSymbol name="heart.fill" size={13} color={isFavorite ? Brand.danger : theme.textSecondary} />
          {!!item.favorited_by_count && <ThemedText style={styles.favCount}>{item.favorited_by_count}</ThemedText>}
        </TouchableOpacity>
      </View>
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>{item.title}</ThemedText>
        {!!formatPrice(item.price) && <ThemedText style={styles.price}>{formatPrice(item.price)}</ThemedText>}
        {!!item.swap_expectation && item.listing_type !== 'satilik' && <ThemedText style={styles.desc} numberOfLines={1}>Takas: {item.swap_expectation}</ThemedText>}
        {!!meta && <ThemedText style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>{meta}</ThemedText>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden' },
  image: { height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  favorite: { position: 'absolute', top: Spacing.two, right: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 5, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  favCount: { fontSize: 11, fontWeight: '700' },
  info: { padding: Spacing.three, gap: 2 },
  title: { fontWeight: '600' },
  price: { fontWeight: '800', fontSize: 15 },
  badge: { position: 'absolute', top: Spacing.two, left: Spacing.two, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3 },
  desc: { fontSize: 12, opacity: 0.7 },
  meta: { fontSize: 11, marginTop: 2 },
});
