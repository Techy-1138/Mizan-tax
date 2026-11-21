// ============================================================================
// Mizan (ميزان) - Monochrome 5-Tab Bottom Navigator
// Tabs: Home, Books, Invoices, Tax, Profile with 1px top hairline border.
// ============================================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { borders, getFont } from '../../src/theme/tokens';

/**
 * Monochrome tab navigator for authenticated core workspaces.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const labelFont = getFont('medium', isRTL, false);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.neutral.textMuted,
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          backgroundColor: colors.neutral.surface,
          borderTopColor: colors.neutral.border,
          borderTopWidth: borders.hairline,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: labelFont.fontFamily,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isRTL ? 'الرئيسية' : 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: isRTL ? 'الدفاتر' : 'Books',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: isRTL ? 'الفواتير' : 'Invoices',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: isRTL ? 'الضرائب' : 'Tax',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isRTL ? 'الحساب' : 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
