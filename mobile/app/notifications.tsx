import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationList } from '@/components/notification-list';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SubPage } from '@/components/ui/sub-page';
import { Brand, Spacing } from '@/constants/theme';
import { useNotifications, type AppNotification } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { items, unread, loading, markRead, markAllRead } = useNotifications();

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead(n.id);
    if (n.product_id) router.push(`/product/${n.product_id}`);
    else router.push('/(tabs)/offers');
  };

  return (
    <SubPage title="Bildirimlerim" gap={Spacing.four}>
      {unread > 0 && (
        <TouchableOpacity onPress={markAllRead} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
          <ThemedText style={{ color: Brand.accent, fontWeight: '700' }}>Tümünü okundu işaretle ({unread})</ThemedText>
        </TouchableOpacity>
      )}
      {loading ? (
        <ActivityIndicator size="large" color={Brand.accent} style={{ marginTop: Spacing.six }} />
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', padding: Spacing.eight, gap: Spacing.three }}>
          <IconSymbol name="bell.fill" size={48} color={theme.textSecondary} />
          <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>Henüz bir bildirimin yok. Takas teklifleri geldiğinde burada göreceksin.</ThemedText>
        </View>
      ) : (
        <NotificationList items={items} onPressItem={open} />
      )}
    </SubPage>
  );
}
