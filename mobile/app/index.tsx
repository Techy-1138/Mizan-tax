// ============================================================================
// Mizan (ميزان) - Auth & Business Gatekeeper (Screen 1A)
// Resolves Firebase Auth session -> syncs token -> checks registered businesses
// -> routes to /auth/login, /onboarding/business, or /(tabs).
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRootNavigationState, useRouter } from 'expo-router';
import { auth, onAuthStateChanged } from '../src/services/firebase';
import { MizanApi } from '../src/services/api';
import { useTheme } from '../src/context/ThemeContext';
import { useLocale } from '../src/context/LocaleContext';
import { radii, spacing } from '../src/theme/tokens';
import { AppText, Button, Card, Screen } from '../src/ui';

/**
 * Monochrome Gatekeeper resolving initial session and entity state.
 */
export default function GatekeeperScreen() {
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const { colors } = useTheme();
  const { isRTL } = useLocale();

  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const resolveDestination = useCallback(async () => {
    setError(null);
    setChecking(true);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace('/auth/login');
      return;
    }

    try {
      // Refresh Firebase ID token so backend requests are authorized
      const idToken = await currentUser.getIdToken();
      MizanApi.setAuthToken(idToken);

      // Check whether the user already has at least one UAE business entity
      const businesses = await MizanApi.getBusinesses();
      if (Array.isArray(businesses) && businesses.length > 0) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding/business');
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL
            ? 'تعذر التحقق من الجلسة. يرجى المحاولة مرة أخرى.'
            : 'Unable to verify your session. Please check your connection and retry.')
      );
      setChecking(false);
    }
  }, [isRTL, router]);

  useEffect(() => {
    // Wait until Expo Router's root navigator is mounted before redirecting
    if (!rootNavState?.key) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      resolveDestination();
    });

    return () => unsubscribe();
  }, [rootNavState?.key, resolveDestination, router]);

  return (
    <Screen contentContainerStyle={styles.container}>
      <View
        style={[
          styles.mark,
          { backgroundColor: colors.brand.primary },
        ]}
      >
        <AppText variant="h1" tone="inverted">
          م
        </AppText>
      </View>

      {checking && !error ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.neutral.textPrimary} />
          <AppText variant="bodySmall" tone="secondary">
            {isRTL ? 'جارٍ التحقق من الجلسة...' : 'Verifying workspace session...'}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <Card style={styles.errorCard}>
          <AppText variant="h3">
            {isRTL ? 'تعذر الاتصال' : 'Connection Issue'}
          </AppText>
          <AppText variant="bodySmall" tone="secondary">
            {error}
          </AppText>
          <View style={styles.errorActions}>
            <Button
              label={isRTL ? 'إعادة المحاولة' : 'Retry'}
              variant="primary"
              onPress={resolveDestination}
            />
            <Button
              label={isRTL ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}
              variant="outline"
              onPress={() => router.replace('/auth/login')}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorCard: {
    width: '100%',
    gap: spacing.sm,
  },
  errorActions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
