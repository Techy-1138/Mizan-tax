// ============================================================================
// Mizan (ميزان) - Offline Mode & Local Mutation Sync Queue
// Enables offline creation and editing with resilient FIFO sync playback
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { AppStorage } from './storage';
import { FirestoreService } from '../services/firestore.service';
import { MizanApi } from '../services/api';

export type MutationType =
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'CREATE_INVOICE'
  | 'UPDATE_BUSINESS'
  | 'UPDATE_PROFILE';

export interface QueuedMutation {
  id: string;
  type: MutationType;
  businessId?: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const STORAGE_KEY_OFFLINE_QUEUE = 'mizan_offline_sync_queue';
const MAX_RETRIES = 5;

type QueueListener = (queue: QueuedMutation[]) => void;
const listeners: Set<QueueListener> = new Set();

export class OfflineQueueService {
  private static cachedQueue: QueuedMutation[] | null = null;
  private static isSyncing = false;
  private static isOnline = true;

  /**
   * Loads the current offline queue from persistent storage
   */
  public static async getQueue(): Promise<QueuedMutation[]> {
    if (this.cachedQueue !== null) {
      return this.cachedQueue;
    }

    try {
      const raw = await AppStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE);
      if (raw) {
        this.cachedQueue = JSON.parse(raw);
      } else {
        this.cachedQueue = [];
      }
    } catch {
      this.cachedQueue = [];
    }

    return this.cachedQueue || [];
  }

  /**
   * Persists the queue to storage and notifies subscribers
   */
  private static async saveQueue(queue: QueuedMutation[]): Promise<void> {
    this.cachedQueue = queue;
    try {
      await AppStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (err) {
      console.warn('Failed to save offline queue to storage:', err);
    }
    this.notifyListeners(queue);
  }

  /**
   * Enqueues a new mutation to be synced
   */
  public static async enqueue(
    type: MutationType,
    payload: any,
    businessId?: string
  ): Promise<QueuedMutation> {
    const queue = await this.getQueue();
    const mutation: QueuedMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      businessId,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(mutation);
    await this.saveQueue(queue);

    // Try flushing immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.flushQueue().catch(() => {});
    }

    return mutation;
  }

  /**
   * Returns current count of pending offline mutations
   */
  public static async getPendingCount(): Promise<number> {
    const q = await this.getQueue();
    return q.length;
  }

  /**
   * Removes a specific mutation from the queue
   */
  public static async remove(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await this.saveQueue(filtered);
  }

  /**
   * Clears all items in the queue
   */
  public static async clear(): Promise<void> {
    await this.saveQueue([]);
  }

  /**
   * Subscribes to queue changes
   */
  public static subscribe(listener: QueueListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  private static notifyListeners(queue: QueuedMutation[]): void {
    listeners.forEach((listener) => {
      try {
        listener(queue);
      } catch (err) {
        console.warn('Error in offline queue listener:', err);
      }
    });
  }

  /**
   * Flushes and synchronizes all queued mutations sequentially
   */
  public static async flushQueue(): Promise<{ succeeded: number; failed: number }> {
    if (this.isSyncing) return { succeeded: 0, failed: 0 };
    this.isSyncing = true;

    const queue = await this.getQueue();
    if (queue.length === 0) {
      this.isSyncing = false;
      return { succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;
    const remainingQueue: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        await this.executeMutation(item);
        succeeded++;
      } catch (err: any) {
        console.warn(`Offline sync failed for item ${item.id} (${item.type}):`, err?.message || err);
        item.retryCount++;
        item.lastError = err?.message || 'Sync failed';

        if (item.retryCount < MAX_RETRIES) {
          remainingQueue.push(item);
        } else {
          console.error(`Mutation ${item.id} exceeded max retries and was abandoned.`);
        }
        failed++;
      }
    }

    await this.saveQueue(remainingQueue);
    this.isSyncing = false;
    return { succeeded, failed };
  }

  /**
   * Dispatches an individual mutation to appropriate service
   */
  private static async executeMutation(item: QueuedMutation): Promise<void> {
    switch (item.type) {
      case 'CREATE_EXPENSE': {
        const { businessId, payload } = item;
        if (businessId) {
          await FirestoreService.saveExpense(businessId, payload);
          try {
            await MizanApi.createManualExpense({
              businessId,
              supplierName: payload.merchantName || payload.supplierName,
              totalAmount: payload.amount || payload.totalAmount,
              expenseDate: payload.date || payload.expenseDate,
              category: payload.category,
              notes: payload.notes,
              isEntertainmentSplit: payload.isEntertainmentSplit,
            });
          } catch {}
        }
        break;
      }
      case 'UPDATE_EXPENSE': {
        const { payload } = item;
        if (payload?.id) {
          await MizanApi.updateExpense(payload.id, payload);
        }
        break;
      }
      case 'CREATE_INVOICE': {
        const { businessId, payload } = item;
        if (businessId) {
          await FirestoreService.saveInvoice(businessId, payload);
        }
        break;
      }
      case 'UPDATE_BUSINESS': {
        const { payload } = item;
        await FirestoreService.saveBusiness(payload);
        break;
      }
      default:
        console.warn('Unknown mutation type in offline queue:', item.type);
    }
  }

  public static setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online && !this.isSyncing) {
      this.flushQueue().catch(() => {});
    }
  }

  public static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public static getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

/**
 * Custom React Hook for accessing offline sync status and pending mutation count
 */
export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Initial load
    OfflineQueueService.getQueue().then((q) => {
      setPendingCount(q.length);
    });

    const unsubscribe = OfflineQueueService.subscribe((q) => {
      setPendingCount(q.length);
      setIsSyncing(OfflineQueueService.getIsSyncing());
      setIsOnline(OfflineQueueService.getOnlineStatus());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const flush = useCallback(async () => {
    setIsSyncing(true);
    const res = await OfflineQueueService.flushQueue();
    setIsSyncing(false);
    setLastSyncTime(new Date());
    return res;
  }, []);

  return {
    pendingCount,
    isSyncing,
    isOnline,
    lastSyncTime,
    flushQueue: flush,
  };
}
