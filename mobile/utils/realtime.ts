import { useEffect, useRef, useState } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import * as SecureStore from '@/utils/storage';
import { API_BASE_URL } from '@/utils/api';

// Gerçek zamanlı (Laravel Reverb / WebSocket) bağlantısı. EXPO_PUBLIC_REVERB_KEY tanımlı değilse tamamen devre dışıdır
// ve uygulama yalnızca polling ile çalışmaya devam eder. Özel kanallar Bearer token ile yetkilendirilir.
const KEY = process.env.EXPO_PUBLIC_REVERB_KEY;
export const REALTIME_ENABLED = !!KEY;

let echo: any = null;
let echoToken: string | null = null;

export async function getEcho(): Promise<any | null> {
  if (!REALTIME_ENABLED) return null;
  const token = await SecureStore.getItemAsync('auth_token');
  if (!token) return null;
  if (echo && echoToken === token) return echo;

  echo?.disconnect();
  (globalThis as any).Pusher = Pusher;
  const host = process.env.EXPO_PUBLIC_REVERB_HOST || new URL(API_BASE_URL).hostname;
  const port = Number(process.env.EXPO_PUBLIC_REVERB_PORT || 8080);
  const tls = (process.env.EXPO_PUBLIC_REVERB_SCHEME || 'http') === 'https';

  echo = new Echo({
    broadcaster: 'reverb',
    key: KEY,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: tls,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL}/api/broadcasting/auth`,
    auth: { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
  });
  echoToken = token;

  return echo;
}

// Çıkış yapıldığında bağlantıyı kapatır (bir sonraki kullanıcı kendi token'ıyla yeniden bağlanır)
export function disconnectRealtime() {
  echo?.disconnect();
  echo = null;
  echoToken = null;
}

// Özel bir kanaldaki olayı dinler. Kanala abone olunduğunda `true` döner; o zamana kadar (ya da Reverb kapalıysa) `false`,
// çağıran taraf bu durumda polling'i sık tutar. Bileşen kapanınca yalnızca kendi dinleyicisini kaldırır.
export function useRealtimeEvent(channel: string | null, event: string, handler: () => void): boolean {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channel || !REALTIME_ENABLED) {
      setConnected(false);
      return;
    }
    let cancelled = false;
    let subscribed: any = null;
    const listener = () => handlerRef.current();

    getEcho()
      .then((instance) => {
        if (!instance || cancelled) return;
        subscribed = instance.private(channel);
        subscribed.subscribed(() => !cancelled && setConnected(true));
        subscribed.error(() => !cancelled && setConnected(false));
        subscribed.listen(event, listener);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      setConnected(false);
      subscribed?.stopListening(event, listener);
    };
  }, [channel, event]);

  return connected;
}
