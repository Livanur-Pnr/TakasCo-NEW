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



// ── Gradients (web) ──
// Kimlik doğrulama ekranlarının arka plan/CTA gradyanları. Native'de kullanılmaz (düz renge düşülür).
export const Gradient = {
  authBackdrop: 'linear-gradient(160deg, #f7fcff 0%, #eef8f2 55%, #e2f3e9 100%)',
  brandPanel: 'linear-gradient(150deg, #0d3b20 0%, #14532D 45%, #1B7A43 100%)',
  brandGlow: 'radial-gradient(closest-side, rgba(110, 231, 183, 0.28), rgba(110, 231, 183, 0))',
  blobMint: 'radial-gradient(closest-side, rgba(110, 231, 183, 0.32), rgba(110, 231, 183, 0))',
  blobGreen: 'radial-gradient(closest-side, rgba(27, 122, 67, 0.14), rgba(27, 122, 67, 0))',
  cta: 'linear-gradient(180deg, #219052 0%, #1B7A43 100%)',
  ctaHover: 'linear-gradient(180deg, #27a460 0%, #1f8a4d 100%)',
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


