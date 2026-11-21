// ============================================================================
// Mizan (ميزان) - Monochrome Status Badge Primitive
// Differentiates compliance/tax states purely through black/white contrast.
// ============================================================================

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { borders, radii, spacing } from '../theme/tokens';
import { AppText } from './AppText';

export type BadgeVariant = 'solid' | 'outline' | 'muted';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

/**
 * Compact pill badge for statutory/compliance status labels.
 */
export function Badge({ label, variant = 'muted', style }: BadgeProps) {
  const { colors } = useTheme();

  const containerStyle: ViewStyle =
    variant === 'solid'
      ? {
          backgroundColor: colors.status.solidBg,
          borderColor: colors.status.solidBg,
        }
      : variant === 'outline'
        ? {
            backgroundColor: colors.status.outlineBg,
            borderColor: colors.status.outlineBorder,
          }
        : {
            backgroundColor: colors.status.mutedBg,
            borderColor: colors.neutral.border,
          };

  const textTone = variant === 'solid' ? 'inverted' : variant === 'outline' ? 'primary' : 'secondary';

  return (
    <View style={[styles.badge, containerStyle, style]}>
      <AppText variant="caption" weight="semiBold" tone={textTone}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
});
