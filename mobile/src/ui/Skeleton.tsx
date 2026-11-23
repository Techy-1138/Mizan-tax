// ============================================================================
// Mizan (ميزان) - Monochrome Shimmer Skeleton Primitives (FEAT-UI-01)
// GPU-composited Reanimated opacity pulse respecting OS reduced-motion settings
// and Light/Dark `skeletonBase` tokens, plus layout-matched screen presets.
// ============================================================================

import React, { useEffect } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { borders, layoutSpacing, radii, spacing } from '../theme/tokens';
import { Card } from './Card';

export interface SkeletonBlockProps {
  /** Block width (percentage string or pixel number) */
  width?: DimensionValue;
  /** Block height in pixels */
  height?: number;
  /** Corner radius (defaults to radii.sm = 8px) */
  borderRadius?: number;
  /** Render slightly lighter contrast when nested inside an inverted hero card */
  onHero?: boolean;
  style?: ViewStyle;
}

/**
 * Single monochrome shimmer rectangle driven purely by UI-thread opacity.
 */
export function SkeletonBlock({
  width = '100%',
  height = 14,
  borderRadius = radii.sm,
  onHero = false,
  style,
}: SkeletonBlockProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0.45);

  useEffect(() => {
    // Respect OS accessibility reduced-motion preference by holding a static subtle fill
    if (reduceMotion) {
      opacity.value = 0.7;
      return;
    }

    // Smooth GPU-composited opacity pulse (no layout thrashing)
    opacity.value = withRepeat(
      withTiming(0.95, {
        duration: 850,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillColor = onHero ? colors.brand.heroElevated : colors.neutral.skeletonBase;

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: fillColor,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/**
 * Layout-matched skeleton placeholder for the Home Dashboard (`(tabs)/index.tsx`)
 * shown on first uncached load so fake default numbers never flash.
 */
export function DashboardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.sectionStack}>
      {/* Hero Card Skeleton */}
      <Card variant="inverted" paddingSize="lg" animated={false} style={styles.heroCard}>
        <View style={styles.rowBetween}>
          <SkeletonBlock width={130} height={12} onHero />
          <SkeletonBlock width={64} height={22} borderRadius={radii.pill} onHero />
        </View>
        <View style={styles.rowBetween}>
          <View style={styles.colGap}>
            <SkeletonBlock width={90} height={11} onHero />
            <SkeletonBlock width={170} height={34} onHero />
          </View>
          <View style={[styles.colGap, styles.alignEnd]}>
            <SkeletonBlock width={55} height={11} onHero />
            <SkeletonBlock width={85} height={22} onHero />
          </View>
        </View>
      </Card>

      {/* KPI Grid + Quick Actions Skeleton */}
      <View style={styles.groupStack}>
        <View style={styles.twoCol}>
          <Card animated={false} style={styles.flexCard}>
            <SkeletonBlock width={60} height={12} />
            <SkeletonBlock width="80%" height={22} />
          </Card>
          <Card animated={false} style={styles.flexCard}>
            <SkeletonBlock width={65} height={12} />
            <SkeletonBlock width="80%" height={22} />
          </Card>
        </View>

        <View style={styles.threeCol}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.qaSkeleton,
                {
                  backgroundColor: colors.neutral.surface,
                  borderColor: colors.neutral.border,
                },
              ]}
            >
              <SkeletonBlock width={20} height={20} borderRadius={radii.pill} />
              <SkeletonBlock width={54} height={11} />
              <SkeletonBlock width={40} height={10} />
            </View>
          ))}
        </View>
      </View>

      {/* Statutory Deadline & Compliance Actions Skeleton */}
      <View style={styles.groupStack}>
        <Card animated={false} style={styles.cardGap}>
          <View style={styles.rowBetween}>
            <SkeletonBlock width={140} height={12} />
            <SkeletonBlock width={56} height={20} borderRadius={radii.pill} />
          </View>
          <SkeletonBlock width="75%" height={16} />
          <SkeletonBlock width="60%" height={12} />
        </Card>

        <Card animated={false} style={styles.cardGap}>
          <SkeletonBlock width={125} height={12} />
          <SkeletonBlock width="100%" height={18} />
          <SkeletonBlock width="85%" height={18} />
        </Card>
      </View>
    </View>
  );
}

/**
 * Reusable ledger skeleton for Books (`books.tsx`) and Invoices (`invoices.tsx`)
 * matching the Summary Hero + Ledger Card rows while initial API fetch is in flight.
 */
export function LedgerSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.groupStack}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Card key={idx} animated={false} style={styles.cardGap}>
          <View style={styles.rowBetween}>
            <View style={styles.flexColGap}>
              <SkeletonBlock width="62%" height={16} />
              <SkeletonBlock width="42%" height={12} />
            </View>
            <View style={[styles.colGap, styles.alignEnd]}>
              <SkeletonBlock width={86} height={16} />
              <SkeletonBlock width={54} height={12} />
            </View>
          </View>
          <View style={styles.rowBetween}>
            <SkeletonBlock width={68} height={22} borderRadius={radii.pill} />
            <SkeletonBlock width={76} height={34} borderRadius={radii.md} />
          </View>
        </Card>
      ))}
    </View>
  );
}

/**
 * Layout-matched skeleton for Tax Center (`(tabs)/tax.tsx`) calculation breakdown & history.
 */
export function TaxCenterSkeleton() {
  return (
    <View style={styles.groupStack}>
      <Card animated={false} style={styles.cardGap}>
        <SkeletonBlock width={150} height={12} />
        <View style={styles.rowBetween}>
          <SkeletonBlock width={115} height={14} />
          <SkeletonBlock width={90} height={14} />
        </View>
        <View style={styles.rowBetween}>
          <SkeletonBlock width={120} height={14} />
          <SkeletonBlock width={95} height={14} />
        </View>
        <View style={styles.rowBetween}>
          <SkeletonBlock width={105} height={14} />
          <SkeletonBlock width={90} height={14} />
        </View>
      </Card>

      <Card animated={false} style={styles.cardGap}>
        <SkeletonBlock width={135} height={12} />
        <View style={styles.rowBetween}>
          <View style={styles.flexColGap}>
            <SkeletonBlock width={95} height={14} />
            <SkeletonBlock width={125} height={11} />
          </View>
          <SkeletonBlock width={74} height={34} borderRadius={radii.md} />
        </View>
      </Card>
    </View>
  );
}

/**
 * Layout-matched skeleton for Tax Readiness Breakdown (`app/readiness/index.tsx`).
 */
export function ReadinessSkeleton() {
  return (
    <View style={styles.sectionStack}>
      <Card variant="inverted" paddingSize="lg" animated={false} style={styles.heroCard}>
        <View style={styles.rowBetween}>
          <SkeletonBlock width={120} height={12} onHero />
          <SkeletonBlock width={84} height={22} borderRadius={radii.pill} onHero />
        </View>
        <SkeletonBlock width={135} height={36} onHero />
        <SkeletonBlock width="100%" height={6} borderRadius={radii.pill} onHero />
      </Card>

      <View style={styles.groupStack}>
        {[0, 1, 2].map((idx) => (
          <Card key={idx} animated={false} style={styles.cardGap}>
            <View style={styles.rowBetween}>
              <SkeletonBlock width={145} height={14} />
              <SkeletonBlock width={54} height={14} />
            </View>
            <SkeletonBlock width="100%" height={6} borderRadius={radii.pill} />
            <SkeletonBlock width={150} height={11} />
          </Card>
        ))}
      </View>
    </View>
  );
}

/**
 * Layout-matched skeleton for Compliance Reports list (`app/reports/index.tsx`).
 */
export function ReportsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <View style={styles.groupStack}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Card key={idx} animated={false} style={styles.cardGap}>
          <View style={styles.rowBetween}>
            <View style={styles.flexColGap}>
              <SkeletonBlock width="68%" height={15} />
              <SkeletonBlock width="45%" height={12} />
            </View>
            <SkeletonBlock width={58} height={22} borderRadius={radii.pill} />
          </View>
          <View style={styles.rowEnd}>
            <SkeletonBlock width={68} height={34} borderRadius={radii.md} />
            <SkeletonBlock width={94} height={34} borderRadius={radii.md} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    gap: layoutSpacing.sectionGap,
  },
  groupStack: {
    gap: layoutSpacing.groupGap,
  },
  heroCard: {
    gap: spacing.md,
  },
  cardGap: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowEnd: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  colGap: {
    gap: spacing.xxs + 2,
  },
  flexColGap: {
    flex: 1,
    gap: spacing.xxs + 2,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  threeCol: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  flexCard: {
    flex: 1,
    gap: spacing.xs,
  },
  qaSkeleton: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xxs + 2,
  },
});
