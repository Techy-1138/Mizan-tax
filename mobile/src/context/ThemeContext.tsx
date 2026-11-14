// ============================================================================
// Mizan (ميزان) - Dynamic Theme Context & Style Hydration Engine
// Supports 'system' (device OS), 'light', and 'dark' appearance modes
// Persists user choice via AppPreferences and syncs native root SystemUI
// ============================================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { ImageStyle, TextStyle, ViewStyle, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as Haptics from 'expo-haptics';
import {
  ThemeColors,
  ThemeMode,
  ThemeShadows,
  ResolvedTheme,
  getThemeColors,
  getThemeShadows,
  lightColors,
  lightShadows,
} from '../theme/tokens';
import { AppPreferences } from '../utils/preferences';

export interface ThemeContextValue {
  /** User-selected mode ('system' | 'light' | 'dark') */
  themeMode: ThemeMode;
  /** Effective resolved color scheme ('light' | 'dark') */
  resolvedTheme: ResolvedTheme;
  /** Convenience boolean: true when resolvedTheme === 'dark' */
  isDark: boolean;
  /** Active color palette for current theme */
  colors: ThemeColors;
  /** Active elevation/shadow tokens for current theme */
  shadows: ThemeShadows;
  /** True once AppPreferences storage hydration has completed */
  isThemeReady: boolean;
  /** Update and persist user theme preference */
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  /** Cycle or toggle between light and dark directly */
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  resolvedTheme: 'light',
  isDark: false,
  colors: lightColors,
  shadows: lightShadows,
  isThemeReady: false,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Subscribe to OS-level appearance changes (returns 'light' | 'dark' | null/undefined)
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(AppPreferences.getThemeMode());
  const [isThemeReady, setIsThemeReady] = useState<boolean>(false);

  // Hydrate persisted theme mode on cold start before rendering main UI
  useEffect(() => {
    let mounted = true;
    AppPreferences.init()
      .then((prefs) => {
        if (mounted) {
          setThemeModeState(prefs.themeMode || 'system');
          setIsThemeReady(true);
        }
      })
      .catch(() => {
        if (mounted) setIsThemeReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Resolve effective light/dark scheme from explicit override or OS preference
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (themeMode === 'light' || themeMode === 'dark') {
      return themeMode;
    }
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }, [themeMode, systemColorScheme]);

  const isDark = resolvedTheme === 'dark';
  const colors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);
  const shadows = useMemo(() => getThemeShadows(resolvedTheme), [resolvedTheme]);

  // Synchronize native Android/iOS root window background so transitions & modal openings never flash white
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.neutral.canvas).catch(() => {});
  }, [colors.neutral.canvas]);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    await AppPreferences.update({ themeMode: mode });
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    await setThemeMode(next);
  }, [resolvedTheme, setThemeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      resolvedTheme,
      isDark,
      colors,
      shadows,
      isThemeReady,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, resolvedTheme, isDark, colors, shadows, isThemeReady, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Primary hook for accessing active theme colors, shadows, and mode toggles.
 */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

// Structural style map equivalent to RN NamedStyles for strict type inference
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Memoized StyleSheet generator hook for screens and components.
 * Re-creates StyleSheet instances only when the resolved theme changes.
 */
export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: ThemeColors, isDark: boolean, shadows: ThemeShadows) => T
): T {
  const { colors, isDark, shadows } = useTheme();
  return useMemo(() => factory(colors, isDark, shadows), [factory, colors, isDark, shadows]);
}
