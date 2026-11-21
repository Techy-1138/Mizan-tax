// ============================================================================
// Mizan (ميزان) - Monochrome Button Primitive
// Clean institutional FinTech button with crisp 1px borders, 12px radius,
// loading indicator, and optional haptic feedback.
// ============================================================================

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { AppPreferences } from '../utils/preferences';
import { borders, radii, spacing } from '../theme/tokens';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Monochrome action button supporting primary (inverted), secondary (subtle),
 * outline (1px hairline), and ghost variants.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getContainerColors = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: pressed ? colors.brand.primaryPressed : colors.brand.primary,
          borderColor: colors.brand.primary,
          borderWidth: borders.hairline,
        };
      case 'secondary':
        return {
          backgroundColor: pressed ? colors.neutral.border : colors.neutral.surfaceSubtle,
          borderColor: colors.neutral.border,
          borderWidth: borders.hairline,
        };
      case 'outline':
        return {
          backgroundColor: pressed ? colors.neutral.surfaceSubtle : 'transparent',
          borderColor: colors.neutral.borderStrong,
          borderWidth: borders.hairline,
        };
      case 'ghost':
        return {
          backgroundColor: pressed ? colors.neutral.surfaceSubtle : 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        };
    }
  };

  const textTone = variant === 'primary' ? 'inverted' : 'primary';

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.sizeLg : styles.sizeMd,
        fullWidth && styles.fullWidth,
        getContainerColors(pressed),
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.neutral.textInverted : colors.neutral.textPrimary}
        />
      ) : (
        <AppText variant="body" weight="semiBold" tone={textTone}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  sizeLg: {
    minHeight: 50,
  },
  sizeMd: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
});
