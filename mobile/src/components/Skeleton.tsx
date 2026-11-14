// ============================================================================
// Mizan (ميزان) - Reusable Skeleton Screen Loading System
// Provides smooth, shimmering placeholder screens instead of basic spinners
// Uses react-native-reanimated for zero-jank UI thread animations
// ============================================================================

import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemeColors, radii, spacing } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../context/ThemeContext';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}

/**
 * Base animated skeleton shimmer box
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
  dark = false,
}) => {
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, {
        duration: 850,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Use dark-hero shimmer color when inside a dark hero card OR when app dark mode is active
  const shimmerColor = dark ? '#2A2B2E' : colors.neutral.skeletonBase;

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          backgroundColor: shimmerColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const SkeletonText: React.FC<{
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}> = ({ width = '100%', height = 14, style, dark }) => (
  <Skeleton width={width} height={height} borderRadius={6} style={style} dark={dark} />
);

export const SkeletonCircle: React.FC<{
  size?: number;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}> = ({ size = 40, style, dark }) => (
  <Skeleton
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
    dark={dark}
  />
);

export const SkeletonCard: React.FC<{
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  dark?: boolean;
}> = ({ height, style, children, dark }) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      style={[
        styles.cardContainer,
        dark ? styles.darkCardContainer : styles.lightCardContainer,
        height ? { height } : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Home Dashboard Full-Screen Skeleton
 */
export const DashboardSkeleton: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.screenWrapper}>
      {/* Top Header Placeholder */}
      <View style={styles.headerRow}>
        <View style={styles.brandPlaceholderRow}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <Skeleton width={110} height={20} borderRadius={6} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonCircle size={36} />
          <SkeletonCircle size={36} />
        </View>
      </View>

      {/* Greeting block */}
      <View style={{ marginBottom: spacing.md }}>
        <SkeletonText width="45%" height={22} style={{ marginBottom: 6 }} />
        <SkeletonText width="70%" height={14} />
      </View>

      {/* Large Compliance Dark Hero Card */}
      <SkeletonCard dark style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <SkeletonText width="40%" height={18} dark />
          <Skeleton width={80} height={24} borderRadius={12} dark />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <SkeletonCircle size={64} dark />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonText width="85%" height={14} dark />
            <SkeletonText width="60%" height={12} dark />
          </View>
        </View>
        <Skeleton width="100%" height={38} borderRadius={10} dark />
      </SkeletonCard>

      {/* 3 Metric Summary Boxes */}
      <View style={styles.metricGrid}>
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={styles.metricCard}>
            <SkeletonText width="60%" height={12} style={{ marginBottom: 8 }} />
            <SkeletonText width="90%" height={18} style={{ marginBottom: 6 }} />
            <SkeletonText width="50%" height={10} />
          </SkeletonCard>
        ))}
      </View>

      {/* Quick Action Icons Row */}
      <View style={{ marginVertical: spacing.md }}>
        <SkeletonText width="35%" height={16} style={{ marginBottom: spacing.sm }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="22%" height={74} borderRadius={radii.md} />
          ))}
        </View>
      </View>

      {/* Recent Activity List items */}
      <View style={{ marginTop: spacing.sm, gap: 10 }}>
        <SkeletonText width="40%" height={16} style={{ marginBottom: 4 }} />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkeletonCircle size={38} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonText width="75%" height={14} />
              <SkeletonText width="45%" height={11} />
            </View>
            <Skeleton width={60} height={16} borderRadius={4} />
          </SkeletonCard>
        ))}
      </View>
    </View>
  );
};

/**
 * Books & Ledger Screen Skeleton
 */
export const BooksSkeleton: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.screenWrapper}>
      {/* Financial Year Selector bar */}
      <Skeleton width="100%" height={44} borderRadius={radii.md} style={{ marginBottom: spacing.md }} />

      {/* Dark Business Performance Card */}
      <SkeletonCard dark style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonText width="45%" height={18} dark />
          <Skeleton width={90} height={22} borderRadius={11} dark />
        </View>
        <SkeletonText width="30%" height={12} dark style={{ marginBottom: 6 }} />
        <SkeletonText width="65%" height={28} dark style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width="48%" height={56} borderRadius={8} dark />
          <Skeleton width="48%" height={56} borderRadius={8} dark />
        </View>
      </SkeletonCard>

      {/* 4 Tabs Skeleton */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="22%" height={34} borderRadius={radii.pill} />
        ))}
      </View>

      {/* Transactions / Ledger list skeleton items */}
      <View style={{ gap: 10 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} style={{ padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Skeleton width={36} height={36} borderRadius={8} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonText width="70%" height={14} />
              <SkeletonText width="40%" height={11} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Skeleton width={70} height={16} borderRadius={4} />
              <Skeleton width={45} height={10} borderRadius={3} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    </View>
  );
};

/**
 * Invoices Screen Skeleton
 */
export const InvoicesSkeleton: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.screenWrapper}>
      {/* Search Input Skeleton */}
      <Skeleton width="100%" height={46} borderRadius={radii.md} style={{ marginBottom: spacing.md }} />

      {/* Status Filter Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="18%" height={32} borderRadius={radii.pill} />
        ))}
      </View>

      {/* Invoice Card List */}
      <View style={{ gap: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} style={{ padding: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <SkeletonText width="35%" height={16} />
              <Skeleton width={70} height={22} borderRadius={11} />
            </View>
            <SkeletonText width="60%" height={14} style={{ marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <SkeletonText width="40%" height={12} />
              <SkeletonText width="30%" height={18} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    </View>
  );
};

/**
 * Tax Hub Screen Skeleton
 */
export const TaxSkeleton: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.screenWrapper}>
      {/* FY Selector Bar */}
      <Skeleton width="100%" height={44} borderRadius={radii.md} style={{ marginBottom: spacing.md }} />

      {/* 4 Tax Segment Pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.lg }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="22%" height={34} borderRadius={radii.pill} />
        ))}
      </View>

      {/* Tax Position Card */}
      <SkeletonCard dark style={{ padding: spacing.lg, marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <SkeletonText width="45%" height={16} dark />
          <Skeleton width={80} height={22} borderRadius={11} dark />
        </View>
        <SkeletonText width="70%" height={28} dark style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={10} borderRadius={5} dark style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Skeleton width="48%" height={48} borderRadius={8} dark />
          <Skeleton width="48%" height={48} borderRadius={8} dark />
        </View>
      </SkeletonCard>

      {/* Breakdown Card */}
      <SkeletonCard style={{ padding: spacing.lg, gap: 14 }}>
        <SkeletonText width="50%" height={18} style={{ marginBottom: 4 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonText width="45%" height={13} />
            <Skeleton width={80} height={15} borderRadius={4} />
          </View>
        ))}
      </SkeletonCard>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    skeletonBase: {
      overflow: 'hidden',
    },
    screenWrapper: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    brandPlaceholderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardContainer: {
      borderRadius: radii.lg,
      borderWidth: 1,
    },
    lightCardContainer: {
      backgroundColor: colors.neutral.surface,
      borderColor: colors.neutral.border,
    },
    darkCardContainer: {
      backgroundColor: colors.brand.darkHero,
      borderColor: colors.brand.darkHeroBorder,
    },
    metricGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: spacing.md,
    },
    metricCard: {
      flex: 1,
      padding: spacing.md,
      backgroundColor: colors.neutral.surface,
    },
  });
