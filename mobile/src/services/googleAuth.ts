// ============================================================================
// Mizan (ميزان) - Safe Lazy Google Sign-In Service
// Prevents Expo Go / Web startup crashes from TurboModuleRegistry.getEnforcing
// while preserving native 1-Tap Google Sign-In in custom Dev Builds & APKs.
// ============================================================================

import { Platform, TurboModuleRegistry } from 'react-native';
import {
  auth,
  GoogleAuthProvider,
  signInWithCredential,
} from './firebase';

// Type-only reference preserves strict TypeScript validation without triggering
// the package's top-level TurboModuleRegistry.getEnforcing('RNGoogleSignin') call.
type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

const GOOGLE_WEB_CLIENT_ID =
  '665284372832-ktbs8le1749cpa9edgd7tilbjf76o060.apps.googleusercontent.com';

let cachedGoogleModule: GoogleSignInModule | null | undefined;
let isConfigured = false;

/**
 * Checks non-enforcing native registry before requiring the Google Sign-In module.
 * Expo Go and Web lack the native `RNGoogleSignin` TurboModule, so eager imports throw
 * synchronously during Expo Router route tree scanning.
 */
export function isGoogleSignInSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return TurboModuleRegistry.get('RNGoogleSignin') != null;
}

/**
 * Lazily loads `@react-native-google-signin/google-signin` only when `RNGoogleSignin`
 * is actually linked in the active native binary.
 */
function getGoogleSignInModule(): GoogleSignInModule | null {
  if (cachedGoogleModule !== undefined) {
    return cachedGoogleModule;
  }
  if (!isGoogleSignInSupported()) {
    cachedGoogleModule = null;
    return null;
  }
  try {
    // Dynamic CommonJS require keeps static route imports free of native side effects.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedGoogleModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    cachedGoogleModule = null;
  }
  return cachedGoogleModule;
}

/**
 * Configures native Google Sign-In once on screens that expose the Google CTA.
 * No-ops silently in Expo Go or Web so mount effects never throw.
 */
export function configureGoogleSignIn(): boolean {
  const mod = getGoogleSignInModule();
  if (!mod) return false;
  if (isConfigured) return true;

  try {
    mod.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });
    isConfigured = true;
    return true;
  } catch (e: any) {
    console.warn('Google Sign-in configuration warning:', e?.message || e);
    return false;
  }
}

export type GoogleSignInOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

/**
 * Shared 1-Tap Google Sign-In + Firebase Auth credential linking workflow used by
 * both Login and Register screens.
 */
export async function performGoogleSignIn(isRTL: boolean): Promise<GoogleSignInOutcome> {
  const mod = getGoogleSignInModule();
  if (!mod) {
    return {
      status: 'unavailable',
      message: isRTL
        ? 'تسجيل الدخول عبر Google يتطلب نسخة APK / Dev Build ولا يتوفر داخل Expo Go. يرجى استخدام البريد الإلكتروني وكلمة المرور.'
        : 'Google Sign-In requires a native Dev Build or APK and is unavailable in Expo Go. Please use Email & Password instead.',
    };
  }

  configureGoogleSignIn();

  try {
    await mod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await mod.GoogleSignin.signIn();
    const idToken = (response as any)?.data?.idToken || (response as any)?.idToken;
    if (!idToken) {
      throw new Error('Could not retrieve Google ID token.');
    }

    // Exchange native Google ID token for an authenticated Firebase user session
    const credential = GoogleAuthProvider.credential(idToken);
    await signInWithCredential(auth, credential);
    return { status: 'success' };
  } catch (error: any) {
    const codes = mod.statusCodes;
    if (error?.code === codes?.SIGN_IN_CANCELLED || error?.code === codes?.IN_PROGRESS) {
      return { status: 'cancelled' };
    }
    if (error?.code === codes?.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        status: 'error',
        message: isRTL
          ? 'خدمات Google Play غير متوفرة أو قديمة على هذا الجهاز.'
          : 'Google Play Services not available or outdated on this device.',
      };
    }
    return {
      status: 'error',
      message:
        error?.message ||
        (isRTL ? 'فشل تسجيل الدخول باستخدام Google' : 'Google sign-in failed. Please try again.'),
    };
  }
}
