// ============================================================================
// Mizan (ميزان) - Mobile Design Tokens (Light & Dark Adaptive System)
// Modern Identity: UAE Desert Orange, Obsidian/Charcoal, Warm Pearl & Emerald
// Backward compatible with legacy `colors` and `shadows` accessors
// ============================================================================

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  brand: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryMuted: string;
    secondary: string;
    darkHero: string;
    darkHeroElevated: string;
    darkHeroBorder: string;
    glow: string;

    // Backward-compatibility aliases for existing components
    burgundy: string;
    burgundyDark: string;
    burgundyLight: string;
    cyan: string;
    cyanMuted: string;
    blush: string;
    blushSoft: string;
    blushAlt: string;
  };
  semantic: {
    success: string;
    successDark: string;
    successBg: string;
    successBorder: string;
    successText: string;
    warning: string;
    warningDark: string;
    warningBg: string;
    warningBorder: string;
    warningText: string;
    risk: string;
    riskDark: string;
    riskBg: string;
    riskBorder: string;
    riskText: string;
    info: string;
    infoDark: string;
    infoBg: string;
    infoBorder: string;
    infoText: string;
  };
  neutral: {
    canvas: string;
    surface: string;
    surfaceRaised: string;
    surfaceSubdued: string;
    surfaceInset: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    skeletonBase: string;
    scrim: string;
    white: string;
    black: string;
    onPrimary: string;
  };
  scanner: {
    laserBeam: string;
    reticleBorder: string;
    overlayDark: string;
  };
}

// Light Mode Palette — Warm Pearl canvas paired with Pure White cards & Charcoal Hero
export const lightColors: ThemeColors = {
  brand: {
    primary: '#F95700',        // Signature Vibrant Desert Orange
    primaryDark: '#D64600',    // Pressed/Hover state
    primaryLight: '#FF7733',   // Light accent
    primaryMuted: '#FFF3ED',   // Soft peach background container
    secondary: '#FF8844',
    darkHero: '#18191B',       // Charcoal/Obsidian dark card background
    darkHeroElevated: '#242528',
    darkHeroBorder: '#2C2E33',
    glow: 'rgba(249, 87, 0, 0.35)',

    // Backward-compatibility aliases for existing components
    burgundy: '#F95700',
    burgundyDark: '#D64600',
    burgundyLight: '#FF7733',
    cyan: '#F95700',
    cyanMuted: '#10B981',
    blush: '#FFF3ED',
    blushSoft: '#FAF9F7',
    blushAlt: '#FED7AA',
  },
  semantic: {
    success: '#10B981',        // Emerald Compliant green
    successDark: '#059669',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    successText: '#047857',
    warning: '#F59E0B',        // Amber alert
    warningDark: '#D97706',
    warningBg: '#FEF3C7',
    warningBorder: '#FDE68A',
    warningText: '#B45309',
    risk: '#EF4444',           // Coral Red risk
    riskDark: '#DC2626',
    riskBg: '#FEF2F2',
    riskBorder: '#FECACA',
    riskText: '#B91C1C',
    info: '#3B82F6',           // Blue info
    infoDark: '#2563EB',
    infoBg: '#EFF6FF',
    infoBorder: '#BFDBFE',
    infoText: '#1D4ED8',
  },
  neutral: {
    canvas: '#F7F6F4',         // Warm Pearl / Clean off-white background
    surface: '#FFFFFF',        // Pure white card container
    surfaceRaised: '#FFFFFF',
    surfaceSubdued: '#FAF9F7',
    surfaceInset: '#F3F1ED',
    border: '#EAE6E1',         // Subtle warm divider/border
    borderStrong: '#D7D2CB',
    textPrimary: '#141416',    // High contrast black
    textSecondary: '#666562',  // Muted grey metadata
    textTertiary: '#9E9C98',   // Placeholder/Inactive grey
    skeletonBase: '#EAE6E1',
    scrim: 'rgba(15, 23, 42, 0.58)',
    white: '#FFFFFF',
    black: '#000000',
    onPrimary: '#FFFFFF',
  },
  scanner: {
    laserBeam: '#F95700',
    reticleBorder: '#F95700',
    overlayDark: 'rgba(18, 18, 20, 0.70)',
  },
};

// Dark Mode Palette — Deep Obsidian canvas, Slate-Charcoal elevated surfaces & legible semantic tints
export const darkColors: ThemeColors = {
  brand: {
    primary: '#FF6A1A',        // Slightly lifted Desert Orange for AA contrast on dark surfaces
    primaryDark: '#E04D00',
    primaryLight: '#FF8A47',
    primaryMuted: 'rgba(249, 87, 0, 0.16)', // Translucent warm orange pill container
    secondary: '#FF9457',
    darkHero: '#181B22',       // Elevated Obsidian Hero card distinct from #0D0E12 canvas
    darkHeroElevated: '#232732',
    darkHeroBorder: '#2F3442',
    glow: 'rgba(255, 106, 26, 0.40)',

    // Backward-compatibility aliases mapped cleanly to dark-safe values
    burgundy: '#FF6A1A',
    burgundyDark: '#E04D00',
    burgundyLight: '#FF8A47',
    cyan: '#FF6A1A',
    cyanMuted: '#34D399',
    blush: 'rgba(249, 87, 0, 0.16)',
    blushSoft: 'rgba(249, 87, 0, 0.10)',
    blushAlt: 'rgba(249, 87, 0, 0.34)',
  },
  semantic: {
    success: '#34D399',        // Bright Emerald for dark surface readability
    successDark: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.14)',
    successBorder: 'rgba(52, 211, 153, 0.32)',
    successText: '#6EE7B7',
    warning: '#FBBF24',        // Luminous Amber
    warningDark: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningBorder: 'rgba(251, 191, 36, 0.32)',
    warningText: '#FCD34D',
    risk: '#F87171',           // High-contrast Coral Red
    riskDark: '#EF4444',
    riskBg: 'rgba(239, 68, 68, 0.15)',
    riskBorder: 'rgba(248, 113, 113, 0.32)',
    riskText: '#FCA5A5',
    info: '#60A5FA',           // Bright Blue info
    infoDark: '#3B82F6',
    infoBg: 'rgba(59, 130, 246, 0.15)',
    infoBorder: 'rgba(96, 165, 250, 0.32)',
    infoText: '#93C5FD',
  },
  neutral: {
    canvas: '#0D0E12',         // Deep Obsidian app background
    surface: '#16181E',        // Primary card container
    surfaceRaised: '#1E2129',  // Elevated modal / nested panel surface
    surfaceSubdued: '#12141A', // Inset / secondary card surface
    surfaceInset: '#1E212A',   // Input / pill resting background
    border: '#262933',         // Crisp hairline divider on dark surfaces
    borderStrong: '#383D4C',   // Focused / active border
    textPrimary: '#F3F4F6',    // Crisp off-white primary copy (avoids halation)
    textSecondary: '#A1A6B3',  // Balanced slate grey metadata
    textTertiary: '#6F7585',   // Muted placeholder / inactive label
    skeletonBase: '#252833',   // Subtle shimmer placeholder on dark surface
    scrim: 'rgba(0, 0, 0, 0.74)',
    white: '#FFFFFF',
    black: '#000000',
    onPrimary: '#FFFFFF',
  },
  scanner: {
    laserBeam: '#FF6A1A',
    reticleBorder: '#FF6A1A',
    overlayDark: 'rgba(10, 11, 14, 0.76)',
  },
};

/**
 * Resolves the active ThemeColors palette for the given resolved color scheme.
 */
export const getThemeColors = (theme: ResolvedTheme): ThemeColors =>
  theme === 'dark' ? darkColors : lightColors;

// Default static export preserved for backward compatibility with unmigrated modules
export const colors: ThemeColors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
} as const;

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 9999,
  full: 9999,
} as const;

// ============================================================================
// Modernist Neo-Khaleeji Font Family Names (Google Fonts Pairing 2)
// English Display: Outfit | English Body/UI: DM Sans | Arabic: Cairo | Monospace: DM Mono
// ============================================================================
export const fontNames = {
  // Headings & High-Impact Display (English)
  outfitMedium: 'Outfit-Medium',
  outfitSemiBold: 'Outfit-SemiBold',
  outfitBold: 'Outfit-Bold',

  // Body Text, Form Labels & Standard UI (English)
  dmSansRegular: 'DMSans-Regular',
  dmSansMedium: 'DMSans-Medium',
  dmSansSemiBold: 'DMSans-SemiBold',
  dmSansBold: 'DMSans-Bold',

  // Unified Arabic Typography (Headings, Body & UI)
  cairoRegular: 'Cairo-Regular',
  cairoMedium: 'Cairo-Medium',
  cairoSemiBold: 'Cairo-SemiBold',
  cairoBold: 'Cairo-Bold',

  // Monospace Tax TRN & Authoritative Financial Numerals
  dmMonoRegular: 'DMMono-Regular',
  dmMonoMedium: 'DMMono-Medium',
} as const;

export const typography = {
  fontNames,
  fontFamily: {
    en: {
      regular: fontNames.dmSansRegular,
      medium: fontNames.dmSansMedium,
      semiBold: fontNames.dmSansSemiBold,
      bold: fontNames.dmSansBold,
    },
    display: {
      medium: fontNames.outfitMedium,
      semiBold: fontNames.outfitSemiBold,
      bold: fontNames.outfitBold,
    },
    ar: {
      regular: fontNames.cairoRegular,
      medium: fontNames.cairoMedium,
      semiBold: fontNames.cairoSemiBold,
      bold: fontNames.cairoBold,
    },
    mono: {
      regular: fontNames.dmMonoRegular,
      medium: fontNames.dmMonoMedium,
    },
  },
  fontSize: {
    caption: 11,
    bodySm: 12,
    body: 14,
    bodyLg: 16,
    subheading: 18,
    heading: 22,
    display: 28,
    hero: 34,
  },
} as const;

// ============================================================================
// Pre-Composed Typography Styles (Modernist Neo-Khaleeji)
// CRITICAL ANDROID ENGINE FIX:
// When custom fonts are defined by specific TrueType cut names (e.g. 'Outfit-Bold'),
// passing a numeric `fontWeight: '700'` or `'800'` causes Android's Skia engine
// to search for a bold variant of 'Outfit-Bold', fail to resolve it, and silently
// fall back to the default system font (Roboto).
// These pre-composed styles omit `fontWeight` so Android renders the exact TrueType cut.
// They also enforce `includeFontPadding: false` to avert Cairo/Outfit baseline clipping.
// ============================================================================
export const fontStyles = {
  // English Display Headings (Outfit)
  displayBold: {
    fontFamily: fontNames.outfitBold,
    includeFontPadding: false,
  },
  displaySemiBold: {
    fontFamily: fontNames.outfitSemiBold,
    includeFontPadding: false,
  },
  displayMedium: {
    fontFamily: fontNames.outfitMedium,
    includeFontPadding: false,
  },

  // English UI & Body Text (DM Sans)
  bodyBold: {
    fontFamily: fontNames.dmSansBold,
    includeFontPadding: false,
  },
  bodySemiBold: {
    fontFamily: fontNames.dmSansSemiBold,
    includeFontPadding: false,
  },
  bodyMedium: {
    fontFamily: fontNames.dmSansMedium,
    includeFontPadding: false,
  },
  bodyRegular: {
    fontFamily: fontNames.dmSansRegular,
    includeFontPadding: false,
  },

  // Unified Arabic Typography (Cairo)
  arabicBold: {
    fontFamily: fontNames.cairoBold,
    includeFontPadding: false,
  },
  arabicSemiBold: {
    fontFamily: fontNames.cairoSemiBold,
    includeFontPadding: false,
  },
  arabicMedium: {
    fontFamily: fontNames.cairoMedium,
    includeFontPadding: false,
  },
  arabicRegular: {
    fontFamily: fontNames.cairoRegular,
    includeFontPadding: false,
  },

  // Monospace Financial Figures & Tax TRN (DM Mono)
  monoMedium: {
    fontFamily: fontNames.dmMonoMedium,
    includeFontPadding: false,
  },
  monoRegular: {
    fontFamily: fontNames.dmMonoRegular,
    includeFontPadding: false,
  },
} as const;

/**
 * Universal Typography Resolver for Mizan UAE Tax Intelligence.
 * Resolves font family based on language direction (Arabic Cairo vs English Outfit/DM Sans),
 * heading vs body context, and suppresses Android vertical clipping via includeFontPadding: false.
 */
export const getFont = (
  weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular',
  isRTL: boolean = false,
  isDisplay: boolean = false
): { fontFamily: string; includeFontPadding: boolean } => {
  if (isRTL) {
    return {
      fontFamily: typography.fontFamily.ar[weight] || typography.fontFamily.ar.regular,
      includeFontPadding: false,
    };
  }

  if (isDisplay) {
    if (weight === 'bold') {
      return { fontFamily: typography.fontFamily.display.bold, includeFontPadding: false };
    }
    if (weight === 'semiBold') {
      return { fontFamily: typography.fontFamily.display.semiBold, includeFontPadding: false };
    }
    return { fontFamily: typography.fontFamily.display.medium, includeFontPadding: false };
  }

  return {
    fontFamily: typography.fontFamily.en[weight] || typography.fontFamily.en.regular,
    includeFontPadding: false,
  };
};

/**
 * Monospace typography resolver for financial amounts, tax TRN numbers, and tabular calculations.
 */
export const getMonoFont = (
  weight: 'regular' | 'medium' = 'medium'
): { fontFamily: string; includeFontPadding: boolean } => ({
  fontFamily: typography.fontFamily.mono[weight] || typography.fontFamily.mono.regular,
  includeFontPadding: false,
});

export const lightShadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCard: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 7,
  },
  pillButton: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  orangeGlow: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 5,
  },
  cyanGlow: {
    shadowColor: '#F95700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

// Dark mode reduces diffuse drop shadows (which disappear on dark canvases)
// and emphasizes brand glow shadows where elevated contrast is needed.
export const darkShadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 5,
  },
  heroCard: {
    shadowColor: '#FF6A1A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  pillButton: {
    shadowColor: '#FF6A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 4,
  },
  orangeGlow: {
    shadowColor: '#FF6A1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 5,
  },
  cyanGlow: {
    shadowColor: '#FF6A1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 5,
  },
} as const;

export type ThemeShadows = typeof lightShadows | typeof darkShadows;

export const getThemeShadows = (theme: ResolvedTheme): ThemeShadows =>
  theme === 'dark' ? darkShadows : lightShadows;

export const shadows = lightShadows;
