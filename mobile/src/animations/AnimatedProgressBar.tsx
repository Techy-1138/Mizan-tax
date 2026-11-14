// ============================================================================
// Mizan (ميزان) — AnimatedProgressBar
// Smooth progress bar transition for Tax Readiness scores and SBR turnover thresholds
// Animates strictly between verified values without implying unearned compliance
// ============================================================================

import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { motionSprings } from './easings';
import { useReduceMotionPreference } from './useReduceMotionPreference';

export interface AnimatedProgressBarProps {
  /**
   * Progress percentage between 0 and 100
   */
  progress: number;
  /**
   * Track height in pixels (defaults to 6)
   */
  height?: number;
  /**
   * Custom track color
   */
  trackColor?: string;
  /**
   * Custom fill color (defaults to Desert Orange brand primary)
   */
  fillColor?: string;
  /**
   * Alias for fillColor
   */
  barColor?: string;
  /**
   * Container style
   */
  style?: StyleProp<ViewStyle>;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 6,
  trackColor,
  fillColor,
  barColor,
  style,
}) => {
  const { colors } = useTheme();
  const isReducedMotion = useReduceMotionPreference();
  const clamped = Math.max(0, Math.min(progress, 100));
  const progressValue = useSharedValue<number>(clamped);
  const resolvedTrackColor = trackColor || colors.neutral.border;
  const activeColor = barColor || fillColor || colors.brand.primary;

  useEffect(() => {
    if (isReducedMotion) {
      progressValue.value = clamped;
    } else {
      progressValue.value = withSpring(clamped, motionSprings.subtle);
    }
  }, [clamped, isReducedMotion, progressValue]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      width: `${progressValue.value}%`,
    };
  });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: resolvedTrackColor },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius: height / 2, backgroundColor: activeColor },
          animatedFillStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});
