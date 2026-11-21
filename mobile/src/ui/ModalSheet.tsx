// ============================================================================
// Mizan (ميزان) - Monochrome ModalSheet Primitive
// Supports backdrop-tap dismissal and native hardware back / ESC dismissal.
// ============================================================================

import React, { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { borders, radii, spacing } from '../theme/tokens';
import { AppText } from './AppText';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  contentStyle?: ViewStyle;
}

/**
 * Institutional bottom-sheet modal with 1px top border, backdrop click close,
 * and onRequestClose (Android back / hardware ESC) support.
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop press dismisses the sheet */}
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.neutral.scrim }]}
        onPress={onClose}
      >
        {/* Stop propagation so tapping inside the sheet does not close it */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.neutral.surfaceRaised,
              borderColor: colors.neutral.border,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
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
