// ============================================================================
// Mizan (ميزان) - Business Identity Normalization & Privacy Masking Utilities
// Ensures canonical UAE Trade License matching across formatting variations
// and masks owner email addresses before surfacing cross-tenant warnings.
// ============================================================================

/**
 * Normalizes a UAE Trade License number into a canonical uppercase alphanumeric key
 * so formatting differences (e.g. "CN-4829104", "cn 4829104", "CN4829104") map identically.
 */
export function normalizeTradeLicenseNumber(raw?: string | null): string {
  const trimmed = (raw || '').trim().toUpperCase();
  if (!trimmed) return '';
  const alphanumeric = trimmed.replace(/[^A-Z0-9]/g, '');
  return alphanumeric || trimmed;
}

/**
 * Masks an email address to protect the existing registrant's privacy while
 * allowing the original owner to recognize which account holds the entity.
 *
 * Example: "hitesh17@gmail.com" -> "hi****17@gmail.com"
 */
export function maskEmail(email?: string | null): string | null {
  const cleaned = (email || '').trim();
  const atIndex = cleaned.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === cleaned.length - 1) {
    return null;
  }

  const localPart = cleaned.slice(0, atIndex);
  const domainPart = cleaned.slice(atIndex + 1).toLowerCase();

  // Preserve 2 prefix + 2 suffix characters for local parts >= 5 chars;
  // degrade safely for shorter local parts without ever revealing the full string.
  let maskedLocal: string;
  if (localPart.length >= 5) {
    maskedLocal = `${localPart.slice(0, 2)}****${localPart.slice(-2)}`;
  } else if (localPart.length >= 3) {
    maskedLocal = `${localPart.slice(0, 1)}****${localPart.slice(-1)}`;
  } else {
    maskedLocal = `${localPart.slice(0, 1)}****`;
  }

  return `${maskedLocal}@${domainPart}`;
}

/**
 * Builds the canonical English warning message shown when another user
 * attempts to onboard an already registered UAE business entity.
 */
export function buildAlreadyRegisteredMessage(maskedEmail?: string | null): string {
  if (maskedEmail) {
    return `Entity is already registered with "${maskedEmail}".`;
  }
  return 'Entity is already registered with another account.';
}
