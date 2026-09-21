import { usePolling } from '@/hooks/use-polling';
import * as SecureStore from '@/utils/storage';
import { NOTIFICATION_EVENT, useRealtimeEvent } from '@/utils/realtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/utils/api';

export interface AppNotification {
  id: string;
  type: string | null;
  title: string;
  body: string;
  trade_id: number | null;
  product_id?: number | null;
  read_at: string | null;
  created_at: string;
}

const POLL_INTERVAL_MS = 30000;

// Bildirim listesi + okunmamış sayısı; `poll` true ise 30 sn'de bir yeniler
// (gerçek zamanlı WebSocket altyapısı yerine basit ve güvenilir polling).
export function useNotifications({ enabled = true, poll = false }: { enabled?: boolean; poll?: boolean } = {}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (!mounted.current) return;
      setItems(res.data.data);
      setUnread(res.data.unread_count);
    } catch {
      // giriş yapılmamışsa (401) ya da ağ hatasında sessizce geç; interceptor gerekli yönlendirmeyi yapar
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) setLoading(false);
    else if (!poll) refresh();
    return () => {
      mounted.current = false;
    };
  }, [enabled, poll, refresh]);

  // Reverb bağlıyken yeni bildirim olayı gelince anında yenilenir; polling seyrek bir güvence olarak kalır
  const [userId, setUserId] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !poll) return;
    SecureStore.getItemAsync('user').then((raw) => {
      try { setUserId(raw ? JSON.parse(raw).id : null); } catch { setUserId(null); }
    });
  }, [enabled, poll]);
  const realtime = useRealtimeEvent(enabled && poll && userId ? `App.Models.User.${userId}` : null, NOTIFICATION_EVENT, () => { refresh(); });
  usePolling(refresh, realtime ? 180000 : POLL_INTERVAL_MS, enabled && poll);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await api.post(`/notifications/${id}/read`); } catch { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    try { await api.post('/notifications/read-all'); } catch { refresh(); }
  }, [refresh]);

  return { items, unread, loading, refresh, markRead, markAllRead };
}
