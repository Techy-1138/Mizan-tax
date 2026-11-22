// ============================================================================
// Mizan (ميزان) - Auth & Business Gatekeeper (Screen 1A)
// Resolves Firebase Auth session -> syncs token -> checks registered businesses
// -> routes to /auth/login, /onboarding/business, or /(tabs).
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRootNavigationState, useRouter } from 'expo-router';
import { auth, onAuthStateChanged } from '../src/services/firebase';
import { MizanApi } from '../src/services/api';
import { useTheme } from '../src/context/ThemeContext';
import { useLocale } from '../src/context/LocaleContext';
import { borders, radii, spacing } from '../src/theme/tokens';
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

  // Render the full-screen monochrome wavy splash screen while resolving auth & entities
  if (!error) {
    return (
      <View style={styles.splashRoot}>
        <StatusBar style="light" />
        <Image
          source={require('../assets/splash-full.jpg')}
          style={styles.splashArtwork}
          resizeMode="cover"
        />
        {checking ? (
          <View style={styles.splashStatus}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <AppText variant="caption" style={styles.splashStatusText}>
              {isRTL ? 'جارٍ التحقق من الجلسة...' : 'Verifying workspace session...'}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <View
        style={[
          styles.mark,
          { backgroundColor: '#000000', borderColor: colors.neutral.border },
        ]}
      >
        <Image
          source={require('../assets/brand-mark.png')}
          style={styles.markImage}
          resizeMode="contain"
        />
      </View>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  splashArtwork: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  splashStatus: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxl * 1.5,
  },
  splashStatusText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
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
    borderWidth: borders.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markImage: {
    width: 36,
    height: 36,
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
