import { usePolling } from '@/hooks/use-polling';
import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from '@/utils/storage';
import { useRealtimeEvent } from '@/utils/realtime';
import { api } from '@/utils/api';

const POLL_INTERVAL_MS = 20000;

// Okunmamış mesaj sayısı (header rozeti); giriş yoksa (`enabled` false) hiç istek atmaz
export function useUnreadMessages(enabled: boolean) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/conversations/unread-count');
      setUnread(res.data.unread_total ?? 0);
    } catch {
      // ağ/oturum hataları interceptor'da ele alınır; rozet sessizce eski değerinde kalır
    }
  }, []);

  const [userId, setUserId] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    SecureStore.getItemAsync('user').then((raw) => {
      try { setUserId(raw ? JSON.parse(raw).id : null); } catch { setUserId(null); }
    });
  }, [enabled]);

  const realtime = useRealtimeEvent(enabled && userId ? `App.Models.User.${userId}` : null, '.message.sent', () => { refresh(); });
  usePolling(refresh, realtime ? 90000 : POLL_INTERVAL_MS, enabled);

  return { unread, refresh };
}
