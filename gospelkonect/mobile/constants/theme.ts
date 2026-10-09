/**
 * Serene Fellowship design tokens — single source of truth.
 * Ported 1:1 from Flutter `lib/theme/app_colors.dart` + `app_theme.dart` + DESIGN.md.
 * All screens/components must import from here. No hardcoded hex outside this file.
 */

export const TokenColors = {
  surface: '#F9F9FF',
  surfaceDim: '#CFDAF2',
  surfaceBright: '#F9F9FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F3FF',
  surfaceContainer: '#E7EEFF',
  surfaceContainerHigh: '#DEE8FF',
  surfaceContainerHighest: '#D8E3FB',
  onSurface: '#111C2D',
  onSurfaceVariant: '#444651',
  inverseSurface: '#263143',
  onInverseSurface: '#ECF1FF',
  outline: '#757682',
  outlineVariant: '#C5C5D3',
  surfaceTint: '#4059AA',

  primary: '#00236F',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1E3A8A',
  onPrimaryContainer: '#90A8FF',
  inversePrimary: '#B6C4FF',

  secondary: '#904D00',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#FE932C',
  onSecondaryContainer: '#663500',

  tertiary: '#193000',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#294800',
  onTertiaryContainer: '#87BB4B',

  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  primaryFixed: '#DCE1FF',
  primaryFixedDim: '#B6C4FF',
  onPrimaryFixed: '#00164E',
  onPrimaryFixedVariant: '#264191',
  secondaryFixed: '#FFDCC3',
  secondaryFixedDim: '#FFB77D',
  onSecondaryFixed: '#2F1500',
  onSecondaryFixedVariant: '#6E3900',
  tertiaryFixed: '#BBF37C',
  tertiaryFixedDim: '#A0D663',
  onTertiaryFixed: '#0F2000',
  onTertiaryFixedVariant: '#2E4F00',
} as const;

export const AppColors = {
  royalCerulean: '#1E3A8A',
  sunGold: '#D97706',
  sereneOlive: '#4D7C0F',
  reactionRose: '#E11D48',
  neutralDark: '#1E293B',
  neutralMuted: '#64748B',
  placeholder: '#94A3B8',
  borderSubtle: '#E2E8F0',
  controlBorder: '#CBD5E1',
  surfaceAlabaster: '#F8FAFC',
  surfacePureWhite: '#FFFFFF',
  surfaceSunkenStone: '#F1F5F9',
  prayerBadgeSurface: '#ECFDF5',
  prayerBadgeBorder: '#D1FAE5',
  prayerBadgeText: '#047857',
} as const;

export const Radii = {
  sm: 4,
  md: 8,
  input: 12,
  card: 16,
  hero: 28,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Fonts = {
  display: 'PlusJakartaSans',
  body: 'Inter',
} as const;

export const TypeScale = {
  displayLg: { fontSize: 34, lineHeight: 42, weight: '700' as const },
  headlineLg: { fontSize: 26, lineHeight: 34, weight: '700' as const },
  headlineMd: { fontSize: 20, lineHeight: 28, weight: '600' as const },
  headlineSm: { fontSize: 17, lineHeight: 24, weight: '600' as const },
  bodyLg: { fontSize: 17, lineHeight: 28, weight: '400' as const },
  bodyMd: { fontSize: 15, lineHeight: 24, weight: '400' as const },
  bodySm: { fontSize: 13, lineHeight: 18, weight: '400' as const },
  labelLg: { fontSize: 15, lineHeight: 20, weight: '600' as const },
  labelMd: { fontSize: 13, lineHeight: 16, weight: '600' as const },
  labelSm: { fontSize: 11, lineHeight: 14, weight: '600' as const },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  sheet: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 4,
  },
  warmAction: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

export const LogoAsset = require('../assets/images/GospelKonect_G_logo_transparent.png');
