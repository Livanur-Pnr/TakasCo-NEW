/**
 * Ultimate Scout Design System
 * Clean, minimal aesthetic with strategic accent colors.
 *
 * Usage: Copy this folder into your project and adjust imports.
 * - React Native/Expo: use as-is
 * - Web (React): replace Platform.select with web equivalents
 */

// ── Brand Colors ──
export const Brand = {
  primary: '#111827',       // near-black — primary buttons, text
  primaryDark: '#0d1016',   // tab bar, deepest dark
  accent: '#1B7A43',        // TakasCo yeşili — success, active, CTA
  accentLight: '#d1fae5',   // light green background
  wordmark: '#14532D',      // "TakasCo" logo yazısı için koyu yeşil
  danger: '#ef4444',        // red — errors, risk
  warning: '#f59e0b',       // amber — pending, warning
  info: '#3b82f6',          // blue — info, links
  purple: '#9C27B0',        // accent for special cards
  orange: '#FF9800',        // secondary accent
  success: '#10b981',       // added for status badges
} as const;

export const Colors = {
  light: {
    text: '#111827',
    background: '#f7fcffff',
    backgroundElement: '#f7fcffff',
    backgroundSelected: '#d7f0e2ff',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    inputBg: '#ffffff',
    cardBg: '#ffffff',
  },
} as const;



// ── Fonts ──
// Adjust per platform/framework as needed
export const Fonts = {
  sans: 'system-ui',
  serif: 'ui-serif',
  rounded: 'ui-rounded',
  mono: 'ui-monospace',
};

// ── Spacing (4, 8, 12, 16, 20, 24, 32, 64) ──
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 64,
} as const;

// ── Border Radius ──
export const Radius = {
  sm: 8,      // inputs, buttons
  md: 12,     // search, filter
  lg: 16,     // cards, list items
  xl: 20,     // plan cards
  full: 40,   // pill, tab bar
  modal: 24,  // modal top corners
} as const;


