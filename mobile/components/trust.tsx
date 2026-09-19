import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface UserStatsData {
  rating_avg: number | null;
  reviews_count: number;
  completed_trades: number;
  badges: string[];
}

// Rozet anahtarları backend'deki UserStats sabitleriyle aynıdır; hepsi gerçek verilerden türetilir
const BADGES: Record<string, { label: string; color: string }> = {
  email_verified: { label: 'E-posta Doğrulandı', color: Brand.success },
  trusted_swapper: { label: 'Başarılı Takasçı', color: Brand.success },
  highly_rated: { label: 'Yüksek Puanlı', color: Brand.warning },
  new_member: { label: 'Yeni Üye', color: Brand.accent },
};

export function TrustBadges({ badges }: { badges?: string[] }) {
  const shown = (badges ?? []).filter((b) => BADGES[b]);
  if (shown.length === 0) return null;

  return (
    <View style={styles.row}>
      {shown.map((b) => (
        <View key={b} style={[styles.badge, { backgroundColor: BADGES[b].color + '20' }]}>
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: BADGES[b].color }}>{BADGES[b].label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

// "4,8 ★ · 12 değerlendirme · 5 tamamlanan takas"; hiç veri yoksa "Henüz değerlendirme yok"
export function StatsLine({ stats, size = 12 }: { stats?: UserStatsData; size?: number }) {
  const theme = useTheme();
  if (!stats) return null;

  const parts: string[] = [];
  if (stats.reviews_count > 0 && stats.rating_avg !== null) {
    parts.push(`${stats.rating_avg.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} ★ · ${stats.reviews_count} değerlendirme`);
  } else {
    parts.push('Henüz değerlendirme yok');
  }
  if (stats.completed_trades > 0) parts.push(`${stats.completed_trades} tamamlanan takas`);

  return <ThemedText style={{ fontSize: size, color: theme.textSecondary }}>{parts.join(' · ')}</ThemedText>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: Radius.full },
});
