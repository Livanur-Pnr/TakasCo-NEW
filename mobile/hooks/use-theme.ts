/**
 * Theme hook — returns the active color palette based on the resolved color scheme
 * (system preference, or the user's manual override from Settings — bkz. use-app-theme.tsx).
 */

import { Colors } from '../constants/theme';
import { useAppTheme } from './use-app-theme';

export function useTheme() {
  const { scheme } = useAppTheme();
  return Colors[scheme];
}
