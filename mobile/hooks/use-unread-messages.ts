import { usePolling } from '@/hooks/use-polling';
import { useCallback, useState } from 'react';
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

  usePolling(refresh, POLL_INTERVAL_MS, enabled);

  return { unread, refresh };
}
