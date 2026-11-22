// ============================================================================
// Mizan (ميزان) - Detailed Tax Readiness Breakdown (Screen 11)
// Monochrome weighted readiness score (PROFILE, VAT, CORPORATE_TAX, BOOKKEEPING,
// COMPLIANCE) with expandable statutory criteria checks and actionable steps.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { borders, radii, spacing } from '../../src/theme/tokens';
import { AppText, Badge, Button, Card } from '../../src/ui';

/**
 * Monochrome Detailed Tax Readiness Breakdown screen.
 */
export default function TaxReadinessScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [readiness, setReadiness] = useState<any | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReadiness = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await MizanApi.getDetailedTaxReadiness(activeBusiness.id);
      setReadiness(res);
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL ? 'تعذر تحميل مؤشر الجاهزية.' : 'Could not load tax readiness breakdown.')
      );
    } finally {
      setRefreshing(false);
    }
  }, [activeBusiness?.id, isRTL]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

  const overallScore = Math.max(0, Math.min(100, Number(readiness?.overallScore ?? 0)));
  const healthGrade = readiness?.healthGrade || '—';
  const categories: any[] = Array.isArray(readiness?.categories) ? readiness.categories : [];
  const actionableSteps: string[] = Array.isArray(readiness?.actionableSteps)
    ? readiness.actionableSteps
    : [];

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safe, { backgroundColor: colors.neutral.canvas }]}
    >
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.neutral.surface, borderBottomColor: colors.neutral.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.topBtn, { borderColor: colors.neutral.border }]}
        >
          <AppText variant="caption" weight="semiBold">
            {isRTL ? '→ رجوع' : '← Back'}
          </AppText>
        </Pressable>
        <AppText variant="bodySmall" weight="bold">
          {isRTL ? 'الجاهزية الضريبية' : 'Tax Readiness'}
        </AppText>
        <Badge label={`Grade ${healthGrade}`} variant="solid" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadReadiness}
            tintColor={colors.neutral.textPrimary}
          />
        }
      >
        {/* Inverted Hero Score Card */}
        <Card variant="inverted" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
              {isRTL ? 'مؤشر الجاهزية العام' : 'OVERALL READINESS'}
            </AppText>
            <View style={[styles.heroBadge, { borderColor: colors.brand.heroText }]}>
              <AppText variant="caption" weight="semiBold" tone="inverted">
                {readiness?.isAuditReady ? 'AUDIT READY' : 'IN PROGRESS'}
              </AppText>
            </View>
          </View>

          <AppText variant="display" tone="inverted" tabular>
            {overallScore} / 100
          </AppText>

          <View style={[styles.track, { backgroundColor: colors.brand.heroBorder }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${overallScore}%`,
                  backgroundColor: colors.brand.heroText,
                },
              ]}
            />
          </View>
        </Card>

        {error ? (
          <Card style={styles.errorCard}>
            <AppText variant="bodySmall" weight="semiBold">
              {error}
            </AppText>
            <Button label={isRTL ? 'إعادة المحاولة' : 'Retry'} variant="outline" onPress={loadReadiness} />
          </Card>
        ) : null}

        {/* Category Breakdown Cards */}
        {categories.map((cat) => {
          const score = Math.max(0, Math.min(100, Number(cat.score ?? 0)));
          const isOpen = expandedCat === cat.category;
          const details: any[] = Array.isArray(cat.details) ? cat.details : [];

          return (
            <Pressable
              key={cat.category}
              onPress={() => setExpandedCat(isOpen ? null : cat.category)}
            >
              <Card style={styles.catCard}>
                <View style={styles.catHeader}>
                  <AppText variant="bodySmall" weight="bold">
                    {cat.name || cat.category} ({cat.weightPercentage ?? 0}%)
                  </AppText>
                  <AppText variant="bodySmall" weight="bold" tabular>
                    {score} / 100
                  </AppText>
                </View>

                <View style={[styles.track, { backgroundColor: colors.neutral.surfaceSubtle }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${score}%`,
                        backgroundColor: colors.brand.primary,
                      },
                    ]}
                  />
                </View>

                <AppText variant="caption" tone="secondary">
                  {cat.passedChecks ?? 0} / {cat.totalChecks ?? 0} checks passed ·{' '}
                  {isOpen ? 'Hide details ▲' : 'View checks ▼'}
                </AppText>

                {isOpen && details.length > 0 ? (
                  <View style={[styles.detailsBox, { borderTopColor: colors.neutral.border }]}>
                    {details.map((d, idx) => (
                      <View key={`${cat.category}-d-${idx}`} style={styles.detailRow}>
                        <View style={styles.detailInfo}>
                          <AppText variant="caption" weight="semiBold">
                            {d.criterion}
                          </AppText>
                          <AppText variant="caption" tone="muted">
                            {d.explanation}
                            {d.statutoryRef ? ` (${d.statutoryRef})` : ''}
                          </AppText>
                        </View>
                        <Badge
                          label={d.passed ? 'PASS' : 'MISSING'}
                          variant={d.passed ? 'solid' : 'outline'}
                        />
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}

        {/* Actionable Next Steps */}
        {actionableSteps.length > 0 ? (
          <Card style={styles.catCard}>
            <AppText variant="caption" weight="semiBold" tone="secondary">
              {isRTL ? 'الخطوات المقترحة' : 'ACTIONABLE NEXT STEPS'}
            </AppText>
            {actionableSteps.map((step, i) => (
              <AppText key={`step-${i}`} variant="bodySmall" tone="secondary">
                • {step}
              </AppText>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline,
  },
  topBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.sm,
    borderWidth: borders.hairline,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  heroCard: { gap: spacing.sm },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMuted: { opacity: 0.78 },
  heroBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  track: {
    width: '100%',
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  errorCard: { gap: spacing.sm },
  catCard: { gap: spacing.xs },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: borders.hairline,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailInfo: { flex: 1, gap: 2 },
});
