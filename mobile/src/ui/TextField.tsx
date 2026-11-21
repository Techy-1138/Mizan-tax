// ============================================================================
// Mizan (ميزان) - Monochrome TextField Primitive
// 1px hairline input with high-contrast focus border, RTL alignment,
// error/helper messaging, and optional DM Mono formatting for TRN / AED.
// ============================================================================

import React, { ReactNode, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { borders, getFont, getMonoFont, radii, spacing, typeScale } from '../theme/tokens';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  /** Render input value in DM Mono (recommended for TRNs, license numbers, AED) */
  mono?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Monochrome form input with crisp focus ring and accessible label/error stack.
 */
export function TextField({
  label,
  helperText,
  error,
  mono = false,
  leftSlot,
  rightSlot,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const [focused, setFocused] = useState(false);

  const fontMeta = mono ? getMonoFont('regular') : getFont('regular', isRTL, false);
  const hasError = Boolean(error);

  // Use strong border on focus or validation error (monochrome hierarchy)
  const borderColor = hasError || focused ? colors.neutral.borderStrong : colors.neutral.border;
  const borderWidth = hasError || focused ? borders.strong : borders.hairline;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText variant="bodySmall" weight="medium" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.neutral.surface,
            borderColor,
            borderWidth,
          },
        ]}
      >
        {leftSlot ? <View style={styles.slot}>{leftSlot}</View> : null}

        <TextInput
          placeholderTextColor={colors.neutral.textMuted}
          selectionColor={colors.neutral.textPrimary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            fontMeta,
            {
              color: colors.neutral.textPrimary,
              textAlign: mono ? 'left' : isRTL ? 'right' : 'left',
              writingDirection: mono ? 'ltr' : isRTL ? 'rtl' : 'ltr',
            },
            style,
          ]}
          {...rest}
        />

        {rightSlot ? <View style={styles.slot}>{rightSlot}</View> : null}
      </View>

      {hasError ? (
        <AppText variant="caption" weight="semiBold" tone="primary" style={styles.message}>
          ! {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" tone="muted" style={styles.message}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    marginBottom: spacing.xxs + 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typeScale.body.fontSize,
    paddingVertical: spacing.sm,
  },
  slot: {
    marginHorizontal: spacing.xxs,
  },
  message: {
    marginTop: spacing.xxs + 2,
  },
});
