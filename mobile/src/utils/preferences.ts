// ============================================================================
// Mizan (ميزان) - User & Device App Preferences Service
// Controls Global Haptic Feedback and Camera Shutter Sound
// Both settings default to OFF (false) per user specifications
// ============================================================================

import * as Haptics from 'expo-haptics';
import { AppStorage } from './storage';
import type { ThemeMode } from '../theme/tokens';

export const STORAGE_KEY_APP_PREFERENCES = 'mizan_app_preferences';

export interface AppPreferencesState {
  hapticsEnabled: boolean;
  shutterSoundEnabled: boolean;
  /**
   * User appearance preference: 'system' follows OS Light/Dark, or explicit override.
   */
  themeMode: ThemeMode;
}

// Default preferences: Haptics & Shutter Sound OFF; Theme follows device OS ('system')
const DEFAULT_PREFERENCES: AppPreferencesState = {
  hapticsEnabled: false,
  shutterSoundEnabled: false,
  themeMode: 'system',
};

// In-memory cache for synchronous zero-latency lookups across UI interactions
let cachedPreferences: AppPreferencesState = { ...DEFAULT_PREFERENCES };
let isInitialized = false;

export class AppPreferences {
  /**
   * Initializes preferences from persistent storage on app startup
   */
  public static async init(): Promise<AppPreferencesState> {
    if (isInitialized) return cachedPreferences;
    try {
      const stored = await AppStorage.getItem(STORAGE_KEY_APP_PREFERENCES);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validTheme: ThemeMode =
          parsed.themeMode === 'light' || parsed.themeMode === 'dark' || parsed.themeMode === 'system'
            ? parsed.themeMode
            : 'system';
        cachedPreferences = {
          hapticsEnabled: parsed.hapticsEnabled === true,
          shutterSoundEnabled: parsed.shutterSoundEnabled === true,
          themeMode: validTheme,
        };
      } else {
        cachedPreferences = { ...DEFAULT_PREFERENCES };
      }
    } catch {
      cachedPreferences = { ...DEFAULT_PREFERENCES };
    }
    isInitialized = true;
    return cachedPreferences;
  }

  /**
   * Returns current preferences state synchronously from in-memory cache
   */
  public static get(): AppPreferencesState {
    return cachedPreferences;
  }

  /**
   * Checks whether haptics are enabled
   */
  public static isHapticsEnabled(): boolean {
    return cachedPreferences.hapticsEnabled;
  }

  /**
   * Checks whether camera shutter sound is enabled
   */
  public static isShutterSoundEnabled(): boolean {
    return cachedPreferences.shutterSoundEnabled;
  }

  /**
   * Returns the persisted theme mode ('system' | 'light' | 'dark') synchronously
   */
  public static getThemeMode(): ThemeMode {
    return cachedPreferences.themeMode;
  }

  /**
   * Updates and persists preferences
   */
  public static async update(partial: Partial<AppPreferencesState>): Promise<AppPreferencesState> {
    cachedPreferences = {
      ...cachedPreferences,
      ...partial,
    };
    await AppStorage.setItem(STORAGE_KEY_APP_PREFERENCES, JSON.stringify(cachedPreferences));
    return cachedPreferences;
  }

  /**
   * Safe Haptics trigger: Only triggers physical device vibration if explicitly enabled in preferences
   */
  public static selection(): void {
    if (cachedPreferences.hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {});
    }
  }

  /**
   * Safe notification haptics: Only triggers if haptics are enabled
   */
  public static notification(type: Haptics.NotificationFeedbackType): void {
    if (cachedPreferences.hapticsEnabled) {
      Haptics.notificationAsync(type).catch(() => {});
    }
  }

  /**
   * Safe impact haptics: Only triggers if haptics are enabled
   */
  public static impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium): void {
    if (cachedPreferences.hapticsEnabled) {
      Haptics.impactAsync(style).catch(() => {});
    }
  }
}

// Automatically kick off background initialization
AppPreferences.init().catch(() => {});
