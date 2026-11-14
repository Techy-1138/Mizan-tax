// ============================================================================
// Mizan (ميزان) - Root Expo Router Layout
// Integrates ThemeProvider, SafeAreaProvider, LocaleProvider, QueryClientProvider, and System Chrome
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { LocaleProvider } from '../src/context/LocaleContext';
import { BusinessProvider } from '../src/context/BusinessContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { AppPreferences } from '../src/utils/preferences';

/**
 * Inner navigation shell consuming ThemeContext so StatusBar and root canvas
 * synchronize instantaneously with Light/Dark/System updates.
 */
function ThemedStackShell({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.neutral.canvas }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </GestureHandlerRootView>
  );
}

/**
 * Stack navigator consuming active theme canvas color to prevent white route flashes.
 */
function ThemedNavigator() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        animationDuration: 280,
        contentStyle: { backgroundColor: colors.neutral.canvas },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="auth/login"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="auth/register"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="onboarding/business"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false, // Disallow gesture back to prevent skipping
        }}
      />

      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      {/* Full-screen Scanner / Camera Screens */}
      <Stack.Screen
        name="scan/index"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="expenses/scan"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
          gestureEnabled: true,
        }}
      />

      {/* Modal Task Flows */}
      <Stack.Screen
        name="invoices/new"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />

      {/* Detail & Audit Review Screens */}
      <Stack.Screen
        name="scan/review"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="scan/readiness"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="scan/report"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="expenses/review"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="learn/chat"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  // Preload Modernist Neo-Khaleeji typography assets with fail-safe fallback
  // Outfit (Display) | DM Sans (UI/Body) | Cairo (Arabic) | DM Mono (Financials & TRN)
  const [fontsLoaded, fontError] = useFonts({
    'Cairo-Regular': require('../assets/fonts/Cairo-Regular.ttf'),
    'Cairo-Medium': require('../assets/fonts/Cairo-Medium.ttf'),
    'Cairo-SemiBold': require('../assets/fonts/Cairo-SemiBold.ttf'),
    'Cairo-Bold': require('../assets/fonts/Cairo-Bold.ttf'),
    'DMMono-Regular': require('../assets/fonts/DMMono-Regular.ttf'),
    'DMMono-Medium': require('../assets/fonts/DMMono-Medium.ttf'),
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
    'Outfit-Medium': require('../assets/fonts/Outfit-Medium.ttf'),
    'Outfit-SemiBold': require('../assets/fonts/Outfit-SemiBold.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  const [fontTimeoutElapsed, setFontTimeoutElapsed] = useState(false);

  useEffect(() => {
    // 3-second hard timeout so cold start is never blocked if font loading stalls
    const timer = setTimeout(() => {
      setFontTimeoutElapsed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Initialize preferences cache asynchronously on launch
    AppPreferences.init().catch(() => {});
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes cache
            retry: 2,
          },
        },
      })
  );

  // Brief flash prevention while fonts hydrate, unblocked immediately on timeout or error
  if (!fontsLoaded && !fontTimeoutElapsed && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedStackShell>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <LocaleProvider>
              <BusinessProvider>
                <ThemedNavigator />
              </BusinessProvider>
            </LocaleProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ThemedStackShell>
    </ThemeProvider>
  );
}
