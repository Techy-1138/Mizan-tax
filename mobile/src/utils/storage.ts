// ============================================================================
// Mizan (ميزان) - Client Persistence Storage Utility
// Universal storage adapter using AsyncStorage with graceful in-memory fallback
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

export const AppStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) {
        memoryStore.set(key, val);
        return val;
      }
    } catch {
      // Fallback to memory store if native storage is unavailable
    }
    return memoryStore.get(key) || null;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Memory store already set
    }
  },

  removeItem: async (key: string): Promise<void> => {
    memoryStore.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Memory store already cleared
    }
  },

  /**
   * Removes all persisted keys starting with `prefix` (used on logout to purge
   * per-entity SWR caches and prevent cross-account cache bleed).
   */
  removeByPrefix: async (prefix: string): Promise<void> => {
    for (const key of Array.from(memoryStore.keys())) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const matching = allKeys.filter((k) => k.startsWith(prefix));
      if (matching.length > 0) {
        await AsyncStorage.multiRemove(matching);
      }
    } catch {
      // Memory store keys already purged
    }
  },

  clear: async (): Promise<void> => {
    memoryStore.clear();
    try {
      await AsyncStorage.clear();
    } catch {
      // Memory cleared
    }
  },
};
