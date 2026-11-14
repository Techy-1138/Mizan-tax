// ============================================================================
// Mizan (ميزان) - Production Login Screen
// Clean FinTech styling with UAE bilingual localization and secure authentication
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors, ThemeShadows, radii, spacing } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import {
  configureGoogleSignIn,
  performGoogleSignIn,
} from '../../src/services/googleAuth';
import { AppPreferences } from '../../src/utils/preferences';

export default function LoginScreen() {
  const router = useRouter();
  const { locale, toggleLocale, isRTL } = useLocale();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { refreshBusinesses } = useBusiness();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Safely configure native Google Sign-in only when RNGoogleSignin is linked (skips Expo Go cleanly)
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const getFirebaseAuthErrorMessage = (code: string, isRTL: boolean): string => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Incorrect email address or password.';
      case 'auth/too-many-requests':
        return isRTL
          ? 'تم تعليق الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة لاحقاً أو إعادة تعيين كلمة المرور.'
          : 'Access temporarily blocked due to multiple failed attempts. Please reset password or try again later.';
      case 'auth/invalid-email':
        return isRTL ? 'صيغة البريد الإلكتروني غير صحيحة' : 'The email address is not valid.';
      case 'auth/network-request-failed':
        return isRTL ? 'فشل الاتصال بالإنترنت. يرجى التحقق من الشبكة.' : 'Network connection error. Please verify your connection.';
      default:
        return '';
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert(
        isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password',
        isRTL
          ? 'يرجى كتابة بريدك الإلكتروني في الحقل أعلاه أولاً.'
          : 'Please enter your email address in the field above first.'
      );
      return;
    }

    try {
      setIsLoading(true);
      await MizanApi.sendPasswordReset(email.trim());
      Alert.alert(
        isRTL ? 'تم الإرسال بنجاح' : 'Reset Link Sent',
        isRTL
          ? `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email.trim()}. تفقد بريدك الوارد.`
          : `A password reset link has been sent to ${email.trim()}. Please check your inbox or spam folder.`
      );
    } catch (err: any) {
      const friendlyMsg = getFirebaseAuthErrorMessage(err?.code || '', isRTL);
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        friendlyMsg || err?.message || (isRTL ? 'تعذر إرسال الرابط. تحقق من بريدك.' : 'Failed to send reset link.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage(isRTL ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter your email and password');
      AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      await MizanApi.login({
        email: email.trim(),
        password,
      });

      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      await refreshBusinesses();
      const existing = await MizanApi.getBusinesses().catch(() => []);
      if (existing && existing.length > 0) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/business');
      }
    } catch (err: any) {
      AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
      const friendlyMsg = getFirebaseAuthErrorMessage(err?.code || '', isRTL);
      setErrorMessage(
        friendlyMsg || err?.message || (isRTL ? 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.' : 'Login failed. Please check your credentials.')
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initiates 1-Tap native Google Sign-in flow and links with Firebase Authentication
   */
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMessage(null);

      // Delegate native module guard, Google flow, and Firebase credential swap to shared helper
      const outcome = await performGoogleSignIn(isRTL);
      if (outcome.status === 'cancelled') {
        return;
      }
      if (outcome.status === 'unavailable' || outcome.status === 'error') {
        setErrorMessage(outcome.message);
        AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
        return;
      }

      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      await refreshBusinesses();
      const existing = await MizanApi.getBusinesses().catch(() => []);
      if (existing && existing.length > 0) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/business');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Language Switcher */}
          <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.brandLogoBox}>
                <View style={styles.logoSlantBar1} />
                <View style={styles.logoSlantBar2} />
              </View>
              <Text style={styles.brandTitle}>Mizan ميزان</Text>
            </View>

            <TouchableOpacity
              style={styles.langBtn}
              onPress={toggleLocale}
              activeOpacity={0.7}
            >
              <Ionicons name="language-outline" size={16} color={colors.neutral.textPrimary} />
              <Text style={styles.langBtnText}>
                {locale === 'en' ? 'العربية' : 'English'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <View style={[styles.headerSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.heading, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL ? 'مرحباً بك مجدداً' : 'Welcome back'}
            </Text>
            <Text style={[styles.subheading, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isRTL
                ? 'سجّل الدخول للوصول إلى بيانات شركتك وامتثالك الضريبي في الإمارات.'
                : 'Sign in to access your UAE tax compliance & financial intelligence.'}
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="alert-circle" size={20} color={colors.semantic.risk} />
              <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Input Fields */}
          <View style={styles.formCard}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'البريد الإلكتروني' : 'Email address'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={isRTL ? 'name@company.ae' : 'name@company.ae'}
                  placeholderTextColor={colors.neutral.textTertiary}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'كلمة المرور' : 'Password'}
              </Text>
              <View style={[styles.inputWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.neutral.textTertiary}
                  style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }}
                />
                <TextInput
                  style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral.textTertiary}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.neutral.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', marginBottom: spacing.md }}>
              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand.primary }}>
                  {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRTL ? 'تسجيل الدخول' : 'Sign in'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Social Login Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{isRTL ? 'أو' : 'OR'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 1-Tap Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.85}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.neutral.textPrimary} size="small" />
              ) : (
                <View style={[styles.googleButtonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginHorizontal: 8 }} />
                  <Text style={styles.googleButtonText}>
                    {isRTL ? 'المتابعة باستخدام Google' : 'Continue with Google'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch to Register */}
          <View style={[styles.footerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.footerText}>
              {isRTL ? 'ليس لديك حساب بعد؟' : "Don't have an account yet?"}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/auth/register')}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}>
                {isRTL ? ' إنشاء حساب جديد' : ' Create an account'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security & Regulatory Badge */}
          <View style={styles.securityBadgeRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.semantic.success} />
            <Text style={styles.securityBadgeText}>
              {isRTL
                ? 'متوافق مع الهيئة الاتحادية للضرائب • تشفير مصرفي 256-bit'
                : 'FTA Statutory Engine Grounded • 256-Bit Bank Grade Encryption'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean, shadows: ThemeShadows) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.neutral.canvas,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      justifyContent: 'center',
    },
    topBar: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    brandRow: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    brandLogoBox: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: colors.brand.primary,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    logoSlantBar1: {
      position: 'absolute',
      width: 3,
      height: 18,
      backgroundColor: colors.neutral.onPrimary,
      transform: [{ rotate: '25deg' }],
      left: 11,
    },
    logoSlantBar2: {
      position: 'absolute',
      width: 3,
      height: 18,
      backgroundColor: colors.neutral.onPrimary,
      transform: [{ rotate: '25deg' }],
      right: 11,
    },
    brandTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.neutral.textPrimary,
      letterSpacing: -0.3,
    },
    langBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.full,
      backgroundColor: colors.neutral.surface,
      borderWidth: 1,
      borderColor: colors.neutral.border,
    },
    langBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.neutral.textPrimary,
    },
    headerSection: {
      marginBottom: spacing.lg,
    },
    heading: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.neutral.textPrimary,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subheading: {
      fontSize: 14,
      color: colors.neutral.textSecondary,
      lineHeight: 20,
    },
    errorBanner: {
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.semantic.riskBg,
      borderColor: colors.semantic.riskBorder,
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      color: colors.semantic.riskText,
      fontWeight: '500',
    },
    formCard: {
      backgroundColor: colors.neutral.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.neutral.border,
      ...shadows.card,
    },
    inputGroup: {
      marginBottom: spacing.md,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.neutral.textPrimary,
      marginBottom: 6,
    },
    inputWrapper: {
      alignItems: 'center',
      backgroundColor: colors.neutral.surfaceInset,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.neutral.border,
      paddingHorizontal: spacing.md,
      height: 48,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.neutral.textPrimary,
      height: '100%',
    },
    eyeBtn: {
      padding: 6,
    },
    primaryButton: {
      backgroundColor: colors.brand.primary,
      borderRadius: radii.md,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
      ...shadows.sm,
    },
    buttonDisabled: {
      opacity: 0.65,
    },
    primaryButtonText: {
      color: colors.neutral.onPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.neutral.border,
    },
    dividerText: {
      paddingHorizontal: spacing.sm,
      fontSize: 12,
      fontWeight: '600',
      color: colors.neutral.textTertiary,
    },
    googleButton: {
      backgroundColor: colors.neutral.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.neutral.borderStrong,
      borderRadius: radii.md,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    googleButtonContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.neutral.textPrimary,
    },
    footerRow: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
      gap: 4,
    },
    footerText: {
      fontSize: 14,
      color: colors.neutral.textSecondary,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brand.primary,
    },
    securityBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.lg,
    },
    securityBadgeText: {
      fontSize: 11,
      color: colors.neutral.textTertiary,
      fontWeight: '500',
    },
  });
