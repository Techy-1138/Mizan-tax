// ============================================================================
// Mizan (ميزان) - Tax Center Screen (Screen 7)
// Monochrome UAE Corporate Tax (FDL 47/2022) & VAT 201 (FDL 8/2017) Engine:
// Regime switcher, Run Assessment, Statutory Breakdown, Assessment History,
// and AI Explanation ModalSheet.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { borders, radii, spacing } from '../../src/theme/tokens';
import { AppText, Badge, Button, Card, ModalSheet, SlideIn } from '../../src/ui';

type TaxRegime = 'CORPORATE_TAX' | 'VAT';

function formatAED(val: number | string | undefined): string {
  const num = Number(val || 0);
  if (Number.isNaN(num)) return 'AED 0.00';
  return `AED ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Monochrome Corporate Tax & VAT 201 workspace.
 */
export default function TaxCenterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [regime, setRegime] = useState<TaxRegime>('CORPORATE_TAX');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Explain ModalSheet state
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState('');

  const loadAssessments = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setRefreshing(true);
    try {
      const list = await MizanApi.getTaxAssessments(activeBusiness.id);
      setAssessments(Array.isArray(list) ? list : []);
    } catch {
      setAssessments([]);
    } finally {
      setRefreshing(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const regimeAssessments = useMemo(
    () =>
      assessments.filter((a) => {
        const t = (a.taxType || a.type || '').toUpperCase();
        return regime === 'CORPORATE_TAX' ? t.includes('CORPORATE') : t.includes('VAT');
      }),
    [assessments, regime]
  );

  const latest = regimeAssessments[0] || null;

  /** Executes deterministic Corporate Tax or VAT 201 assessment */
  const handleRunAssessment = async () => {
    if (!activeBusiness?.id) return;
    setFeedback(null);
    setRunning(true);
    try {
      if (regime === 'CORPORATE_TAX') {
        await MizanApi.assessBusinessCorporateTax({
          businessId: activeBusiness.id,
          financialYear: 2026,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          electSmallBusinessRelief: Boolean(activeBusiness.isSbrEligible),
        });
      } else {
        await MizanApi.assessBusinessVat({
          businessId: activeBusiness.id,
          periodKey: '2026-Q4',
          startDate: '2026-10-01',
          endDate: '2026-12-31',
          includeDraftExpenses: false,
        });
      }
      await loadAssessments();
    } catch (err: any) {
      setFeedback(
        err?.message ||
          (isRTL ? 'تعذر تشغيل التقييم الضريبي.' : 'Could not run tax assessment.')
      );
    } finally {
      setRunning(false);
    }
  };

  /** Fetches statutory AI explanation for an assessment */
  const handleExplain = async (assessment: any) => {
    setExplainOpen(true);
    setExplainLoading(true);
    setExplainText('');
    try {
      const res = await MizanApi.explainAssessmentWithAi(
        assessment.id,
        isRTL ? 'ar' : 'en'
      );
      setExplainText(
        res?.explanation ||
          res?.summary ||
          assessment.summary ||
          'Deterministic UAE FTA statutory assessment.'
      );
    } catch {
      setExplainText(
        assessment.legalReference ||
          (regime === 'CORPORATE_TAX'
            ? 'Federal Decree-Law No. 47 of 2022: 0% up to AED 375,000 taxable income, 9% above AED 375,000 (or 0% under MD 73/2023 SBR up to AED 3M).'
            : 'Federal Decree-Law No. 8 of 2017: 5% Standard Output VAT minus recoverable Input VAT.')
      );
    } finally {
      setExplainLoading(false);
    }
  };

  const heroAmount =
    regime === 'CORPORATE_TAX'
      ? latest?.corporateTaxDueAED ?? latest?.taxDueAED ?? 0
      : latest?.netVatPayableAED ?? latest?.taxDueAED ?? 0;

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
            onRefresh={loadAssessments}
            tintColor={colors.neutral.textPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <AppText variant="h2">
              {isRTL ? 'المركز الضريبي' : 'Tax Center'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {isRTL
                ? 'محركات الهيئة الاتحادية للضرائب'
                : 'Deterministic UAE FTA Engines'}
            </AppText>
          </View>
          <View style={styles.headerActions}>
            <Button
              label={isRTL ? 'التقارير' : 'Reports'}
              variant="outline"
              size="md"
              fullWidth={false}
              onPress={() => router.push('/reports')}
            />
            <Button
              label={isRTL ? 'اسأل المساعد' : 'Ask Tax AI'}
              variant="outline"
              size="md"
              fullWidth={false}
              onPress={() => router.push('/learn/chat')}
            />
          </View>
        </View>

        {/* Regime Segmented Switcher */}
        <View
          style={[
            styles.regimeBar,
            { backgroundColor: colors.neutral.surfaceSubtle, borderColor: colors.neutral.border },
          ]}
        >
          {(
            [
              { key: 'CORPORATE_TAX', label: isRTL ? 'ضريبة الشركات (9%)' : 'Corporate Tax (9%)' },
              { key: 'VAT', label: isRTL ? 'ضريبة القيمة المضافة 201' : 'VAT 201 (5%)' },
            ] as const
          ).map((tab) => {
            const active = regime === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  setFeedback(null);
                  setRegime(tab.key);
                }}
                style={[styles.regimeTab, active && { backgroundColor: colors.neutral.surface }]}
              >
                <AppText variant="caption" weight="semiBold" tone={active ? 'primary' : 'secondary'}>
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Inverted Hero Assessment Card */}
        <Card variant="inverted" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
              {regime === 'CORPORATE_TAX'
                ? isRTL
                  ? 'ضريبة الشركات · 2026'
                  : 'CORPORATE TAX · FY 2026'
                : isRTL
                  ? 'إقرار ضريبة القيمة المضافة 201'
                  : 'VAT 201 RETURN · Q4 2026'}
            </AppText>
            <View style={[styles.heroBadge, { borderColor: colors.brand.heroText }]}>
              <AppText variant="caption" weight="semiBold" tone="inverted">
                {regime === 'CORPORATE_TAX' ? 'FDL 47/2022' : 'FDL 8/2017'}
              </AppText>
            </View>
          </View>

          <AppText variant="display" tone="inverted" tabular style={styles.heroAmount}>
            {formatAED(heroAmount)}
          </AppText>

          <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
            {regime === 'CORPORATE_TAX'
              ? isRTL
                ? '0% حتى 375,000 درهم · 9% على الفائض'
                : '0% up to AED 375,000 · 9% above threshold'
              : isRTL
                ? 'صافي ضريبة المخرجات مطروحاً منها ضريبة المدخلات'
                : 'Net Output VAT minus Recoverable Input VAT'}
          </AppText>

          <Button
            label={isRTL ? 'تشغيل التقييم الضريبي' : 'Run Assessment'}
            variant="onHero"
            loading={running}
            onPress={handleRunAssessment}
            style={{ marginTop: spacing.xs }}
          />
        </Card>

        {/* Feedback Banner */}
        {feedback ? (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: colors.neutral.surfaceSubtle,
                borderColor: colors.neutral.borderStrong,
              },
            ]}
          >
            <AppText variant="caption" weight="medium">
              {feedback}
            </AppText>
          </View>
        ) : null}

        {/* Statutory Breakdown Card */}
        <SlideIn key={regime} from="bottom" distance={10}>
        <Card style={styles.card}>
          <AppText variant="caption" weight="semiBold" tone="secondary">
            {isRTL ? 'تفاصيل الاحتساب' : 'CALCULATION BREAKDOWN'}
          </AppText>

          {regime === 'CORPORATE_TAX' ? (
            <>
              <View style={[styles.row, { borderBottomColor: colors.neutral.border }]}>
                <AppText variant="bodySmall" tone="secondary">
                  {isRTL ? 'الربح المحاسبي' : 'Accounting Profit'}
                </AppText>
                <AppText variant="bodySmall" weight="semiBold" tabular>
                  {formatAED(latest?.accountingProfitAED ?? 0)}
                </AppText>
              </View>
              <View style={[styles.row, { borderBottomColor: colors.neutral.border }]}>
                <AppText variant="bodySmall" tone="secondary">
                  {isRTL ? 'الشريحة المعفاة (0%)' : '0% Statutory Band'}
                </AppText>
                <AppText variant="bodySmall" weight="semiBold" tabular>
                  AED 375,000.00
                </AppText>
              </View>
              <View style={styles.rowLast}>
                <AppText variant="bodySmall" tone="secondary">
                  {isRTL ? 'الدخل الخاضع للضريبة' : 'Taxable Income'}
                </AppText>
                <AppText variant="bodySmall" weight="bold" tabular>
                  {formatAED(latest?.taxableIncomeAED ?? 0)}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.row, { borderBottomColor: colors.neutral.border }]}>
                <AppText variant="bodySmall" tone="secondary">
                  {isRTL ? 'ضريبة المخرجات' : 'Output VAT (Sales)'}
                </AppText>
                <AppText variant="bodySmall" weight="semiBold" tabular>
                  {formatAED(latest?.outputVatAED ?? latest?.totalOutputVatAED ?? 0)}
                </AppText>
              </View>
              <View style={[styles.row, { borderBottomColor: colors.neutral.border }]}>
                <AppText variant="bodySmall" tone="secondary">
                  {isRTL ? 'ضريبة المدخلات' : 'Recoverable Input VAT'}
                </AppText>
                <AppText variant="bodySmall" weight="semiBold" tabular>
                  {formatAED(latest?.inputVatAED ?? latest?.recoverableInputVatAED ?? 0)}
                </AppText>
              </View>
              <View style={styles.rowLast}>
                <AppText variant="bodySmall" tone="secondary">
                  {isRTL ? 'صافي الضريبة المستحقة' : 'Net VAT Payable'}
                </AppText>
                <AppText variant="bodySmall" weight="bold" tabular>
                  {formatAED(heroAmount)}
                </AppText>
              </View>
            </>
          )}
        </Card>
        </SlideIn>

        {/* Historical Assessments */}
        <Card style={styles.card}>
          <AppText variant="caption" weight="semiBold" tone="secondary">
            {isRTL ? 'سجل التقييمات' : 'ASSESSMENT HISTORY'}
          </AppText>

          {regimeAssessments.length === 0 ? (
            <AppText variant="bodySmall" tone="secondary">
              {isRTL
                ? 'لا توجد تقييمات محفوظة بعد. اضغط تشغيل التقييم الضريبي أعلاه.'
                : 'No assessments run yet. Tap Run Assessment above to generate one.'}
            </AppText>
          ) : (
            regimeAssessments.map((item) => (
              <View
                key={item.id}
                style={[styles.histRow, { borderTopColor: colors.neutral.border }]}
              >
                <View style={styles.histInfo}>
                  <AppText variant="bodySmall" weight="semiBold">
                    {item.periodKey || `FY ${item.taxYear || 2026}`}
                  </AppText>
                  <AppText variant="caption" tone="muted" tabular>
                    {(item.createdAt || '').toString().slice(0, 10)} · {item.status || 'DRAFT'}
                  </AppText>
                </View>
                <Button
                  label={isRTL ? 'تفسير' : 'Explain'}
                  variant="outline"
                  size="md"
                  fullWidth={false}
                  onPress={() => handleExplain(item)}
                />
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Statutory AI Explanation ModalSheet */}
      <ModalSheet
        visible={explainOpen}
        onClose={() => setExplainOpen(false)}
        title={isRTL ? 'التفسير القانوني' : 'Statutory Breakdown'}
      >
        <AppText variant="bodySmall" tone="secondary">
          {explainLoading
            ? isRTL
              ? 'جارٍ تحليل البيانات الضريبية...'
              : 'Generating statutory explanation...'
            : explainText}
        </AppText>
        <Button label="Close" variant="primary" onPress={() => setExplainOpen(false)} />
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  header: { flex: 1, gap: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.xs },
  regimeBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    gap: 4,
  },
  regimeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  heroCard: { gap: spacing.xs },
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
  heroAmount: { marginTop: spacing.xxs },
  feedbackBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  card: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: borders.hairline,
  },
  rowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    marginTop: spacing.xxs,
    borderTopWidth: borders.hairline,
    gap: spacing.sm,
  },
  histInfo: { flex: 1, gap: 2 },
});
