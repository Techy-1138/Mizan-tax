// ============================================================================
// Mizan (ميزان) - Screen Container Primitive (With Reanimated Entrance)
// Provides SafeAreaView, themed monochrome canvas background, optional scroll,
// keyboard avoidance, and smooth UI-thread fade + vertical slide-in on mount.
// ============================================================================

import React, { ReactNode, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/tokens';
import { getEnterTiming, motionDurations, motionSprings } from '../motion/tokens';

export interface ScreenProps {
  children: ReactNode;
  /** Enable vertical ScrollView wrapper */
  scroll?: boolean;
  /** Enable KeyboardAvoidingView for form screens */
  keyboardAvoiding?: boolean;
  /** Apply default horizontal padding (spacing.lg = 20px) */
  padded?: boolean;
  /** Safe-area edges to respect (defaults to top & bottom) */
  edges?: Edge[];
  /** Enable smooth mount fade + slide entrance (defaults to true) */
  animated?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

/**
 * Standard full-screen container bound to active monochrome `canvas` color
 * with a crisp UI-thread entrance transition.
 */
export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  edges = ['top', 'bottom'],
  animated = true,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animated && !reduceMotion;

  // Shared values for screen-level entrance transition
  const opacity = useSharedValue(shouldAnimate ? 0 : 1);
  const translateY = useSharedValue(shouldAnimate ? 8 : 0);

  useEffect(() => {
    if (!shouldAnimate) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = withTiming(1, getEnterTiming(motionDurations.normal));
    translateY.value = withSpring(0, motionSprings.snappy);
  }, [opacity, shouldAnimate, translateY]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Optional horizontal padding for consistent 20px institutional gutters
  const gutterStyle: ViewStyle = padded ? { paddingHorizontal: spacing.lg } : {};

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, gutterStyle, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.flex, entranceStyle]}>{children}</Animated.View>
    </ScrollView>
  ) : (
    <Animated.View style={[styles.flex, gutterStyle, entranceStyle, contentContainerStyle]}>
      {children}
    </Animated.View>
  );

  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, { backgroundColor: colors.neutral.canvas }, style]}
    >
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
});
