// ============================================================================
// Mizan (ميزان) - Login Screen (Screen 1B)
// Monochrome institutional sign-in: Email/Password (Firebase + Backend sync),
// 1-Tap Google Sign-In (native-guarded), and Forgot Password ModalSheet.
// ============================================================================

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MizanApi } from '../../src/services/api';
import { performGoogleSignIn } from '../../src/services/googleAuth';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessages';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { borders, radii, spacing } from '../../src/theme/tokens';
import {
  AnimatedPressable,
  AppText,
  Button,
  Card,
  ModalSheet,
  Screen,
  TextField,
} from '../../src/ui';

/**
 * Monochrome Login screen supporting EN/AR RTL and Light/Dark modes.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL, toggleLocale } = useLocale();
  const { refreshBusinesses } = useBusiness();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Forgot Password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  /** Routes authenticated user to Tabs (if business exists) or Onboarding */
  const routeAfterAuth = async () => {
    try {
      await refreshBusinesses();
      const businesses = await MizanApi.getBusinesses();
      if (Array.isArray(businesses) && businesses.length > 0) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/business');
      }
    } catch {
      // Safe fallback to onboarding if business list check fails immediately after login
      router.replace('/onboarding/business');
    }
  };

  /** Email/password sign-in via Firebase Auth + NestJS backend sync */
  const handleSignIn = async () => {
    setFormError(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError(isRTL ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid work email.');
      return;
    }
    if (password.length < 6) {
      setFormError(
        isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters.'
      );
      return;
    }

    setLoading(true);
    try {
      await MizanApi.login({ email: trimmedEmail, password });
      await routeAfterAuth();
    } catch (err: any) {
      setFormError(
        getFriendlyErrorMessage(
          err,
          isRTL,
          'Sign-in failed. Please check your email and password.',
          'فشل تسجيل الدخول. يرجى التحقق من البريد وكلمة المرور.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /** 1-Tap Google Sign-In */
  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const outcome = await performGoogleSignIn(isRTL);
      if (outcome.status === 'success') {
        await routeAfterAuth();
      } else if (outcome.status === 'error' || outcome.status === 'unavailable') {
        setFormError(outcome.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  /** Send Firebase password reset email */
  const handleSendReset = async () => {
    const target = resetEmail.trim();
    if (!target || !target.includes('@')) {
      setResetFeedback(isRTL ? 'أدخل بريداً إلكترونياً صحيحاً' : 'Enter a valid email address.');
      return;
    }
    setResetLoading(true);
    setResetFeedback(null);
    try {
      await MizanApi.sendPasswordReset(target);
      setResetFeedback(
        isRTL
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.'
          : 'Password reset link sent. Check your inbox.'
      );
    } catch (err: any) {
      setResetFeedback(
        getFriendlyErrorMessage(
          err,
          isRTL,
          'Could not send reset email. Please check the address.',
          'تعذر إرسال رابط إعادة التعيين. تحقق من البريد الإلكتروني.'
        )
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.scrollContent}>
      {/* Top Bar: Language Toggle */}
      <View style={styles.topBar}>
        <Pressable
          onPress={toggleLocale}
          style={[
            styles.langPill,
            {
              backgroundColor: colors.neutral.surface,
              borderColor: colors.neutral.border,
            },
          ]}
        >
          <AppText variant="caption" weight="semiBold">
            {isRTL ? 'EN' : 'العربية'}
          </AppText>
        </Pressable>
      </View>

      {/* Brand Mark & Heading */}
      <View style={styles.header}>
        <View style={[styles.brandMark, { backgroundColor: colors.brand.primary }]}>
          <AppText variant="h2" tone="inverted">
            م
          </AppText>
        </View>
        <AppText variant="h1" style={styles.title}>
          {isRTL ? 'تسجيل الدخول إلى ميزان' : 'Sign in to Mizan'}
        </AppText>
        <AppText variant="body" tone="secondary">
          {isRTL
            ? 'مساحة عمل الامتثال لضريبة الشركات وضريبة القيمة المضافة'
            : 'UAE Corporate Tax & VAT compliance workspace'}
        </AppText>
      </View>

      {/* 1-Tap Google Sign-In (Prominent Primary Option) */}
      <AnimatedPressable
        onPress={handleGoogleSignIn}
        disabled={loading || googleLoading}
        style={[
          styles.googleBtn,
          {
            backgroundColor: colors.neutral.surface,
            borderColor: colors.neutral.borderStrong,
            opacity: loading || googleLoading ? 0.55 : 1,
          },
        ]}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color={colors.neutral.textPrimary} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.neutral.textPrimary} />
            <AppText variant="body" weight="semiBold">
              {isRTL ? 'المتابعة عبر Google' : 'Continue with Google'}
            </AppText>
          </>
        )}
      </AnimatedPressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.neutral.border }]} />
        <AppText variant="caption" tone="muted">
          {isRTL ? 'أو' : 'OR'}
        </AppText>
        <View style={[styles.dividerLine, { backgroundColor: colors.neutral.border }]} />
      </View>

      {/* Credentials Card */}
      <Card style={styles.card}>
        <TextField
          label={isRTL ? 'البريد الإلكتروني للعمل' : 'Work Email'}
          placeholder="founder@company.ae"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <View>
          <View style={styles.passwordLabelRow}>
            <AppText variant="bodySmall" weight="medium" tone="secondary">
              {isRTL ? 'كلمة المرور' : 'Password'}
            </AppText>
            <Pressable
              onPress={() => {
                setResetEmail(email.trim());
                setResetFeedback(null);
                setForgotOpen(true);
              }}
            >
              <AppText variant="caption" weight="semiBold" style={styles.underlineLink}>
                {isRTL ? 'نسيت؟' : 'Forgot?'}
              </AppText>
            </Pressable>
          </View>
          <TextField
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightSlot={
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <AppText variant="caption" weight="semiBold" tone="secondary">
                  {showPassword ? (isRTL ? 'إخفاء' : 'Hide') : isRTL ? 'إظهار' : 'Show'}
                </AppText>
              </Pressable>
            }
          />
        </View>

        {formError ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.neutral.surfaceSubtle,
                borderColor: colors.neutral.borderStrong,
              },
            ]}
          >
            <AppText variant="bodySmall" weight="semiBold">
              {formError}
            </AppText>
          </View>
        ) : null}

        <Button
          label={isRTL ? 'تسجيل الدخول' : 'Sign In'}
          variant="primary"
          loading={loading}
          disabled={googleLoading}
          onPress={handleSignIn}
          style={styles.submitBtn}
        />
      </Card>

      {/* Register Link */}
      <View style={styles.footerRow}>
        <AppText variant="bodySmall" tone="secondary">
          {isRTL ? 'جديد في ميزان؟' : 'New to Mizan?'}
        </AppText>
        <Pressable onPress={() => router.push('/auth/register')}>
          <AppText variant="bodySmall" weight="semiBold" style={styles.underlineLink}>
            {isRTL ? 'إنشاء حساب' : 'Create account'}
          </AppText>
        </Pressable>
      </View>

      {/* Forgot Password ModalSheet */}
      <ModalSheet
        visible={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
      >
        <AppText variant="bodySmall" tone="secondary">
          {isRTL
            ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.'
            : 'Enter your work email and we will send a password reset link.'}
        </AppText>
        <TextField
          label={isRTL ? 'البريد الإلكتروني' : 'Email'}
          placeholder="founder@company.ae"
          value={resetEmail}
          onChangeText={setResetEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {resetFeedback ? (
          <AppText variant="bodySmall" weight="medium">
            {resetFeedback}
          </AppText>
        ) : null}
        <Button
          label={isRTL ? 'إرسال الرابط' : 'Send Reset Link'}
          variant="primary"
          loading={resetLoading}
          onPress={handleSendReset}
        />
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  langPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  header: {
    gap: spacing.xs,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  title: {
    marginTop: spacing.xxs,
  },
  googleBtn: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxs + 2,
  },
  underlineLink: {
    textDecorationLine: 'underline',
  },
  errorBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.xxs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: borders.hairline,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    marginTop: spacing.xs,
  },
});
