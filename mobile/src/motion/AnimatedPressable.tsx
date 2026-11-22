// ============================================================================
// Mizan (ميزان) - AnimatedPressable Micro-Interaction Primitive
// Provides smooth UI-thread scale & opacity spring feedback on touch.
// ============================================================================

import React, { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motionSprings } from './tokens';

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: ReactNode;
  /** Target scale when pressed (defaults to 0.98) */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps Pressable with a Reanimated scale spring for tactile institutional feedback.
 */
export function AnimatedPressable({
  children,
  scaleTo = 0.98,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: AnimatedPressableProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={disabled}
        onPressIn={(e) => {
          if (!reduceMotion && !disabled) {
            scale.value = withSpring(scaleTo, motionSprings.press);
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          if (!reduceMotion) {
            scale.value = withSpring(1, motionSprings.press);
          }
          onPressOut?.(e);
        }}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
