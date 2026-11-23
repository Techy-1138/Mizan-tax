// ============================================================================
// Mizan (ميزان) - Friendly User-Facing Error Mapper
// Translates Firebase Auth codes and raw network/runtime errors into clean,
// human-readable EN/AR messages without exposing technical error codes.
// ============================================================================

const AUTH_ERROR_MAP: Record<string, { en: string; ar: string }> = {
  'auth/invalid-credential': {
    en: 'Incorrect email or password. Please try again.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',
  },
  'auth/wrong-password': {
    en: 'Incorrect password. Please try again.',
    ar: 'كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.',
  },
  'auth/user-not-found': {
    en: 'No account found with this email address.',
    ar: 'لا يوجد حساب مسجل بهذا البريد الإلكتروني.',
  },
  'auth/invalid-email': {
    en: 'Please enter a valid email address.',
    ar: 'يرجى إدخال بريد إلكتروني صحيح.',
  },
  'auth/user-disabled': {
    en: 'This account has been disabled. Contact support.',
    ar: 'تم تعطيل هذا الحساب. يرجى التواصل مع الدعم.',
  },
  'auth/email-already-in-use': {
    en: 'This email is already registered. Try signing in instead.',
    ar: 'هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول.',
  },
  'auth/weak-password': {
    en: 'Password is too weak. Use at least 8 characters.',
    ar: 'كلمة المرور ضعيفة جداً. استخدم 8 أحرف على الأقل.',
  },
  'auth/too-many-requests': {
    en: 'Too many attempts. Please wait a moment and try again.',
    ar: 'محاولات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
  },
  'auth/network-request-failed': {
    en: 'Network error. Please check your internet connection.',
    ar: 'خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.',
  },
};

/**
 * Converts a raw Firebase, network, or backend error into a clean EN/AR message.
 */
export function getFriendlyErrorMessage(
  err: any,
  isRTL: boolean,
  fallbackEn = 'Something went wrong. Please try again.',
  fallbackAr = 'حدث خطأ ما. يرجى المحاولة مرة أخرى.'
): string {
  const rawMessage = typeof err?.message === 'string' ? err.message : '';
  const directCode = typeof err?.code === 'string' ? err.code : '';
  const embeddedMatch = rawMessage.match(/\((auth\/[a-z0-9-]+)\)/i);
  const authCode = (directCode || embeddedMatch?.[1] || '').toLowerCase();

  if (authCode && AUTH_ERROR_MAP[authCode]) {
    return isRTL ? AUTH_ERROR_MAP[authCode].ar : AUTH_ERROR_MAP[authCode].en;
  }

  // Never leak raw Firebase, TypeError, fetch stack strings, or upstream JSON error payloads to users
  if (
    !rawMessage ||
    rawMessage.includes('Firebase:') ||
    rawMessage.includes('auth/') ||
    rawMessage.includes('Network request failed') ||
    rawMessage.includes('TypeError') ||
    rawMessage.includes('Trade license extraction notice') ||
    rawMessage.includes('NOT_FOUND') ||
    rawMessage.includes('"error"') ||
    rawMessage.trim().startsWith('{')
  ) {
    return isRTL ? fallbackAr : fallbackEn;
  }

  return rawMessage;
}
