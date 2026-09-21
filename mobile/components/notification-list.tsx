import { StyleSheet, View } from 'react-native';
import { Stagger } from '@/components/ui/motion';
import { TouchableOpacity } from '@/components/ui/touchable';
import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AppNotification } from '@/hooks/use-notifications';
import { timeAgo } from '@/utils/date';

// Bildirim satırları (header açılır paneli ve /notifications sayfasında ortak)
export function NotificationList({ items, onPressItem, limit }: { items: AppNotification[]; onPressItem: (n: AppNotification) => void; limit?: number }) {
  const theme = useTheme();
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <View>
      {shown.map((n, index) => (
        <Stagger key={n.id} id={`nt${n.id}`} index={index}>
        <TouchableOpacity
          onPress={() => onPressItem(n)}
          accessibilityRole="button"
          accessibilityLabel={`${n.read_at ? '' : 'Okunmamış. '}${n.title}. ${n.body}`}
          style={[styles.row, { borderBottomColor: theme.border, backgroundColor: n.read_at ? 'transparent' : Brand.accent + '0F' }]}
        >
          <View style={[styles.dot, { backgroundColor: n.read_at ? 'transparent' : Brand.accent }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText style={{ fontWeight: n.read_at ? '600' : '800', fontSize: 14 }}>{n.title}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{n.body}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>{timeAgo(n.created_at)}</ThemedText>
          </View>
        </TouchableOpacity>
        </Stagger>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, padding: Spacing.four, borderBottomWidth: 1, borderRadius: Radius.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
