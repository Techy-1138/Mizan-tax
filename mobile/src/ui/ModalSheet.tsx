// ============================================================================
// Mizan (ميزان) - Monochrome ModalSheet Primitive (Reanimated Spring Sheet)
// Independent UI-thread backdrop opacity fade + critically-damped bottom-sheet
// slide-up/slide-down animation with ESC/back-button and backdrop click close.
// ============================================================================

import React, { ReactNode, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { borders, radii, spacing } from '../theme/tokens';
import {
  getEnterTiming,
  getExitTiming,
  motionDurations,
  motionSprings,
} from '../motion/tokens';
import { AppText } from './AppText';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  contentStyle?: ViewStyle;
}

const SHEET_HIDDEN_OFFSET = 340;
const EXIT_DURATION_MS = 180;

/**
 * Institutional bottom-sheet modal with 1px top border, independent Reanimated
 * backdrop fade + spring sheet slide, backdrop click close, and hardware back/ESC support.
 */
export function ModalSheet({
  visible,
  onClose,
  title,
  children,
  contentStyle,
}: ModalSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // Keep RN Modal mounted during exit animation so slide-down completes smoothly
  const [isRendered, setIsRendered] = useState(visible);

  const backdropOpacity = useSharedValue(0);
  const sheetTranslateY = useSharedValue(SHEET_HIDDEN_OFFSET);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      if (reduceMotion) {
        backdropOpacity.value = 1;
        sheetTranslateY.value = 0;
      } else {
        backdropOpacity.value = withTiming(1, getEnterTiming(motionDurations.normal));
        sheetTranslateY.value = withSpring(0, motionSprings.sheet);
      }
      return;
    }

    if (isRendered) {
      if (reduceMotion) {
        backdropOpacity.value = 0;
        sheetTranslateY.value = SHEET_HIDDEN_OFFSET;
        setIsRendered(false);
        return;
      }

      backdropOpacity.value = withTiming(0, getExitTiming(EXIT_DURATION_MS));
      sheetTranslateY.value = withTiming(SHEET_HIDDEN_OFFSET, getExitTiming(EXIT_DURATION_MS));

      const timer = setTimeout(() => {
        setIsRendered(false);
      }, EXIT_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [backdropOpacity, isRendered, reduceMotion, sheetTranslateY, visible]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  if (!isRendered && !visible) {
    return null;
  }

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Animated Scrim Backdrop (tap outside dismisses sheet) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.neutral.scrim },
            backdropAnimatedStyle,
          ]}
        >
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>

        {/* Spring-Animated Bottom Sheet Surface */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.neutral.surfaceRaised,
              borderColor: colors.neutral.border,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
            sheetAnimatedStyle,
            contentStyle,
          ]}
        >
          {/* Minimal drag/anchor bar */}
          <View style={[styles.handle, { backgroundColor: colors.neutral.border }]} />

          {title ? (
            <View style={[styles.header, { borderBottomColor: colors.neutral.border }]}>
              <AppText variant="h3" weight="semiBold">
                {title}
              </AppText>
            </View>
          ) : null}

          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: borders.hairline,
    borderLeftWidth: borders.hairline,
    borderRightWidth: borders.hairline,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: borders.hairline,
  },
  body: {
    gap: spacing.sm,
  },
});
