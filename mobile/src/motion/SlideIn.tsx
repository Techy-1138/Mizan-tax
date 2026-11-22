// ============================================================================
// Mizan (ميزان) - SlideIn Reanimated Primitive
// Directional slide + opacity entrance wrapper for cards, sections, and steps.
// ============================================================================

import React, { ReactNode, useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getEnterTiming, motionDurations, motionSprings } from './tokens';

export type SlideDirection = 'bottom' | 'top' | 'left' | 'right';

export interface SlideInProps {
  children: ReactNode;
  /** Direction from which the element enters (defaults to 'bottom') */
  from?: SlideDirection;
  /** Initial pixel offset before settling to 0 (defaults to 12px) */
  distance?: number;
  /** Optional stagger delay in ms */
  delay?: number;
  /** Duration for the paired opacity fade (defaults to 220ms) */
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Combines a critically-damped spring translation with a smooth opacity fade-in.
 */
export function SlideIn({
  children,
  from = 'bottom',
  distance = 12,
  delay = 0,
  duration = motionDurations.normal,
  style,
}: SlideInProps) {
  const reduceMotion = useReducedMotion();

  // Compute initial axis offset based on requested entrance direction
  const initialX =
    reduceMotion ? 0 : from === 'left' ? -distance : from === 'right' ? distance : 0;
  const initialY =
    reduceMotion ? 0 : from === 'top' ? -distance : from === 'bottom' ? distance : 0;

  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      return;
    }

    const fadeAnim = withTiming(1, getEnterTiming(duration));
    const springX = withSpring(0, motionSprings.snappy);
    const springY = withSpring(0, motionSprings.snappy);

    opacity.value = delay > 0 ? withDelay(delay, fadeAnim) : fadeAnim;
    translateX.value = delay > 0 ? withDelay(delay, springX) : springX;
    translateY.value = delay > 0 ? withDelay(delay, springY) : springY;
  }, [delay, duration, opacity, reduceMotion, translateX, translateY]);

  // Apply 2D translation + opacity on the UI thread
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
