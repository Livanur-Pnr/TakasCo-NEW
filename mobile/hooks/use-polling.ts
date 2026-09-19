import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// fn'i hemen ve her `ms` milisaniyede bir çalıştırır; uygulama/sekme arka plandayken durur,
// öne gelince bir kez hemen yeniler; restartKey değişince (ör. başka sohbet) hemen yeniden başlar (gereksiz istek ve pil tüketimini önler)
export function usePolling(fn: () => void | Promise<unknown>, ms: number, enabled = true, restartKey?: unknown) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const run = () => { void fnRef.current(); };
    const start = () => { if (!timer) timer = setInterval(run, ms); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    if (AppState.currentState === 'active') { run(); start(); }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { run(); start(); } else stop();
    });

    return () => { stop(); sub.remove(); };
  }, [ms, enabled, restartKey]);
}
