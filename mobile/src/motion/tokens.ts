// ============================================================================
// Mizan (ميزان) - Motion & Navigation Tokens
// Critically-damped spring configurations, institutional timing durations,
// and cubic-bezier curves for 60/120 FPS UI-thread animations.
// ============================================================================

import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * Standardized institutional transition durations in milliseconds.
 * Kept crisp (140ms - 280ms) so financial workflows never feel sluggish.
 */
export const motionDurations = {
  /** Micro-interactions: button press, chip toggle, focus ring */
  fast: 140,
  /** Standard screen entrance, card reveal, tab cross-fade */
  normal: 220,
  /** Modal sheet exit and larger layout transitions */
  slow: 280,
} as const;

/**
 * Hardware-accelerated Easing curves for opacity and subtle translations.
 */
export const motionEasings = {
  /** Deceleration curve for elements entering the viewport */
  enter: Easing.out(Easing.cubic),
  /** Acceleration curve for elements leaving the viewport */
  exit: Easing.in(Easing.cubic),
  /** Symmetric curve for state morphing */
  standard: Easing.inOut(Easing.cubic),
} as const;

/**
 * Critically-damped spring presets (zero cartoonish bounce/overshoot).
 */
export const motionSprings: Record<'press' | 'sheet' | 'snappy', WithSpringConfig> = {
  /** Tactile button/card press scale interpolation */
  press: {
    damping: 24,
    stiffness: 360,
    mass: 0.7,
  },
  /** Bottom sheet entrance spring */
  sheet: {
    damping: 28,
    stiffness: 290,
    mass: 0.85,
  },
  /** Tab icon & step transition spring */
  snappy: {
    damping: 24,
    stiffness: 320,
    mass: 0.75,
  },
};

/**
 * Helper returning a standard enter timing configuration.
 */
export const getEnterTiming = (duration: number = motionDurations.normal): WithTimingConfig => ({
  duration,
  easing: motionEasings.enter,
});

/**
 * Helper returning a standard exit timing configuration.
 */
export const getExitTiming = (duration: number = motionDurations.fast): WithTimingConfig => ({
  duration,
  easing: motionEasings.exit,
});
