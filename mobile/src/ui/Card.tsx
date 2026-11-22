// ============================================================================
// Mizan (ميزان) - Institutional Card Primitive (With Reanimated Reveal)
// Monochrome surface container with 1px hairline border, 16px corners,
// and smooth fade + vertical slide-up entrance animation.
// ============================================================================

import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { borders, radii, spacing } from '../theme/tokens';
import { getEnterTiming, motionDurations, motionSprings } from '../motion/tokens';

export type CardVariant = 'default' | 'subtle' | 'inverted';

const CardVariantContext = createContext<CardVariant>('default');

/** Returns the active Card surface variant for child text/badge contrast resolution */
export const useCardVariant = (): CardVariant => useContext(CardVariantContext);

export interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padded?: boolean;
  /** Enable smooth mount fade + slide entrance (defaults to true) */
  animated?: boolean;
  /** Optional stagger delay in ms */
  delay?: number;
  style?: ViewStyle;
}

/**
 * Clean institutional card with 1px hairline border, subtle Light-mode shadow,
 * and UI-thread Reanimated entrance interpolation.
 */
export function Card({
  children,
  variant = 'default',
  padded = true,
  animated = true,
  delay = 0,
  style,
}: CardProps) {
  const { colors, shadows } = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animated && !reduceMotion;

  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const translateY = useSharedValue(shouldAnimate ? 10 : 0);

  useEffect(() => {
    if (!shouldAnimate) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    const fadeAnim = withTiming(1, getEnterTiming(motionDurations.normal));
    const slideAnim = withSpring(0, motionSprings.snappy);

    opacity.value = delay > 0 ? withDelay(delay, fadeAnim) : fadeAnim;
    translateY.value = delay > 0 ? withDelay(delay, slideAnim) : slideAnim;
  }, [delay, opacity, shouldAnimate, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

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
    <Animated.View
      style={[
        styles.base,
        variant === 'default' && shadows.sm,
        variantStyle,
        padded && styles.padded,
        animatedStyle,
        style,
      ]}
    >
      <CardVariantContext.Provider value={variant}>
        {children}
      </CardVariantContext.Provider>
    </Animated.View>
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
