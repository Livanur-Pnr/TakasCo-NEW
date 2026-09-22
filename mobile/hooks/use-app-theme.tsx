import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';
import * as SecureStore from '@/utils/storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'theme_preference';

// Uygulama genelinde tema tercihi: kaydedilmiş seçim yoksa cihazın/tarayıcının ayarını izler ("Sistem").
// Ayarlar ekranındaki seçici bunu değiştirir; +html.tsx'teki satır içi betik ilk boyamada aynı anahtarı okuyup
// yanıp sönmeyi (flash) önler (bkz. utils/storage.ts: web'de aynı anahtar localStorage'a yazılır).
interface AppThemeContextValue {
  preference: ThemePreference;
  scheme: ColorScheme;
  setPreference: (p: ThemePreference) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreferenceState(v);
    });
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    if (p === 'system') SecureStore.deleteItemAsync(STORAGE_KEY);
    else SecureStore.setItemAsync(STORAGE_KEY, p);
  };

  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(() => ({ preference, scheme, setPreference }), [preference, scheme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) return { preference: 'system', scheme: 'light', setPreference: () => {} };
  return ctx;
}
