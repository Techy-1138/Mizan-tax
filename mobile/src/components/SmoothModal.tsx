// ============================================================================
// Mizan (ميزان) — SmoothModal Component
// Zero-Distortion Spring Popup Modal Engine for UAE Tax & Fintech Platform
// Architecture:
// 1. Eliminates background screen jumping via statusBarTranslucent + hardwareAccelerated
// 2. Coordinated Reanimated Spring Physics (scale: 0.93 -> 1.0, opacity: 0 -> 1)
// 3. Graceful exit lifecycle: delays native Modal unmount until exit spring settles
// 4. Strict GEMINI.md Rule 12 compliance: ESC key & backdrop tap dismissal
// 5. Accessibility aware: checks useReduceMotionPreference() for vestibular comfort
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  BackHandler,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { ThemeColors, ThemeShadows, radii, spacing } from '../theme/tokens';
import { useThemedStyles } from '../context/ThemeContext';
import { useReduceMotionPreference } from '../animations/useReduceMotionPreference';
import { motionDurations } from '../animations/motionTokens';
import { motionEasings, motionSprings } from '../animations/easings';

export interface SmoothModalProps {
  /**
   * Whether the modal is active and should be presented.
   */
  visible: boolean;

  /**
   * Callback fired when the user requests dismissal (backdrop tap, back button, ESC).
   */
  onClose: () => void;

  /**
   * Child content rendered inside the animated modal card.
   */
  children: React.ReactNode;

  /**
   * Maximum card width (defaults to 440 for clean mobile & tablet framing).
   */
  maxWidth?: number | string;

  /**
   * Maximum card height (defaults to '88%' to prevent off-screen overflow).
   */
  maxHeight?: number | string;

  /**
   * Whether tapping the dimmed backdrop triggers onClose (default: true).
   * Set to false for high-stakes flows (e.g. business deletion or payment).
   */
  dismissOnBackdrop?: boolean;

  /**
   * Custom style applied to the outer backdrop container.
   */
  backdropStyle?: StyleProp<ViewStyle>;

  /**
   * Custom style applied to the animated card container.
   */
  cardStyle?: StyleProp<ViewStyle>;

  /**
   * Whether to wrap contents in KeyboardAvoidingView (default: true).
   */
  avoidKeyboard?: boolean;

  /**
   * Test ID for automated QA suites.
   */
  testID?: string;
}

export const SmoothModal: React.FC<SmoothModalProps> = ({
  visible,
  onClose,
  children,
  maxWidth = 440,
  maxHeight = '88%',
  dismissOnBackdrop = true,
  backdropStyle,
  cardStyle,
  avoidKeyboard = true,
  testID,
}) => {
  const styles = useThemedStyles(createStyles);
  // Respect system-level accessibility motion preference
  const isReducedMotion = useReduceMotionPreference();

  // Internal mounted flag: keeps native Modal rendered during exit animation
  const [isMounted, setIsMounted] = useState<boolean>(visible);

  // Shared values for hardware-accelerated transforms on the UI thread
  const backdropOpacity = useSharedValue<number>(0);
  const cardScale = useSharedValue<number>(isReducedMotion ? 1 : 0.93);
  const cardOpacity = useSharedValue<number>(0);
  const cardTranslateY = useSharedValue<number>(isReducedMotion ? 0 : 12);

  // Safely mark unmounted on JS thread when exit animation settles
  const finishUnmount = useCallback(() => {
    setIsMounted(false);
  }, []);

  // Coordinated entrance and exit animation lifecycle
  useEffect(() => {
    if (visible) {
      // 1. Mount the native container immediately
      setIsMounted(true);

      // Cancel any in-flight exit animations
      cancelAnimation(backdropOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardTranslateY);

      if (isReducedMotion) {
        // Fast, direct linear fade without scaling for users with motion sensitivity
        backdropOpacity.value = withTiming(1, { duration: motionDurations.microFast });
        cardOpacity.value = withTiming(1, { duration: motionDurations.microFast });
        cardScale.value = 1;
        cardTranslateY.value = 0;
      } else {
        // Smooth decelerating backdrop fade
        backdropOpacity.value = withTiming(1, {
          duration: 220,
          easing: motionEasings.decelerate,
        });

        // Organic spring curve for content card entrance
        cardScale.value = withSpring(1, {
          damping: 24,
          stiffness: 260,
          mass: 0.8,
          overshootClamping: false,
        });

        cardTranslateY.value = withSpring(0, {
          damping: 24,
          stiffness: 260,
          mass: 0.8,
        });

        cardOpacity.value = withTiming(1, {
          duration: 180,
          easing: motionEasings.decelerate,
        });
      }
    } else if (isMounted) {
      // Graceful Exit Phase: animate out before destroying the native dialog
      cancelAnimation(backdropOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardTranslateY);

      const exitDuration = isReducedMotion ? motionDurations.microFast : 160;

      backdropOpacity.value = withTiming(0, {
        duration: exitDuration,
        easing: motionEasings.accelerate,
      });

      cardOpacity.value = withTiming(0, {
        duration: exitDuration,
        easing: motionEasings.accelerate,
      });

      if (!isReducedMotion) {
        cardScale.value = withTiming(0.95, {
          duration: exitDuration,
          easing: motionEasings.accelerate,
        });

        cardTranslateY.value = withTiming(8, {
          duration: exitDuration,
          easing: motionEasings.accelerate,
        });
      }

      // Delay native unmount until visual exit completes
      const timeout = setTimeout(() => {
        finishUnmount();
      }, exitDuration + 20);

      return () => clearTimeout(timeout);
    }
  }, [visible, isMounted, isReducedMotion, finishUnmount]);

  // Handle Android physical hardware back button & web ESC key
  useEffect(() => {
    if (!isMounted || !visible) return;

    const onBackPress = () => {
      onClose();
      return true; // Consume event to prevent app exit
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isMounted, visible, onClose]);

  // Animated styles applied to Reanimated nodes
  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  // Handle backdrop touch event
  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onClose();
    }
  };

  // If component is fully unmounted, render null to release memory
  if (!isMounted) {
    return null;
  }

  const content = (
    <View style={styles.overlayContainer}>
      {/* Dimmed Background Overlay with Zero-Distortion Insets */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle, backdropStyle]} />
      </TouchableWithoutFeedback>

      {/* Spring Animated Modal Card */}
      <Animated.View
        testID={testID}
        style={[
          styles.card,
          { maxWidth: maxWidth as any, maxHeight: maxHeight as any },
          animatedCardStyle,
          cardStyle,
        ]}
      >
        {/* Stop touch propagation so clicks inside the card do not dismiss */}
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={styles.cardInner}>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={isMounted}
      transparent={true}
      animationType="none" // Rely strictly on Reanimated to eliminate native window layout jumps
      statusBarTranslucent={true} // Prevents Android status bar re-layout and background distortion
      hardwareAccelerated={true}
      onRequestClose={onClose} // Native Back / ESC handler
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  );
};

const createStyles = (colors: ThemeColors, _isDark: boolean, shadows: ThemeShadows) =>
  StyleSheet.create({
    keyboardContainer: {
      flex: 1,
    },
    overlayContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.neutral.scrim,
    },
    card: {
      width: '100%',
      backgroundColor: colors.neutral.surfaceRaised,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.neutral.border,
      overflow: 'hidden',
      ...shadows.heroCard,
    },
    cardInner: {
      width: '100%',
    },
  });
