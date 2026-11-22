// ============================================================================
// Mizan (ميزان) - FadeIn Reanimated Primitive
// UI-thread opacity entrance wrapper respecting OS reduced-motion preferences.
// ============================================================================

import React, { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { getEnterTiming, motionDurations } from './tokens';

export interface FadeInProps {
  children: ReactNode;
  /** Animation duration in ms (defaults to 220ms) */
  duration?: number;
  /** Optional stagger delay in ms */
  delay?: number;
  /** Starting opacity (defaults to 0) */
  fromOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Smoothly fades children in on mount using a Reanimated UI-thread worklet.
 */
export function FadeIn({
  children,
  duration = motionDurations.normal,
  delay = 0,
  fromOpacity = 0,
  style,
}: FadeInProps) {
  // Respect OS accessibility reduced-motion setting
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : fromOpacity);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    const timing = withTiming(1, getEnterTiming(duration));
    opacity.value = delay > 0 ? withDelay(delay, timing) : timing;
  }, [delay, duration, opacity, reduceMotion]);

  // Compute animated opacity on the native UI thread
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
