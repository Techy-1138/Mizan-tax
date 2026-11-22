// ============================================================================
// Mizan (ميزان) - Optimistic UI Mutation Helper
// Provides consistent snapshot, immediate UI update, server commit, and
// automatic rollback with user-friendly EN/AR error reporting.
// ============================================================================

import { getFriendlyErrorMessage } from './errorMessages';

export interface OptimisticMutationOptions<TSnapshot, TResult> {
  /** Captures state before the optimistic update so it can be restored on failure */
  snapshot: () => TSnapshot;
  /** Applies the immediate optimistic UI state */
  apply: () => void;
  /** Executes the real asynchronous backend/storage mutation */
  commit: () => Promise<TResult>;
  /** Restores state from the captured snapshot if `commit` rejects */
  rollback: (previous: TSnapshot) => void;
  /** Optional reconciliation hook run after `commit` resolves */
  onSuccess?: (result: TResult) => void | Promise<void>;
  /** Error callback receiving a friendly EN/AR message */
  onError?: (friendlyMessage: string) => void;
  /** Locale flag for friendly error translation */
  isRTL: boolean;
  /** Fallback EN error text */
  fallbackEn?: string;
  /** Fallback AR error text */
  fallbackAr?: string;
}

/**
 * Generates a temporary client-side ID for optimistic list items prior to server reconciliation.
 */
export function createOptimisticId(prefix: string = 'temp'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Returns true if an entity ID is still an unconfirmed client-side optimistic placeholder.
 */
export function isOptimisticId(id?: string | null): boolean {
  return typeof id === 'string' && id.startsWith('temp-');
}

/**
 * Executes an optimistic UI mutation with guaranteed rollback on failure.
 */
export async function runOptimisticMutation<TSnapshot, TResult>({
  snapshot,
  apply,
  commit,
  rollback,
  onSuccess,
  onError,
  isRTL,
  fallbackEn,
  fallbackAr,
}: OptimisticMutationOptions<TSnapshot, TResult>): Promise<TResult | undefined> {
  const previous = snapshot();
  apply();

  try {
    const result = await commit();
    if (onSuccess) {
      await onSuccess(result);
    }
    return result;
  } catch (err: any) {
    rollback(previous);
    onError?.(getFriendlyErrorMessage(err, isRTL, fallbackEn, fallbackAr));
    return undefined;
  }
}
