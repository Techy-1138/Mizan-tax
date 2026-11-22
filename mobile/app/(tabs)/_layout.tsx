// ============================================================================
// Mizan (ميزان) - Monochrome 5-Tab Bottom Navigator (With Smooth Transitions)
// Tabs: Home, Books, Invoices, Tax, Profile with 1px top hairline border,
// cross-fade scene transition, and Reanimated spring tab-icon focus animation.
// ============================================================================

import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { borders, getFont } from '../../src/theme/tokens';
import { getEnterTiming, motionDurations, motionSprings } from '../../src/motion/tokens';

interface AnimatedTabIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
}

/**
 * Animates tab icon scale and vertical lift on focus using UI-thread Reanimated springs.
 */
function AnimatedTabIcon({ name, color, focused }: AnimatedTabIconProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(focused ? 1 : 0.94);
  const translateY = useSharedValue(focused ? -1 : 0);
  const opacity = useSharedValue(focused ? 1 : 0.78);

  useEffect(() => {
    if (reduceMotion) {
      scale.value = 1;
      translateY.value = 0;
      opacity.value = 1;
      return;
    }
    scale.value = withSpring(focused ? 1.05 : 0.95, motionSprings.snappy);
    translateY.value = withSpring(focused ? -1.5 : 0, motionSprings.snappy);
    opacity.value = withTiming(focused ? 1 : 0.78, getEnterTiming(motionDurations.fast));
  }, [focused, opacity, reduceMotion, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={20} color={color} />
    </Animated.View>
  );
}

/**
 * Monochrome tab navigator for authenticated core workspaces with cross-fade scenes.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const labelFont = getFont('medium', isRTL, false);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: {
          backgroundColor: colors.neutral.canvas,
        },
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
            <AnimatedTabIcon
              name={focused ? 'grid' : 'grid-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: isRTL ? 'الدفاتر' : 'Books',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'book' : 'book-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: isRTL ? 'الفواتير' : 'Invoices',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'document-text' : 'document-text-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{
          title: isRTL ? 'الضرائب' : 'Tax',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isRTL ? 'الحساب' : 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'person' : 'person-outline'}
              color={color as string}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
