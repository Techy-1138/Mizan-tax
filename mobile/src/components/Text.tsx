// ============================================================================
// Mizan (ميزان) - Universal Modernist Neo-Khaleeji Typography Component
// English Display: Outfit | English Body/UI: DM Sans | Arabic: Cairo | Monospace: DM Mono
//
// CRITICAL ARCHITECTURAL FIX FOR REACT NATIVE ANDROID:
// On Android, React Native passes both `fontFamily` and `fontWeight` to the native
// Typeface factory (Typeface.create). When using custom font cuts named e.g. 'Outfit-Bold',
// passing a numeric `fontWeight: '700'` or `'800'` causes Android's Skia engine
// to search for a bold variation of 'Outfit-Bold', fail to resolve it, and silently
// fall back to system Roboto.
//
// This component automatically maps the desired weight and variant to the exact
// TrueType font asset and strips conflicting numeric `fontWeight` values.
// ============================================================================

import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  StyleProp,
  TextStyle,
} from 'react-native';
import { fontNames, fontStyles } from '../theme/tokens';
import { useLocale } from '../context/LocaleContext';

export type TextWeight = 'regular' | 'medium' | 'semiBold' | 'bold';
export type TextVariant = 'body' | 'display' | 'mono';

export interface AppTextProps extends RNTextProps {
  /**
   * Font weight tier matching TrueType font cuts.
   * Defaults to 'regular'.
   */
  weight?: TextWeight;

  /**
   * Typography variant:
   * - 'body': DM Sans (English) / Cairo (Arabic)
   * - 'display': Outfit (English Headings) / Cairo (Arabic)
   * - 'mono': DM Mono (Authoritative Financials & TRN)
   * Defaults to 'body'.
   */
  variant?: TextVariant;

  /**
   * Explicit RTL override if needed. Defaults to LocaleContext.isRTL.
   */
  isRTL?: boolean;
}

/**
 * Strips conflicting numeric `fontWeight` from incoming styles to avert Android font fallback.
 */
function cleanStyleForAndroid(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (!style) return style;

  if (Array.isArray(style)) {
    return style.map((s) => cleanStyleForAndroid(s));
  }

  if (typeof style === 'object') {
    const flattened = StyleSheet.flatten(style);
    if (flattened && flattened.fontWeight && flattened.fontFamily) {
      // If a specific custom font family cut is already declared, strip conflicting weight
      const { fontWeight: _ignored, ...cleaned } = flattened;
      return cleaned;
    }
  }

  return style;
}

export const AppText: React.FC<AppTextProps> = ({
  children,
  weight = 'regular',
  variant = 'body',
  isRTL: overrideRTL,
  style,
  ...restProps
}) => {
  let isRTL = false;
  try {
    const locale = useLocale();
    isRTL = overrideRTL !== undefined ? overrideRTL : locale.isRTL;
  } catch {
    // Fallback if rendered outside LocaleProvider (e.g. initial splash or tests)
    isRTL = overrideRTL || false;
  }

  // Resolve TrueType font family according to locale and variant
  let resolvedFontFamily: string = fontNames.dmSansRegular;

  if (variant === 'mono') {
    resolvedFontFamily =
      weight === 'medium' || weight === 'semiBold' || weight === 'bold'
        ? fontNames.dmMonoMedium
        : fontNames.dmMonoRegular;
  } else if (isRTL) {
    if (weight === 'bold') resolvedFontFamily = fontNames.cairoBold;
    else if (weight === 'semiBold') resolvedFontFamily = fontNames.cairoSemiBold;
    else if (weight === 'medium') resolvedFontFamily = fontNames.cairoMedium;
    else resolvedFontFamily = fontNames.cairoRegular;
  } else if (variant === 'display') {
    if (weight === 'bold') resolvedFontFamily = fontNames.outfitBold;
    else if (weight === 'semiBold') resolvedFontFamily = fontNames.outfitSemiBold;
    else resolvedFontFamily = fontNames.outfitMedium;
  } else {
    // English body/UI (DM Sans)
    if (weight === 'bold') resolvedFontFamily = fontNames.dmSansBold;
    else if (weight === 'semiBold') resolvedFontFamily = fontNames.dmSansSemiBold;
    else if (weight === 'medium') resolvedFontFamily = fontNames.dmSansMedium;
    else resolvedFontFamily = fontNames.dmSansRegular;
  }

  const baseTypographyStyle: TextStyle = {
    fontFamily: resolvedFontFamily,
    includeFontPadding: false,
  };

  const sanitizedStyle = cleanStyleForAndroid(style);

  return (
    <RNText
      {...restProps}
      style={[baseTypographyStyle, sanitizedStyle]}
    >
      {children}
    </RNText>
  );
};

export const MizanText = AppText;
export default AppText;
