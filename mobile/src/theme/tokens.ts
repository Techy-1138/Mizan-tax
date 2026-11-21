// ============================================================================
// Mizan (ميزان) - Pure Monochrome Design Tokens (Light & Dark Adaptive System)
// Aesthetic: Clean Institutional FinTech — Black, White & Neutral Grays only.
// Zero third/accent color; hierarchy is driven by contrast, 1px borders,
// and crisp EN (Outfit / DM Sans), AR (Cairo), and tabular (DM Mono) type.
// ============================================================================

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Monochrome color contract for Light and Dark themes.
 * Strictly achromatic (black, white, and calibrated zinc/neutral grays).
 */
export interface ThemeColors {
  brand: {
    /** Primary interactive fill (Solid Black in Light, Crisp White in Dark) */
    primary: string;
    /** Pressed state for primary interactive fill */
    primaryPressed: string;
    /** Subtle tinted surface for secondary pills/chips */
    primarySubtle: string;
    /** Inverted hero/emphasis card background */
    hero: string;
    /** Elevated surface inside an inverted hero card */
    heroElevated: string;
    /** Hairline border inside an inverted hero card */
    heroBorder: string;
  };
  status: {
    /** High-priority / active / compliant solid badge fill */
    solidBg: string;
    solidText: string;
    /** Outlined / pending / attention badge */
    outlineBg: string;
    outlineBorder: string;
    outlineText: string;
    /** Muted / neutral / archived badge */
    mutedBg: string;
    mutedText: string;
  };
  neutral: {
    /** Root screen background */
    canvas: string;
    /** Primary card & sheet surface */
    surface: string;
    /** Elevated surface (modals, popovers) */
    surfaceRaised: string;
    /** Nested container / input background */
    surfaceSubtle: string;
    /** 1px hairline border for cards & dividers */
    border: string;
    /** Strong border for focused inputs & active selections */
    borderStrong: string;
    /** Primary headings & key financial figures */
    textPrimary: string;
    /** Secondary labels & supporting copy */
    textSecondary: string;
    /** Captions, placeholders, and disabled labels */
    textMuted: string;
    /** Text/icons rendered on top of `brand.primary` or `brand.hero` */
    textInverted: string;
    /** Skeleton loading block base */
    skeletonBase: string;
    /** Modal backdrop scrim */
    scrim: string;
    /** Pure constants */
    white: string;
    black: string;
  };
}

/**
 * Light Mode Palette — Crisp Alabaster canvas (#FAFAFA), Pure White cards (#FFFFFF),
 * 1px Zinc hairline borders (#E4E4E7), and Deep Ink (#09090B) primary actions.
 */
export const lightColors: ThemeColors = {
  brand: {
    primary: '#09090B',
    primaryPressed: '#27272A',
    primarySubtle: '#F4F4F5',
    hero: '#09090B',
    heroElevated: '#18181B',
    heroBorder: '#27272A',
  },
  status: {
    solidBg: '#09090B',
    solidText: '#FFFFFF',
    outlineBg: '#FFFFFF',
    outlineBorder: '#09090B',
    outlineText: '#09090B',
    mutedBg: '#F4F4F5',
    mutedText: '#52525B',
  },
  neutral: {
    canvas: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceSubtle: '#F4F4F5',
    border: '#E4E4E7',
    borderStrong: '#09090B',
    textPrimary: '#09090B',
    textSecondary: '#52525B',
    textMuted: '#71717A',
    textInverted: '#FFFFFF',
    skeletonBase: '#E4E4E7',
    scrim: 'rgba(9, 9, 11, 0.52)',
    white: '#FFFFFF',
    black: '#000000',
  },
};

/**
 * Dark Mode Palette — Deep Obsidian canvas (#09090B), Elevated Charcoal cards (#111113),
 * 1px Dark Zinc borders (#27272A), and Crisp White (#FAFAFA) primary actions.
 */
export const darkColors: ThemeColors = {
  brand: {
    primary: '#FAFAFA',
    primaryPressed: '#D4D4D8',
    primarySubtle: '#18181B',
    hero: '#18181B',
    heroElevated: '#27272A',
    heroBorder: '#3F3F46',
  },
  status: {
    solidBg: '#FAFAFA',
    solidText: '#09090B',
    outlineBg: '#111113',
    outlineBorder: '#FAFAFA',
    outlineText: '#FAFAFA',
    mutedBg: '#18181B',
    mutedText: '#A1A1AA',
  },
  neutral: {
    canvas: '#09090B',
    surface: '#111113',
    surfaceRaised: '#18181B',
    surfaceSubtle: '#18181B',
    border: '#27272A',
    borderStrong: '#FAFAFA',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textInverted: '#09090B',
    skeletonBase: '#27272A',
    scrim: 'rgba(0, 0, 0, 0.72)',
    white: '#FFFFFF',
    black: '#000000',
  },
};

/** 4px base grid spacing scale */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

/** Clean Institutional FinTech border radii (12–16px primary containers) */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
} as const;

/** Crisp 1px hairline border tokens */
export const borders = {
  hairline: 1,
  strong: 1.5,
} as const;

/** Exact font asset keys loaded in app/_layout.tsx via expo-font */
export const fontNames = {
  outfitBold: 'Outfit-Bold',
  outfitSemiBold: 'Outfit-SemiBold',
  outfitMedium: 'Outfit-Medium',
  dmSansBold: 'DMSans-Bold',
  dmSansSemiBold: 'DMSans-SemiBold',
  dmSansMedium: 'DMSans-Medium',
  dmSansRegular: 'DMSans-Regular',
  cairoBold: 'Cairo-Bold',
  cairoSemiBold: 'Cairo-SemiBold',
  cairoMedium: 'Cairo-Medium',
  cairoRegular: 'Cairo-Regular',
  dmMonoMedium: 'DMMono-Medium',
  dmMonoRegular: 'DMMono-Regular',
} as const;

export const typography = {
  fontFamily: {
    display: {
      medium: fontNames.outfitMedium,
      semiBold: fontNames.outfitSemiBold,
      bold: fontNames.outfitBold,
    },
    en: {
      regular: fontNames.dmSansRegular,
      medium: fontNames.dmSansMedium,
      semiBold: fontNames.dmSansSemiBold,
      bold: fontNames.dmSansBold,
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
} as const;

/**
 * Ratio-driven typographic hierarchy:
 * - UI Scale: 1.25x modular steps from 12px caption / 15px body base (12 -> 15 -> 19 -> 23 -> 29)
 * - Hero Display: 1.618x Golden Ratio jump (36px) for primary AED & readiness focal points
 */
export const typeScale = {
  display: { fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  h1: { fontSize: 29, lineHeight: 35, letterSpacing: -0.5 },
  h2: { fontSize: 23, lineHeight: 29, letterSpacing: -0.3 },
  h3: { fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySmall: { fontSize: 13, lineHeight: 19, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  mono: { fontSize: 15, lineHeight: 21, letterSpacing: 0.2 },
} as const;

/**
 * Resolves font family for English (Outfit/DM Sans) vs Arabic RTL (Cairo).
 * Disables Android extra vertical font padding for crisp baseline alignment.
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
 * Monospace typography resolver for AED amounts, percentages, and 15-digit TRNs.
 */
export const getMonoFont = (
  weight: 'regular' | 'medium' = 'medium'
): { fontFamily: string; includeFontPadding: boolean } => ({
  fontFamily: typography.fontFamily.mono[weight] || typography.fontFamily.mono.regular,
  includeFontPadding: false,
});

/** Subtle institutional elevation tokens for Light Mode (paired with 1px borders) */
export const lightShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

/** Dark mode relies primarily on 1px borders + surface step-ups */
export const darkShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export type ThemeShadows = typeof lightShadows | typeof darkShadows;

export const getThemeColors = (resolved: ResolvedTheme): ThemeColors =>
  resolved === 'dark' ? darkColors : lightColors;

export const getThemeShadows = (resolved: ResolvedTheme): ThemeShadows =>
  resolved === 'dark' ? darkShadows : lightShadows;
