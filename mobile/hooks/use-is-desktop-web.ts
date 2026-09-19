import { Platform, useWindowDimensions } from 'react-native';

const DESKTOP_BREAKPOINT = 900;

// Telefon/Expo Go'daki gercek mobil deneyimi hic degistirmeden,
// sadece genis web tarayicisinda Dolap tarzi masaustu duzene gecmek icin kullanilir.
export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}
