// ============================================================================
// Mizan (ميزان) - Tax Invoices Screen (Screen 6)
// Monochrome UAE Tax Invoice ledger: Summary Card, Status Filters, Lifecycle
// Actions (Issue, Mark Paid, PDF Export), and + New Invoice ModalSheet with
// both Manual Entry and Scan Existing Invoice (OCR prefill).
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { VisionOcr } from '../../src/services/visionOcr';
import { requestCameraOsPermission } from '../../src/utils/permissions';
import { borders, radii, spacing } from '../../src/theme/tokens';
import { AppText, Badge, Button, Card, ModalSheet, TextField } from '../../src/ui';

type InvoiceFilter = 'ALL' | 'DRAFT' | 'ISSUED' | 'PAID';
type CreateMode = 'manual' | 'scan';

function formatAED(val: number | string | undefined): string {
  const num = Number(val || 0);
  if (Number.isNaN(num)) return 'AED 0.00';
  return `AED ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Monochrome UAE Tax Invoices workspace.
 */
export default function InvoicesScreen() {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState<InvoiceFilter>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // + New Invoice ModalSheet state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>('manual');
  const [customerName, setCustomerName] = useState('');
  const [customerTrn, setCustomerTrn] = useState('');
  const [description, setDescription] = useState('Consulting Services');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [vatTreatment, setVatTreatment] = useState<'STANDARD_5' | 'ZERO_RATED_0'>('STANDARD_5');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scanLoading, setScanLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadInvoices = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setRefreshing(true);
    try {
      const list = await MizanApi.getInvoices(activeBusiness.id);
      setInvoices(Array.isArray(list) ? list : []);
    } catch {
      setInvoices([]);
    } finally {
      setRefreshing(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const { totalBilled, totalOutputVat } = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        if ((inv.status || '').toUpperCase() === 'VOID') return acc;
        acc.totalBilled += Number(inv.totalAmountAED ?? inv.totalAmount ?? 0);
        acc.totalOutputVat += Number(inv.vatAmountAED ?? inv.taxAmount ?? 0);
        return acc;
      },
      { totalBilled: 0, totalOutputVat: 0 }
    );
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (filter === 'ALL') return invoices;
    return invoices.filter((inv) => (inv.status || 'DRAFT').toUpperCase() === filter);
  }, [invoices, filter]);

  /** Scans an existing invoice photo via OCR and prefills Manual fields */
  const handleScanExistingInvoice = async () => {
    setFeedback(null);
    const perm = await requestCameraOsPermission();
    if (!perm.granted) {
      setFeedback(
        isRTL
          ? 'تم رفض إذن الكاميرا. استخدم الإدخال اليدوي.'
          : 'Camera permission denied. Please use Manual entry.'
      );
      return;
    }

    const pic = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    if (pic.canceled || !pic.assets?.[0]?.base64) return;

    setScanLoading(true);
    try {
      const asset = pic.assets[0];
      const extracted = await VisionOcr.extractReceipt(
        asset.base64!,
        asset.mimeType || 'image/jpeg'
      );
      if (extracted.merchantName) setCustomerName(extracted.merchantName);
      if (extracted.trn) setCustomerTrn(extracted.trn.replace(/\D/g, '').slice(0, 15));
      if (extracted.invoiceDate) setIssueDate(extracted.invoiceDate);
      if (extracted.amountAED) setUnitPrice(extracted.amountAED);
      setCreateMode('manual');
    } catch (err: any) {
      setFeedback(
        err?.message || (isRTL ? 'تعذر مسح الفاتورة.' : 'Could not scan invoice.')
      );
    } finally {
      setScanLoading(false);
    }
  };

  /** Creates customer (if needed) and saves a new draft invoice */
  const handleCreateInvoice = async () => {
    if (!activeBusiness?.id) return;
    setFeedback(null);

    const trimmedCustomer = customerName.trim();
    const cleanTrn = customerTrn.replace(/\s+/g, '');
    const price = Number(unitPrice.replace(/[^0-9.]/g, '') || 0);
    const qty = Number(quantity.replace(/[^0-9.]/g, '') || 1);

    if (!trimmedCustomer || price <= 0 || qty <= 0) {
      setFeedback(
        isRTL
          ? 'يرجى إدخال اسم العميل والسعر والكمية.'
          : 'Customer name, price, and quantity are required.'
      );
      return;
    }
    if (cleanTrn.length > 0 && !/^\d{15}$/.test(cleanTrn)) {
      setFeedback(
        isRTL
          ? 'الرقم الضريبي للعميل يجب أن يتكون من 15 رقماً.'
          : 'Customer TRN must be exactly 15 digits.'
      );
      return;
    }

    setSaving(true);
    try {
      // Reuse existing customer by name or create a new CORPORATE customer
      const existingCustomers = await MizanApi.getCustomers(activeBusiness.id).catch(() => []);
      const match = existingCustomers.find(
        (c: any) => (c.name || '').toLowerCase() === trimmedCustomer.toLowerCase()
      );

      const customer =
        match ||
        (await MizanApi.createCustomer(activeBusiness.id, {
          name: trimmedCustomer,
          customerType: 'CORPORATE',
          billingAddress: 'Dubai, United Arab Emirates',
          ...(cleanTrn ? { trn: cleanTrn } : {}),
        }));

      // Default dueDate = issueDate + 14 days
      const due = new Date(issueDate || Date.now());
      due.setDate(due.getDate() + 14);
      const dueDateStr = due.toISOString().split('T')[0];

      await MizanApi.createDraftInvoice({
        businessId: activeBusiness.id,
        customerId: customer.id,
        issueDate,
        dueDate: dueDateStr,
        currency: 'AED',
        lines: [
          {
            description: description.trim() || 'Services',
            quantity: qty,
            unitPrice: price,
            vatTreatment,
          },
        ],
      });

      setCreateOpen(false);
      setCustomerName('');
      setCustomerTrn('');
      setUnitPrice('');
      await loadInvoices();
    } catch (err: any) {
      setFeedback(
        err?.message || (isRTL ? 'تعذر إنشاء الفاتورة.' : 'Failed to create invoice.')
      );
    } finally {
      setSaving(false);
    }
  };

  /** Issues a draft invoice (locks sequential number) */
  const handleIssue = async (id: string) => {
    setBusyId(id);
    try {
      await MizanApi.issueInvoice(id);
      await loadInvoices();
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to issue invoice.');
    } finally {
      setBusyId(null);
    }
  };

  /** Records full payment against an issued invoice */
  const handleMarkPaid = async (inv: any) => {
    setBusyId(inv.id);
    try {
      const amount = Number(inv.totalAmountAED ?? inv.totalAmount ?? 0);
      await MizanApi.recordInvoicePayment(inv.id, amount);
      await loadInvoices();
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to record payment.');
    } finally {
      setBusyId(null);
    }
  };

  /** Exports bilingual invoice PDF */
  const handleExportPdf = async (id: string) => {
    setBusyId(id);
    try {
      const { html } = await MizanApi.getInvoicePdfHtml(id);
      if (await Sharing.isAvailableAsync()) {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        await Print.printAsync({ html });
      }
    } catch (err: any) {
      setFeedback(err?.message || 'Could not export invoice PDF.');
    } finally {
      setBusyId(null);
    }
  };

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
            onRefresh={loadInvoices}
            tintColor={colors.neutral.textPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <AppText variant="h2">
              {isRTL ? 'الفواتير الضريبية' : 'Tax Invoices'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {isRTL
                ? 'إيرادات المبيعات وضريبة المخرجات (5%)'
                : 'Sales Revenue & Output VAT (5%)'}
            </AppText>
          </View>
          <Button
            label={isRTL ? '+ فاتورة' : '+ New Invoice'}
            variant="primary"
            size="md"
            fullWidth={false}
            onPress={() => {
              setCreateMode('manual');
              setCreateOpen(true);
            }}
          />
        </View>

        {/* Summary Card */}
        <Card variant="inverted" style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <AppText variant="caption" tone="inverted" style={styles.summaryMuted}>
              {isRTL ? 'إجمالي الفواتير' : 'Total Billed (YTD)'}
            </AppText>
            <AppText variant="h2" tone="inverted" tabular>
              {formatAED(totalBilled)}
            </AppText>
          </View>
          <View style={[styles.summaryCol, styles.summaryRight]}>
            <AppText variant="caption" tone="inverted" style={styles.summaryMuted}>
              {isRTL ? 'ضريبة المخرجات (5%)' : 'Output VAT (5%)'}
            </AppText>
            <AppText variant="h2" tone="inverted" tabular>
              {formatAED(totalOutputVat)}
            </AppText>
          </View>
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

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(
            [
              { key: 'ALL', label: isRTL ? 'الكل' : 'All' },
              { key: 'DRAFT', label: isRTL ? 'مسودة' : 'Draft' },
              { key: 'ISSUED', label: isRTL ? 'صادرة' : 'Issued' },
              { key: 'PAID', label: isRTL ? 'مدفوعة' : 'Paid' },
            ] as const
          ).map((chip) => {
            const active = filter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.brand.primary : colors.neutral.surface,
                    borderColor: active ? colors.brand.primary : colors.neutral.border,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="semiBold"
                  tone={active ? 'inverted' : 'primary'}
                >
                  {chip.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AppText variant="body" weight="semiBold">
              {isRTL ? 'لا توجد فواتير بعد' : 'No tax invoices yet'}
            </AppText>
            <AppText variant="bodySmall" tone="secondary">
              {isRTL
                ? 'اضغط على + فاتورة لإنشاء فاتورة يدوياً أو مسح فاتورة حالية.'
                : 'Tap + New Invoice to create a UAE Tax Invoice manually or scan an existing one.'}
            </AppText>
          </Card>
        ) : (
          filteredInvoices.map((inv) => {
            const status = (inv.status || 'DRAFT').toUpperCase();
            const total = inv.totalAmountAED ?? inv.totalAmount ?? 0;
            const vat = inv.vatAmountAED ?? inv.taxAmount ?? 0;
            const number = inv.invoiceNumber || 'DRAFT';
            const customer = inv.customer?.name || inv.customerName || 'Customer';

            return (
              <Card key={inv.id} style={styles.invCard}>
                <View style={styles.invTop}>
                  <View style={styles.invInfo}>
                    <AppText variant="body" weight="semiBold" numberOfLines={1}>
                      {customer}
                    </AppText>
                    <AppText variant="caption" tone="secondary" tabular>
                      {number} · {(inv.issueDate || '').toString().slice(0, 10)}
                    </AppText>
                  </View>
                  <View style={styles.invAmounts}>
                    <AppText variant="body" weight="bold" tabular>
                      {formatAED(total)}
                    </AppText>
                    <AppText variant="caption" tone="muted" tabular>
                      VAT {Number(vat).toFixed(2)}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.invFooter, { borderTopColor: colors.neutral.border }]}>
                  <Badge
                    label={status}
                    variant={status === 'PAID' ? 'solid' : status === 'ISSUED' ? 'outline' : 'muted'}
                  />
                  <View style={styles.invActions}>
                    <Button
                      label="PDF"
                      variant="outline"
                      size="md"
                      fullWidth={false}
                      loading={busyId === inv.id}
                      onPress={() => handleExportPdf(inv.id)}
                    />
                    {status === 'DRAFT' ? (
                      <Button
                        label={isRTL ? 'إصدار' : 'Issue'}
                        variant="primary"
                        size="md"
                        fullWidth={false}
                        loading={busyId === inv.id}
                        onPress={() => handleIssue(inv.id)}
                      />
                    ) : null}
                    {status === 'ISSUED' ? (
                      <Button
                        label={isRTL ? 'تأكيد الدفع' : 'Mark Paid'}
                        variant="primary"
                        size="md"
                        fullWidth={false}
                        loading={busyId === inv.id}
                        onPress={() => handleMarkPaid(inv)}
                      />
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* + New Invoice ModalSheet (Manual Entry + Scan Existing Invoice) */}
      <ModalSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title={isRTL ? 'فاتورة ضريبية جديدة' : 'New Tax Invoice'}
      >
        {/* 2-Way Entry Toggle */}
        <View
          style={[
            styles.modeBar,
            { backgroundColor: colors.neutral.surfaceSubtle, borderColor: colors.neutral.border },
          ]}
        >
          {(
            [
              { key: 'manual', label: isRTL ? 'إدخال يدوي' : 'Manual Entry' },
              { key: 'scan', label: isRTL ? 'مسح فاتورة' : 'Scan Invoice' },
            ] as const
          ).map((m) => {
            const active = createMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setCreateMode(m.key)}
                style={[styles.modeTab, active && { backgroundColor: colors.neutral.surface }]}
              >
                <AppText variant="caption" weight="semiBold" tone={active ? 'primary' : 'secondary'}>
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {createMode === 'scan' ? (
          <View style={styles.scanBox}>
            <Ionicons name="camera-outline" size={28} color={colors.neutral.textPrimary} />
            <AppText variant="bodySmall" tone="secondary" style={styles.centeredText}>
              {isRTL
                ? 'صوّر الفاتورة لاستخراج اسم العميل والرقم الضريبي والمبلغ تلقائياً.'
                : 'Snap an existing invoice to extract Customer Name, TRN, Date, and Amount for review.'}
            </AppText>
            <Button
              label={isRTL ? 'فتح الكاميرا' : 'Scan Existing Invoice'}
              variant="primary"
              loading={scanLoading}
              onPress={handleScanExistingInvoice}
            />
          </View>
        ) : (
          <View style={styles.manualForm}>
            <TextField
              label={isRTL ? 'اسم العميل' : 'Customer Name'}
              placeholder="Emaar Properties PJSC"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <TextField
              label={isRTL ? 'الرقم الضريبي للعميل (اختياري)' : 'Customer TRN (15 digits, Opt.)'}
              placeholder="100567894300003"
              value={customerTrn}
              onChangeText={setCustomerTrn}
              mono
              keyboardType="number-pad"
              maxLength={15}
            />
            <TextField
              label={isRTL ? 'الوصف' : 'Line Item Description'}
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.twoCol}>
              <View style={styles.col}>
                <TextField
                  label={isRTL ? 'السعر (درهم)' : 'Unit Price (AED)'}
                  placeholder="5000"
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  mono
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label={isRTL ? 'الكمية' : 'Qty'}
                  value={quantity}
                  onChangeText={setQuantity}
                  mono
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              {(
                [
                  { key: 'STANDARD_5', label: isRTL ? 'ضريبة 5%' : 'Standard 5% VAT' },
                  { key: 'ZERO_RATED_0', label: isRTL ? 'نسبة الصفر 0%' : 'Zero-Rated 0%' },
                ] as const
              ).map((v) => {
                const active = vatTreatment === v.key;
                return (
                  <Pressable
                    key={v.key}
                    onPress={() => setVatTreatment(v.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.brand.primary : colors.neutral.surface,
                        borderColor: active ? colors.brand.primary : colors.neutral.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight="semiBold"
                      tone={active ? 'inverted' : 'primary'}
                    >
                      {v.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={isRTL ? 'إنشاء مسودة فاتورة' : 'Create Draft Invoice'}
              variant="primary"
              loading={saving}
              onPress={handleCreateInvoice}
            />
          </View>
        )}
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
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryCol: { gap: 4 },
  summaryRight: { alignItems: 'flex-end' },
  summaryMuted: { opacity: 0.78 },
  feedbackBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  emptyCard: {
    gap: spacing.xxs,
    paddingVertical: spacing.lg,
  },
  invCard: { gap: spacing.sm },
  invTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  invInfo: { flex: 1, gap: 2 },
  invAmounts: { alignItems: 'flex-end', gap: 2 },
  invFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: borders.hairline,
    gap: spacing.xs,
  },
  invActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  modeBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  scanBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  centeredText: { textAlign: 'center' },
  manualForm: { gap: spacing.sm },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },
});
