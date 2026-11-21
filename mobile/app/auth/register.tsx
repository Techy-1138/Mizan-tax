// ============================================================================
// Mizan (ميزان) - Register Screen (Screen 2)
// Monochrome institutional account creation: Full Name, Work Email, optional
// UAE Phone & Company, Password with monochrome strength bar, and Google OAuth.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MizanApi } from '../../src/services/api';
import { isGoogleSignInSupported, performGoogleSignIn } from '../../src/services/googleAuth';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { borders, radii, spacing } from '../../src/theme/tokens';
import { AppText, Button, Card, Screen, TextField } from '../../src/ui';

/**
 * Evaluates password strength on a 1..3 scale for the monochrome indicator.
 */
function getPasswordStrength(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
  return score as 0 | 1 | 2 | 3;
}

/**
 * Translates common Firebase Auth error codes into user-friendly EN/AR copy.
 */
function formatAuthError(err: any, isRTL: boolean): string {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') {
    return isRTL
      ? 'هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول.'
      : 'This email is already registered. Try signing in instead.';
  }
  if (code === 'auth/weak-password') {
    return isRTL
      ? 'كلمة المرور ضعيفة جداً. استخدم 8 أحرف على الأقل.'
      : 'Password is too weak. Use at least 8 characters.';
  }
  return (
    err?.message ||
    (isRTL ? 'تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.' : 'Registration failed. Please try again.')
  );
}

/**
 * Monochrome Create Account screen supporting EN/AR RTL and Light/Dark modes.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL, toggleLocale } = useLocale();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const googleSupported = isGoogleSignInSupported();
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return '';
    if (strength === 1) return isRTL ? 'ضعيفة' : 'Weak';
    if (strength === 2) return isRTL ? 'متوسطة' : 'Fair';
    return isRTL ? 'قوية' : 'Strong';
  }, [strength, isRTL]);

  /** Handles email/password registration via Firebase + NestJS backend sync */
  const handleRegister = async () => {
    setFormError(null);
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setFormError(isRTL ? 'يرجى إدخال الاسم الكامل.' : 'Please enter your full name.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError(isRTL ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid work email.');
      return;
    }
    if (password.length < 8) {
      setFormError(
        isRTL
          ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.'
          : 'Password must be at least 8 characters.'
      );
      return;
    }
    if (password !== confirmPassword) {
      setFormError(isRTL ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await MizanApi.register({
        fullName: trimmedName,
        email: trimmedEmail,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(organisationName.trim() ? { organisationName: organisationName.trim() } : {}),
      });
      router.replace('/onboarding/business');
    } catch (err: any) {
      setFormError(formatAuthError(err, isRTL));
    } finally {
      setLoading(false);
    }
  };

  /** Handles 1-Tap Google Sign-Up and routes based on existing business state */
  const handleGoogleSignUp = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const outcome = await performGoogleSignIn(isRTL);
      if (outcome.status === 'success') {
        try {
          const businesses = await MizanApi.getBusinesses();
          if (Array.isArray(businesses) && businesses.length > 0) {
            router.replace('/(tabs)');
            return;
          }
        } catch {
          // Fall through to onboarding if business check fails
        }
        router.replace('/onboarding/business');
      } else if (outcome.status === 'error' || outcome.status === 'unavailable') {
        setFormError(outcome.message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.scrollContent}>
      {/* Top Bar: Back & Language Toggle */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.pillBtn,
            {
              backgroundColor: colors.neutral.surface,
              borderColor: colors.neutral.border,
            },
          ]}
        >
          <AppText variant="caption" weight="semiBold">
            {isRTL ? '→ رجوع' : '← Back'}
          </AppText>
        </Pressable>

        <Pressable
          onPress={toggleLocale}
          style={[
            styles.pillBtn,
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

      {/* Heading */}
      <View style={styles.header}>
        <AppText variant="h1">
          {isRTL ? 'إنشاء حسابك' : 'Create your account'}
        </AppText>
        <AppText variant="body" tone="secondary">
          {isRTL
            ? 'ابدأ مساحة عمل ضريبة الشركات وضريبة القيمة المضافة'
            : 'Start your UAE Corporate Tax & VAT workspace'}
        </AppText>
      </View>

      {/* Registration Form Card */}
      <Card style={styles.card}>
        <TextField
          label={isRTL ? 'الاسم الكامل' : 'Full Name'}
          placeholder={isRTL ? 'طارق المكتوم' : 'Tariq Al Maktoum'}
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />

        <TextField
          label={isRTL ? 'البريد الإلكتروني للعمل' : 'Work Email'}
          placeholder="founder@company.ae"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        {/* Optional Phone & Company Side-by-Side */}
        <View style={styles.rowTwoCol}>
          <View style={styles.col}>
            <TextField
              label={isRTL ? 'الهاتف (اختياري)' : 'UAE Phone (Opt.)'}
              placeholder="+971 50 123 4567"
              value={phone}
              onChangeText={setPhone}
              mono
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.col}>
            <TextField
              label={isRTL ? 'الشركة (اختياري)' : 'Company (Opt.)'}
              placeholder="Al Noor LLC"
              value={organisationName}
              onChangeText={setOrganisationName}
            />
          </View>
        </View>

        <View>
          <TextField
            label={isRTL ? 'كلمة المرور' : 'Password'}
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
          {password.length > 0 ? (
            <View style={styles.strengthRow}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        strength >= step ? colors.brand.primary : colors.neutral.border,
                    },
                  ]}
                />
              ))}
              <AppText variant="caption" tone="secondary" style={styles.strengthLabel}>
                {strengthLabel}
              </AppText>
            </View>
          ) : null}
        </View>

        <TextField
          label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          error={
            confirmPassword.length > 0 && confirmPassword !== password
              ? isRTL
                ? 'كلمتا المرور غير متطابقتين'
                : 'Passwords do not match'
              : undefined
          }
        />

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
              ! {formError}
            </AppText>
          </View>
        ) : null}

        <Button
          label={isRTL ? 'إنشاء حساب' : 'Create Account'}
          variant="primary"
          loading={loading}
          disabled={googleLoading}
          onPress={handleRegister}
          style={styles.submitBtn}
        />
      </Card>

      {/* Google Sign-Up Section */}
      {googleSupported ? (
        <Button
          label={isRTL ? 'التسجيل عبر Google' : 'Sign up with Google'}
          variant="outline"
          loading={googleLoading}
          disabled={loading}
          onPress={handleGoogleSignUp}
        />
      ) : null}

      {/* Sign In Footer */}
      <View style={styles.footerRow}>
        <AppText variant="bodySmall" tone="secondary">
          {isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
        </AppText>
        <Pressable onPress={() => router.replace('/auth/login')}>
          <AppText variant="bodySmall" weight="semiBold" style={styles.underlineLink}>
            {isRTL ? 'تسجيل الدخول' : 'Sign in'}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
  },
  langPill: {
    borderRadius: radii.pill,
  },
  header: {
    gap: spacing.xxs,
  },
  card: {
    gap: spacing.sm,
  },
  rowTwoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    marginTop: spacing.xs,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: radii.pill,
  },
  strengthLabel: {
    marginLeft: spacing.xxs,
  },
  errorBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  submitBtn: {
    marginTop: spacing.xxs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxs + 2,
    marginTop: spacing.xxs,
  },
  underlineLink: {
    textDecorationLine: 'underline',
  },
});
