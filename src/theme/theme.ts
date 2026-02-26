// ─────────────────────────────────────────────
//  LevelUp English — Design System
//  Derived from UI screenshots (Dolingo style)
// ─────────────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#5C5CE0',
  primaryDark: '#4040C0',
  primaryLight: '#7B7BEA',
  primarySurface: '#EEEEFF',

  // Accent
  secondary: '#FF8B3E',
  secondaryLight: '#FFF0E6',

  // Semantic
  success: '#4CD97B',
  successLight: '#E6FFF0',
  danger: '#FF4757',
  dangerLight: '#FFE6E8',
  warning: '#FFD93D',
  warningLight: '#FFF9E0',
  info: '#3FA1F5',
  infoLight: '#E6F4FF',

  // Neutrals
  background: '#F4F4FF',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFF',
  border: '#E8E8F0',
  divider: '#F0F0F8',

  // Text
  text: '#1C1C35',
  textSecondary: '#4A4A68',
  muted: '#8E8EA3',
  placeholder: '#B0B0C8',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarActive: '#5C5CE0',
  tabBarInactive: '#B0B0C8',

  // Level colours (1-6)
  level1: '#A0C4FF', // Starter
  level2: '#4CD97B', // Builder
  level3: '#FFD93D', // Debugger
  level4: '#FF8B3E', // Architect
  level5: '#5C5CE0', // Senior
  level6: '#FF4757', // Principal

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(28,28,53,0.5)',
  transparent: 'transparent',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  giant: 64,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 32,
  full: 999,
} as const;

export const Typography = {
  H1: { fontSize: 28, fontWeight: '800' as const, lineHeight: 36 },
  H2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  H3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  H4: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  captionBold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 18 },
  micro: { fontSize: 10, fontWeight: '500' as const, lineHeight: 14 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 20 },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    shadowColor: '#5C5CE0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const Theme = {
  colors: Colors,
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
  shadows: Shadows,
} as const;

export type ThemeColors = typeof Colors;
export type ThemeSpacing = typeof Spacing;

export default Theme;
