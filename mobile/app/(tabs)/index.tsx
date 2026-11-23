// ============================================================================
// Mizan (ميزان) - Home Dashboard Screen (Screen 4)
// Monochrome institutional overview: Entity Switcher, Hero Tax Readiness Card,
// Revenue/Expense KPIs, Clear Quick Actions (Bill Client / Log Expense / File Tax),
// Next Statutory Deadline, and Open Compliance Actions.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { AppStorage } from '../../src/utils/storage';
import { borders, layoutSpacing, radii, spacing } from '../../src/theme/tokens';

// Per-entity AsyncStorage cache key prefix for instant Stale-While-Revalidate hydration
const DASHBOARD_CACHE_PREFIX = 'mizan_dash_cache_';
import { AppText, Badge, Button, Card, DashboardSkeleton, ModalSheet } from '../../src/ui';

interface DashboardState {
  readinessScore: number;
  netProfitAED: string;
  revenueAED: string;
  expensesAED: string;
  estimatedCtAED: string;
  nextDeadline: {
    title: string;
    daysRemaining: number;
    legalReference: string;
    potentialPenaltyAED: string;
  } | null;
  actions: {
    id: string;
    title: string;
    impactScore: number;
    status: string;
  }[];
  synced: boolean;
}

const DEFAULT_DASHBOARD: DashboardState = {
  readinessScore: 85,
  netProfitAED: '0',
  revenueAED: '0',
  expensesAED: '0',
  estimatedCtAED: '0',
  nextDeadline: null,
  actions: [],
  synced: true,
};

/** Formats numeric AED strings cleanly with thousand separators */
function formatAED(value: string | number | undefined): string {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return 'AED 0';
  return `AED ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * Monochrome Home Dashboard bound to active BusinessEntity and MizanApi.
 */
export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const { businesses, activeBusiness, setActiveBusinessId } = useBusiness();

  const [data, setData] = useState<DashboardState>(DEFAULT_DASHBOARD);
  // Tracks whether SWR cache or fresh API data has arrived for the active entity to avoid flashing fake 85/100 defaults
  const [hasHydratedOrFetched, setHasHydratedOrFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setRefreshing(true);
    try {
      const [overviewRes, calendarRes, actionsRes] = await Promise.allSettled([
        MizanApi.getDashboardOverview(activeBusiness.id),
        MizanApi.getCalendarDeadlines(activeBusiness.id),
        MizanApi.getComplianceActions(activeBusiness.id),
      ]);

      const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null;
      const calendar =
        calendarRes.status === 'fulfilled' && Array.isArray(calendarRes.value)
          ? calendarRes.value
          : [];
      const actions =
        actionsRes.status === 'fulfilled' && Array.isArray(actionsRes.value)
          ? actionsRes.value.filter((a: any) => a.status !== 'RESOLVED').slice(0, 3)
          : [];

      const financials = overview?.financials || {};
      const tax = overview?.tax || {};
      const nextItem = calendar[0] || null;

      const nextState: DashboardState = {
        readinessScore: overview?.readiness?.overallScore ?? 85,
        netProfitAED: financials.netAccountingProfitAED ?? '0',
        revenueAED: financials.totalRevenueAED ?? '0',
        expensesAED: financials.totalExpensesAED ?? '0',
        estimatedCtAED: tax.latestCorporateTaxAssessment?.corporateTaxDueAED ?? '0',
        nextDeadline: nextItem
          ? {
              title: nextItem.title,
              daysRemaining: nextItem.daysRemaining ?? 0,
              legalReference: nextItem.legalReference || 'UAE FTA',
              potentialPenaltyAED: nextItem.potentialPenaltyAED || '0',
            }
          : null,
        actions: actions.map((a: any) => ({
          id: a.id || a.findingKey,
          title: a.title,
          impactScore: a.impactScore ?? 5,
          status: a.status || 'OPEN',
        })),
        synced: overviewRes.status === 'fulfilled',
      };

      setData(nextState);
      setHasHydratedOrFetched(true);

      // Persist fresh overview per businessId so subsequent mounts render at 0ms
      if (overviewRes.status === 'fulfilled') {
        AppStorage.setItem(
          `${DASHBOARD_CACHE_PREFIX}${activeBusiness.id}`,
          JSON.stringify(nextState)
        ).catch(() => {});
      }
    } finally {
      setHasHydratedOrFetched(true);
      setRefreshing(false);
    }
  }, [activeBusiness?.id]);

  // Hydrate cached KPI snapshot immediately on mount or entity switch (Stale-While-Revalidate)
  useEffect(() => {
    let cancelled = false;
    if (!activeBusiness?.id) {
      setData(DEFAULT_DASHBOARD);
      setHasHydratedOrFetched(true);
      return;
    }

    // Show skeleton until either local cache hits or the initial network call resolves
    setHasHydratedOrFetched(false);

    (async () => {
      try {
        const cachedRaw = await AppStorage.getItem(
          `${DASHBOARD_CACHE_PREFIX}${activeBusiness.id}`
        );
        if (cancelled) return;
        if (cachedRaw) {
          setData(JSON.parse(cachedRaw));
          setHasHydratedOrFetched(true);
        } else {
          // Reset cleanly when switching to an entity with no prior local cache
          setData(DEFAULT_DASHBOARD);
        }
      } catch {
        if (!cancelled) setData(DEFAULT_DASHBOARD);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: colors.neutral.canvas }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadDashboard}
            tintColor={colors.neutral.textPrimary}
          />
        }
      >
        {/* Zone 1: Top Entity Switcher & Inverted Hero Readiness Card */}
        <View style={styles.zoneGroup}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => businesses.length > 0 && setSwitcherOpen(true)}
              style={styles.entityTrigger}
            >
              <AppText variant="h3" weight="bold" numberOfLines={1}>
                {activeBusiness?.legalName || (isRTL ? 'منشأتي' : 'My Business')} ▾
              </AppText>
              <AppText variant="caption" tone="muted" tabular>
                {activeBusiness?.tradeLicenseNumber || '—'} ·{' '}
                {activeBusiness?.jurisdictionType || 'MAINLAND'}
              </AppText>
            </Pressable>

            <Badge
              label={data.synced ? (isRTL ? 'متصل' : 'Synced') : isRTL ? 'محلي' : 'Offline'}
              variant={data.synced ? 'outline' : 'muted'}
            />
          </View>

          {!hasHydratedOrFetched ? (
            <DashboardSkeleton />
          ) : (
            <Pressable onPress={() => router.push('/readiness')}>
              <Card variant="inverted" paddingSize="lg" style={styles.heroCard}>
                <View style={styles.heroTop}>
                  <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
                    {isRTL ? 'مؤشر الجاهزية الضريبية' : 'TAX READINESS SCORE'}
                  </AppText>
                  <View style={[styles.heroBadge, { borderColor: colors.brand.heroText }]}>
                    <AppText variant="caption" weight="semiBold" tone="inverted" tabular>
                      {data.readinessScore} / 100
                    </AppText>
                  </View>
                </View>

                <View style={styles.heroMetricsRow}>
                  <View>
                    <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
                      {isRTL ? 'صافي الربح (سنوي)' : 'Net Profit (YTD)'}
                    </AppText>
                    <AppText variant="display" tone="inverted" tabular>
                      {formatAED(data.netProfitAED)}
                    </AppText>
                  </View>
                  <View style={styles.heroRightMetric}>
                    <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
                      {isRTL ? 'ضريبة الشركات المقدرة' : 'Est. CT'}
                    </AppText>
                    <AppText variant="h3" tone="inverted" tabular>
                      {formatAED(data.estimatedCtAED)}
                    </AppText>
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        </View>

        {hasHydratedOrFetched ? (
          <>
            {/* Zone 2: 2-Column KPI Grid & 3 Clear Quick Actions */}
            <View style={styles.zoneGroup}>
              <View style={styles.kpiRow}>
                <Card style={styles.kpiCard}>
                  <AppText variant="caption" tone="secondary">
                    {isRTL ? 'الإيرادات' : 'Revenue'}
                  </AppText>
                  <AppText variant="h3" weight="bold" tabular style={styles.kpiValue}>
                    {formatAED(data.revenueAED)}
                  </AppText>
                </Card>

                <Card style={styles.kpiCard}>
                  <AppText variant="caption" tone="secondary">
                    {isRTL ? 'المصروفات' : 'Expenses'}
                  </AppText>
                  <AppText variant="h3" weight="bold" tabular style={styles.kpiValue}>
                    {formatAED(data.expensesAED)}
                  </AppText>
                </Card>
              </View>

              <View style={styles.qaRow}>
                <Pressable
                  onPress={() => router.push('/(tabs)/invoices')}
                  style={[
                    styles.qaBtn,
                    { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
                  ]}
                >
                  <Ionicons name="arrow-up-outline" size={18} color={colors.neutral.textPrimary} />
                  <AppText variant="caption" weight="semiBold">
                    {isRTL ? 'فوترة عميل' : 'Bill Client'}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {isRTL ? 'إيرادات' : 'Income'}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(tabs)/books')}
                  style={[
                    styles.qaBtn,
                    { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
                  ]}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.neutral.textPrimary} />
                  <AppText variant="caption" weight="semiBold">
                    {isRTL ? 'تسجيل مصروف' : 'Log Expense'}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {isRTL ? 'مسح إيصال' : 'Scan Cost'}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(tabs)/tax')}
                  style={[
                    styles.qaBtn,
                    { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={colors.neutral.textPrimary}
                  />
                  <AppText variant="caption" weight="semiBold">
                    {isRTL ? 'تقديم إقرار' : 'File Tax'}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {isRTL ? 'ضريبة' : 'VAT · CT'}
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Zone 3: Statutory Deadlines & Compliance Findings */}
            <View style={styles.zoneGroup}>
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <AppText variant="caption" weight="semiBold" tone="secondary">
                    {isRTL ? 'الموعد القانوني القادم' : 'NEXT STATUTORY DEADLINE'}
                  </AppText>
                  {data.nextDeadline ? (
                    <Badge label={`${data.nextDeadline.daysRemaining}d left`} variant="solid" />
                  ) : null}
                </View>
                {data.nextDeadline ? (
                  <>
                    <AppText variant="body" weight="semiBold">
                      {data.nextDeadline.title}
                    </AppText>
                    <AppText variant="caption" tone="secondary">
                      {data.nextDeadline.legalReference} · Penalty Shield:{' '}
                      {formatAED(data.nextDeadline.potentialPenaltyAED)}
                    </AppText>
                  </>
                ) : (
                  <AppText variant="bodySmall" tone="secondary">
                    {isRTL
                      ? 'لا توجد مواعيد مستحقة حالياً. قم بتحديث الإقرارات من تبويب الضرائب.'
                      : 'No immediate statutory filings due. Run an assessment in the Tax tab.'}
                  </AppText>
                )}
              </Card>

              <Card style={styles.sectionCard}>
                <AppText variant="caption" weight="semiBold" tone="secondary">
                  {isRTL ? 'إجراءات الامتثال المفتوحة' : 'COMPLIANCE ACTIONS'}
                </AppText>
                {data.actions.length === 0 ? (
                  <AppText variant="bodySmall" tone="secondary">
                    {isRTL
                      ? 'سجلك نظيف حالياً — لا توجد ملاحظات معلقة.'
                      : 'All clear — no open compliance findings for this entity.'}
                  </AppText>
                ) : (
                  data.actions.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.actionRow, { borderTopColor: colors.neutral.border }]}
                    >
                      <View style={styles.actionInfo}>
                        <AppText variant="bodySmall" weight="semiBold">
                          {item.title}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          +{item.impactScore} readiness pts
                        </AppText>
                      </View>
                      <Badge label={item.status} variant="outline" />
                    </View>
                  ))
                )}
              </Card>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Multi-Entity Switcher ModalSheet */}
      <ModalSheet
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        title={isRTL ? 'اختر المنشأة' : 'Switch Business Entity'}
      >
        {businesses.map((biz) => {
          const isActive = biz.id === activeBusiness?.id;
          return (
            <Pressable
              key={biz.id}
              onPress={() => {
                setActiveBusinessId(biz.id);
                setSwitcherOpen(false);
              }}
              style={[
                styles.bizOption,
                {
                  borderColor: isActive ? colors.neutral.borderStrong : colors.neutral.border,
                  backgroundColor: isActive ? colors.neutral.surfaceSubtle : colors.neutral.surface,
                },
              ]}
            >
              <View style={styles.bizOptionInfo}>
                <AppText variant="bodySmall" weight="semiBold">
                  {biz.legalName}
                </AppText>
                <AppText variant="caption" tone="muted" tabular>
                  {biz.tradeLicenseNumber}
                </AppText>
              </View>
              {isActive ? <Badge label="Active" variant="solid" /> : null}
            </Pressable>
          );
        })}
        <Button
          label={isRTL ? '+ إضافة منشأة جديدة' : '+ Add New Business'}
          variant="outline"
          onPress={() => {
            setSwitcherOpen(false);
            router.push('/onboarding/business');
          }}
        />
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    // Calibrated 24px breathing space between major dashboard zones
    gap: layoutSpacing.sectionGap,
  },
  zoneGroup: {
    // Tighter 12px rhythm binding related elements within a functional zone
    gap: layoutSpacing.groupGap,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  entityTrigger: {
    flex: 1,
    gap: 2,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMuted: {
    opacity: 0.78,
  },
  heroBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  heroRightMetric: {
    alignItems: 'flex-end',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    gap: spacing.xxs,
  },
  kpiValue: {
    marginTop: 2,
  },
  qaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  qaBtn: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  sectionCard: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Symmetric 12px vertical padding keeps hairline rows balanced
    paddingVertical: layoutSpacing.rowPaddingY,
    borderTopWidth: borders.hairline,
    gap: spacing.sm,
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  bizOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
  },
  bizOptionInfo: {
    flex: 1,
    gap: 2,
  },
});
