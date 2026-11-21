// ============================================================================
// Mizan (ميزان) - Root Expo Router Layout
// Preloads bundled EN (Outfit/DM Sans), AR (Cairo), and Mono (DM Mono) fonts
// and wraps the app in QueryClientProvider, ThemeProvider, LocaleProvider,
// and BusinessProvider.
// ============================================================================

import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { LocaleProvider } from '../src/context/LocaleContext';
import { BusinessProvider } from '../src/context/BusinessContext';
import { fontNames } from '../src/theme/tokens';

/**
 * Inner navigation shell consuming active monochrome theme for StatusBar & canvas.
 */
function ThemedShell() {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.neutral.canvas }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.neutral.canvas },
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/login" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="onboarding/business" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="learn/chat" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="readiness/index" />
      </Stack>
    </GestureHandlerRootView>
  );
}

/**
 * Root layout preloading fonts and initializing global providers.
 */
export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      })
  );

  // Preload all 13 bundled font assets mapped to tokens.ts fontNames
  const [fontsLoaded] = useFonts({
    [fontNames.outfitBold]: require('../assets/fonts/Outfit-Bold.ttf'),
    [fontNames.outfitSemiBold]: require('../assets/fonts/Outfit-SemiBold.ttf'),
    [fontNames.outfitMedium]: require('../assets/fonts/Outfit-Medium.ttf'),
    [fontNames.dmSansBold]: require('../assets/fonts/DMSans-Bold.ttf'),
    [fontNames.dmSansSemiBold]: require('../assets/fonts/DMSans-SemiBold.ttf'),
    [fontNames.dmSansMedium]: require('../assets/fonts/DMSans-Medium.ttf'),
    [fontNames.dmSansRegular]: require('../assets/fonts/DMSans-Regular.ttf'),
    [fontNames.cairoBold]: require('../assets/fonts/Cairo-Bold.ttf'),
    [fontNames.cairoSemiBold]: require('../assets/fonts/Cairo-SemiBold.ttf'),
    [fontNames.cairoMedium]: require('../assets/fonts/Cairo-Medium.ttf'),
    [fontNames.cairoRegular]: require('../assets/fonts/Cairo-Regular.ttf'),
    [fontNames.dmMonoMedium]: require('../assets/fonts/DMMono-Medium.ttf'),
    [fontNames.dmMonoRegular]: require('../assets/fonts/DMMono-Regular.ttf'),
  });

  // Defer rendering until fonts are ready to prevent layout shift
  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LocaleProvider>
            <BusinessProvider>
              <ThemedShell />
            </BusinessProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
