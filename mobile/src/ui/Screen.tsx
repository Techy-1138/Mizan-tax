// ============================================================================
// Mizan (ميزان) - Screen Container Primitive
// Provides SafeAreaView, themed monochrome canvas background, optional scroll,
// and keyboard avoidance for consistent screen framing.
// ============================================================================

import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/tokens';

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
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

/**
 * Standard full-screen container bound to active monochrome `canvas` color.
 */
export function Screen({
  children,
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  edges = ['top', 'bottom'],
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { colors } = useTheme();

  // Optional horizontal padding for consistent 20px institutional gutters
  const gutterStyle: ViewStyle = padded ? { paddingHorizontal: spacing.lg } : {};

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, gutterStyle, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, gutterStyle, contentContainerStyle]}>{children}</View>
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
