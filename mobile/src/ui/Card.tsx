// ============================================================================
// Mizan (ميزان) - Institutional Card Primitive
// Monochrome surface container with 1px hairline border and 16px corners.
// ============================================================================

import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borders, radii, spacing } from '../theme/tokens';

export type CardVariant = 'default' | 'subtle' | 'inverted';

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padded?: boolean;
  style?: ViewStyle;
}

/**
 * Clean institutional card with 1px hairline border and subtle Light-mode shadow.
 */
export function Card({
  children,
  variant = 'default',
  padded = true,
  style,
}: CardProps) {
  const { colors, shadows } = useTheme();

  const variantStyle: ViewStyle =
    variant === 'inverted'
      ? {
          backgroundColor: colors.brand.hero,
          borderColor: colors.brand.heroBorder,
        }
      : variant === 'subtle'
        ? {
            backgroundColor: colors.neutral.surfaceSubtle,
            borderColor: colors.neutral.border,
          }
        : {
            backgroundColor: colors.neutral.surface,
            borderColor: colors.neutral.border,
          };

  return (
    <View
      style={[
        styles.base,
        variant === 'default' && shadows.sm,
        variantStyle,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
  },
  padded: {
    padding: spacing.md,
  },
});
