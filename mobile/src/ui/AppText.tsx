// ============================================================================
// Mizan (ميزان) - AppText Typography Primitive
// Automatically selects Outfit (EN display), DM Sans (EN body), Cairo (AR RTL),
// or DM Mono (tabular financial amounts & TRNs) with monochrome color roles.
// ============================================================================

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { getFont, getMonoFont, typeScale } from '../theme/tokens';
import { useCardVariant } from './Card';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'mono';

export type TextTone = 'primary' | 'secondary' | 'muted' | 'inverted';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
  /** Force tabular-nums for aligned financial columns */
  tabular?: boolean;
}

const DEFAULT_WEIGHT: Record<TextVariant, 'regular' | 'medium' | 'semiBold' | 'bold'> = {
  display: 'bold',
  h1: 'bold',
  h2: 'semiBold',
  h3: 'semiBold',
  body: 'regular',
  bodySmall: 'regular',
  caption: 'medium',
  mono: 'medium',
};

/**
 * Monochrome, RTL-aware typography component.
 */
export function AppText({
  variant = 'body',
  tone = 'primary',
  weight,
  tabular,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const cardVariant = useCardVariant();

  const resolvedWeight = weight ?? DEFAULT_WEIGHT[variant];
  const isDisplay = variant === 'display' || variant === 'h1' || variant === 'h2';

  // Resolve font family (DM Mono for mono variant, Cairo for Arabic, Outfit/DM Sans for English)
  const fontMeta =
    variant === 'mono'
      ? getMonoFont(resolvedWeight === 'regular' ? 'regular' : 'medium')
      : getFont(resolvedWeight, isRTL, isDisplay);

  const toneColorMap: Record<TextTone, string> = {
    primary: colors.neutral.textPrimary,
    secondary: colors.neutral.textSecondary,
    muted: colors.neutral.textMuted,
    // Inside dark Hero cards (`brand.hero`), keep text crisp light (`brand.heroText`) in both themes
    inverted:
      cardVariant === 'inverted' ? colors.brand.heroText : colors.neutral.textInverted,
  };

  const scaleStyle = typeScale[variant];
  const useTabular = tabular ?? variant === 'mono';

  const composedStyle: TextStyle = {
    ...scaleStyle,
    ...fontMeta,
    color: toneColorMap[tone],
    writingDirection: variant === 'mono' ? 'ltr' : isRTL ? 'rtl' : 'ltr',
    ...(useTabular ? { fontVariant: ['tabular-nums'] } : {}),
  };

  return (
    <RNText style={[composedStyle, style]} {...rest}>
      {children}
    </RNText>
  );
}
