// ============================================================================
// Mizan (ميزان) - Compliance & Tax Reports Screen (Screen 10)
// Monochrome UAE FTA Audit Pack generator, report history, ModalSheet preview,
// and PDF export via expo-print / expo-sharing.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { borders, radii, spacing } from '../../src/theme/tokens';
import { AppText, Badge, Button, Card, ModalSheet } from '../../src/ui';

type ReportTypeKey =
  | 'VAT_RETURN_201_REPORT'
  | 'CORPORATE_TAX_REPORT'
  | 'TAX_READINESS_AUDIT'
  | 'PROFIT_AND_LOSS';

const REPORT_TYPES: { key: ReportTypeKey; en: string; ar: string }[] = [
  { key: 'VAT_RETURN_201_REPORT', en: 'VAT 201', ar: 'ضريبة القيمة المضافة' },
  { key: 'CORPORATE_TAX_REPORT', en: 'Corporate Tax', ar: 'ضريبة الشركات' },
  { key: 'TAX_READINESS_AUDIT', en: 'Readiness', ar: 'الجاهزية' },
  { key: 'PROFIT_AND_LOSS', en: 'P&L', ar: 'الأرباح والخسائر' },
];

/** Builds a clean monochrome HTML document for PDF printing/sharing */
function buildReportHtml(report: any, businessName: string): string {
  const title = report?.title || report?.reportType || 'Mizan Compliance Report';
  const created = (report?.createdAt || new Date().toISOString()).toString().slice(0, 10);
  const payload = JSON.stringify(report?.data || report?.summary || report, null, 2);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #09090B; padding: 32px; }
          h1 { font-size: 20px; margin: 0 0 4px 0; }
          .meta { font-size: 12px; color: #52525B; margin-bottom: 20px; }
          pre { background: #FAFAFA; border: 1px solid #E4E4E7; padding: 16px; border-radius: 8px; font-size: 11px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">${businessName} · Generated ${created} · Mizan UAE Tax</div>
        <pre>${payload}</pre>
      </body>
    </html>
  `;
}

/**
 * Monochrome Compliance & Tax Reports workspace.
 */
export default function ComplianceReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [selectedType, setSelectedType] = useState<ReportTypeKey>('VAT_RETURN_201_REPORT');
  const [reports, setReports] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Preview ModalSheet state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<any | null>(null);

  const loadReports = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setRefreshing(true);
    try {
      const list = await MizanApi.listReports(activeBusiness.id);
      setReports(Array.isArray(list) ? list : []);
    } catch {
      setReports([]);
    } finally {
      setRefreshing(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  /** Generates a new statutory report for FY 2026 */
  const handleGenerate = async () => {
    if (!activeBusiness?.id) return;
    setFeedback(null);
    setGenerating(true);
    try {
      await MizanApi.generateReport({
        businessId: activeBusiness.id,
        reportType: selectedType,
        format: 'PDF',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
      });
      await loadReports();
    } catch (err: any) {
      setFeedback(
        err?.message || (isRTL ? 'تعذر إنشاء التقرير.' : 'Failed to generate report.')
      );
    } finally {
      setGenerating(false);
    }
  };

  /** Opens report details inside a monochrome ModalSheet */
  const handleView = async (id: string) => {
    setBusyId(id);
    try {
      const detail = await MizanApi.getReportById(id);
      setPreviewReport(detail);
      setPreviewOpen(true);
    } catch (err: any) {
      setFeedback(err?.message || 'Could not load report details.');
    } finally {
      setBusyId(null);
    }
  };

  /** Prints/shares report as PDF */
  const handleExportPdf = async (report: any) => {
    setBusyId(report.id);
    try {
      const detail = await MizanApi.getReportById(report.id).catch(() => report);
      const html = buildReportHtml(detail, activeBusiness?.legalName || 'UAE Business');
      if (await Sharing.isAvailableAsync()) {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        await Print.printAsync({ html });
      }
    } catch (err: any) {
      setFeedback(err?.message || 'Could not export PDF.');
    } finally {
      setBusyId(null);
    }
  };

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
          {isRTL ? 'تقارير الامتثال والضرائب' : 'Compliance Reports'}
        </AppText>
        <Badge label={String(reports.length)} variant="outline" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadReports}
            tintColor={colors.neutral.textPrimary}
          />
        }
      >
        {/* Inverted Generator Card */}
        <Card variant="inverted" style={styles.heroCard}>
          <AppText variant="caption" tone="inverted" style={styles.heroMuted}>
            {isRTL ? 'إنشاء ملف تدقيق الهيئة' : 'GENERATE FTA AUDIT PACK'}
          </AppText>
          <AppText variant="bodySmall" tone="inverted" style={styles.heroSub}>
            {isRTL
              ? 'اختر نوع التقرير للسنة المالية 2026'
              : 'Select a statutory report type for FY 2026'}
          </AppText>

          <View style={styles.chipWrap}>
            {REPORT_TYPES.map((rt) => {
              const active = selectedType === rt.key;
              return (
                <Pressable
                  key={rt.key}
                  onPress={() => setSelectedType(rt.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.brand.heroText : 'transparent',
                      borderColor: active ? colors.brand.heroText : colors.brand.heroBorder,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="semiBold"
                    tone={active ? 'primary' : 'inverted'}
                    style={active ? { color: colors.neutral.black } : undefined}
                  >
                    {isRTL ? rt.ar : rt.en}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Button
            label={isRTL ? 'إنشاء التقرير' : 'Generate Report'}
            variant="onHero"
            loading={generating}
            onPress={handleGenerate}
            style={{ marginTop: spacing.xs }}
          />
        </Card>

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

        {/* Generated Reports List */}
        {reports.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AppText variant="body" weight="semiBold">
              {isRTL ? 'لا توجد تقارير بعد' : 'No generated reports yet'}
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              {isRTL
                ? 'اختر نوع التقرير واضغط إنشاء التقرير أعلاه.'
                : 'Choose a report type above and tap Generate Report to build your FTA pack.'}
            </AppText>
          </Card>
        ) : (
          reports.map((rep) => (
            <Card key={rep.id} style={styles.repCard}>
              <View style={styles.repTop}>
                <View style={styles.repInfo}>
                  <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
                    {rep.title || rep.reportType}
                  </AppText>
                  <AppText variant="caption" tone="muted" tabular>
                    {(rep.createdAt || '').toString().slice(0, 10)} · {rep.format || 'PDF'}
                  </AppText>
                </View>
                <Badge label={rep.status || 'READY'} variant="solid" />
              </View>

              <View style={[styles.repFooter, { borderTopColor: colors.neutral.border }]}>
                <Button
                  label={isRTL ? 'عرض' : 'View'}
                  variant="outline"
                  size="md"
                  fullWidth={false}
                  loading={busyId === rep.id}
                  onPress={() => handleView(rep.id)}
                />
                <Button
                  label={isRTL ? 'تصدير PDF' : 'Export PDF'}
                  variant="primary"
                  size="md"
                  fullWidth={false}
                  loading={busyId === rep.id}
                  onPress={() => handleExportPdf(rep)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Report Detail Preview ModalSheet */}
      <ModalSheet
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewReport?.title || previewReport?.reportType || 'Report Summary'}
      >
        <ScrollView style={styles.previewScroll}>
          <AppText variant="mono" tone="secondary">
            {JSON.stringify(previewReport?.data || previewReport?.summary || previewReport, null, 2)}
          </AppText>
        </ScrollView>
        <Button label="Close" variant="primary" onPress={() => setPreviewOpen(false)} />
      </ModalSheet>
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
  heroCard: { gap: spacing.xs },
  heroMuted: { opacity: 0.78 },
  heroSub: { opacity: 0.9 },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  feedbackBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  emptyCard: {
    gap: spacing.xxs,
    paddingVertical: spacing.lg,
  },
  repCard: { gap: spacing.sm },
  repTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  repInfo: { flex: 1, gap: 2 },
  repFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: borders.hairline,
  },
  previewScroll: {
    maxHeight: 280,
  },
});
