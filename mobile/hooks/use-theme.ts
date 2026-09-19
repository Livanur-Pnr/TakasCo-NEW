/**
 * Theme hook — returns the active color palette based on color scheme.
 *
 * React Native/Expo: works as-is
 * Web (React): replace useColorScheme with your preferred method
 *   e.g. window.matchMedia('(prefers-color-scheme: dark)').matches
 */

import { Colors } from '../constants/theme';

// For React Native, import from 'react-native':
// import { useColorScheme } from 'react-native';

// For web, you can use this simple hook:
import { useColorScheme } from './use-color-scheme';

export function useTheme() {
  return Colors.light;
}
