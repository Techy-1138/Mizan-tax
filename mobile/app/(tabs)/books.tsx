// ============================================================================
// Mizan (ميزان) - Books & Expenses Screen (Screen 5)
// Monochrome expense ledger with Receipt OCR capture, Deterministic Bank CSV
// importer (ENBD/ADCB/FAB/Wio), Manual Expense ModalSheet, and 1-tap Approve.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { MizanApi } from '../../src/services/api';
import { AppStorage } from '../../src/utils/storage';
import {
  createOptimisticId,
  isOptimisticId,
  runOptimisticMutation,
} from '../../src/utils/optimistic';
import {
  requestCameraOsPermission,
  requestFilesOsPermission,
} from '../../src/utils/permissions';
import {
  BankStatementParseResult,
  parseBankStatementCsv,
} from '../../src/utils/bankStatementParser';
import { borders, layoutSpacing, radii, spacing } from '../../src/theme/tokens';
import {
  AppText,
  Badge,
  Button,
  Card,
  LedgerSkeleton,
  ModalSheet,
  TextField,
} from '../../src/ui';

// Per-entity AsyncStorage cache key prefix for instant Stale-While-Revalidate Books hydration
const BOOKS_CACHE_PREFIX = 'mizan_books_cache_';

type FilterMode = 'ALL' | 'PENDING' | 'APPROVED';

const EXPENSE_CATEGORIES = [
  { key: 'GENERAL', en: 'General', ar: 'عام' },
  { key: 'DUTY_TRAVEL', en: 'Duty Travel', ar: 'سفر عمل' },
  { key: 'CLIENT_ENTERTAINMENT', en: 'Entertainment (50%)', ar: 'ضيافة (50%)' },
  { key: 'SOFTWARE_SAAS', en: 'Software / SaaS', ar: 'برمجيات' },
];

function formatAED(val: number | string | undefined): string {
  const num = Number(val || 0);
  if (Number.isNaN(num)) return 'AED 0.00';
  return `AED ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Monochrome Books & Expenses workspace.
 */
export default function BooksScreen() {
  const { colors } = useTheme();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalSpendAED, setTotalSpendAED] = useState(0);
  const [recoverableVatAED, setRecoverableVatAED] = useState(0);
  const [filter, setFilter] = useState<FilterMode>('ALL');
  // True only on uncached initial entity load so skeleton renders instead of a premature empty state
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Manual Expense ModalSheet state
  const [manualOpen, setManualOpen] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [vatInput, setVatInput] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('GENERAL');
  const [manualSaving, setManualSaving] = useState(false);

  // Bank CSV Importer ModalSheet state
  const [csvResult, setCsvResult] = useState<BankStatementParseResult | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  const loadBooks = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setRefreshing(true);
    try {
      const [listRes, summaryRes] = await Promise.allSettled([
        MizanApi.getExpenses(activeBusiness.id),
        MizanApi.getExpenseSummaries(activeBusiness.id),
      ]);

      const items =
        listRes.status === 'fulfilled' && Array.isArray(listRes.value) ? listRes.value : [];
      setExpenses(items);

      let nextTotal = 0;
      let nextVat = 0;
      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        const s = summaryRes.value;
        nextTotal = Number(s.totalAmountAED ?? s.totalExpensesAED ?? 0);
        nextVat = Number(s.recoverableVatAED ?? s.totalRecoverableVatAED ?? 0);
      } else {
        // Fallback client-side sum when summary endpoint is unavailable
        nextTotal = items.reduce((acc, e) => acc + Number(e.totalAmountAED ?? e.totalAmount ?? e.amount ?? 0), 0);
        nextVat = items.reduce((acc, e) => acc + Number(e.vatAmountAED ?? e.vatAmount ?? 0), 0);
      }
      setTotalSpendAED(nextTotal);
      setRecoverableVatAED(nextVat);

      // Persist per-entity SWR snapshot for 0ms mount on subsequent visits
      if (listRes.status === 'fulfilled') {
        AppStorage.setItem(
          `${BOOKS_CACHE_PREFIX}${activeBusiness.id}`,
          JSON.stringify({
            expenses: items,
            totalSpendAED: nextTotal,
            recoverableVatAED: nextVat,
          })
        ).catch(() => {});
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [activeBusiness?.id]);

  // Hydrate cached Books ledger immediately when activeBusiness changes (SWR)
  useEffect(() => {
    let cancelled = false;
    if (!activeBusiness?.id) {
      setExpenses([]);
      setTotalSpendAED(0);
      setRecoverableVatAED(0);
      setInitialLoading(false);
      return;
    }

    // Clear previous entity state synchronously to prevent cross-entity flash
    setExpenses([]);
    setTotalSpendAED(0);
    setRecoverableVatAED(0);
    setInitialLoading(true);

    (async () => {
      try {
        const raw = await AppStorage.getItem(`${BOOKS_CACHE_PREFIX}${activeBusiness.id}`);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          setExpenses(Array.isArray(parsed?.expenses) ? parsed.expenses : []);
          setTotalSpendAED(Number(parsed?.totalSpendAED ?? 0));
          setRecoverableVatAED(Number(parsed?.recoverableVatAED ?? 0));
          setInitialLoading(false);
        }
      } catch {
        // Ignore corrupt cache and wait for network response
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const filteredExpenses = useMemo(() => {
    if (filter === 'ALL') return expenses;
    if (filter === 'PENDING') {
      return expenses.filter((e) => (e.status || 'PENDING').toUpperCase() !== 'APPROVED');
    }
    return expenses.filter((e) => (e.status || '').toUpperCase() === 'APPROVED');
  }, [expenses, filter]);

  const pendingCount = useMemo(
    () => expenses.filter((e) => (e.status || 'PENDING').toUpperCase() !== 'APPROVED').length,
    [expenses]
  );

  /** Captures receipt photo and sends to backend OCR */
  const handleScanReceipt = async () => {
    if (!activeBusiness?.id) return;
    setFeedback(null);
    const perm = await requestCameraOsPermission();
    if (!perm.granted) {
      setFeedback(
        isRTL
          ? 'تم رفض إذن الكاميرا. يمكنك استخدام الإدخال اليدوي أو استيراد CSV.'
          : 'Camera permission denied. Use + Manual or Bank CSV instead.'
      );
      return;
    }

    const pic = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    if (pic.canceled || !pic.assets?.[0]?.base64) return;

    setBusyAction('scan');
    try {
      const asset = pic.assets[0];
      await MizanApi.scanExpenseReceipt(
        activeBusiness.id,
        asset.base64!,
        asset.mimeType || 'image/jpeg'
      );
      setFeedback(isRTL ? 'تم مسح الإيصال وحفظه للمراجعة.' : 'Receipt scanned and saved for review.');
      await loadBooks();
    } catch (err: any) {
      setFeedback(err?.message || (isRTL ? 'فشل مسح الإيصال.' : 'Receipt scan failed.'));
    } finally {
      setBusyAction(null);
    }
  };

  /** Picks and parses a UAE bank CSV statement deterministically */
  const handlePickBankCsv = async () => {
    setFeedback(null);
    const perm = await requestFilesOsPermission();
    if (!perm.granted) {
      setFeedback(
        isRTL
          ? 'تم رفض إذن الوصول إلى الملفات. اسمح بالوصول من الإعدادات.'
          : 'Files/Media permission denied. Allow access in Settings.'
      );
      return;
    }
    const doc = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (doc.canceled || !doc.assets?.[0]) return;

    try {
      const content = await FileSystem.readAsStringAsync(doc.assets[0].uri);
      const parsed = parseBankStatementCsv(content, 'AED');
      setCsvResult(parsed);
      setCsvModalOpen(true);
    } catch (err: any) {
      setFeedback(
        err?.message || (isRTL ? 'تعذر قراءة ملف CSV البنكي.' : 'Could not parse bank CSV file.')
      );
    }
  };

  /** Imports parsed debit transactions from Bank CSV optimistically into the ledger */
  const handleConfirmCsvImport = async () => {
    if (!activeBusiness?.id || !csvResult) return;
    const debits = csvResult.parsedTransactions.filter((t) => t.type === 'EXPENSE');
    if (debits.length === 0) {
      setCsvModalOpen(false);
      return;
    }

    // Build client-side SYNCING placeholder rows for instant 0ms ledger feedback
    const optimisticRows = debits.map((tx) => ({
      id: createOptimisticId('exp'),
      businessId: activeBusiness.id,
      merchantName: tx.description,
      expenseDate: tx.date,
      netAmountAED: tx.amountAED,
      vatAmountAED: tx.vatRecoverableAED ?? 0,
      totalAmountAED: tx.amountAED,
      category: tx.category,
      status: 'PENDING',
    }));
    const addedSpend = debits.reduce((sum, tx) => sum + Number(tx.amountAED || 0), 0);
    const addedVat = debits.reduce((sum, tx) => sum + Number(tx.vatRecoverableAED || 0), 0);

    const prevSnapshot = {
      expenses,
      totalSpendAED,
      recoverableVatAED,
    };

    // Dismiss sheet immediately and display pending rows in the ledger
    setCsvImporting(true);
    setCsvModalOpen(false);
    setExpenses((prev) => [...optimisticRows, ...prev]);
    setTotalSpendAED((prev) => prev + addedSpend);
    setRecoverableVatAED((prev) => prev + addedVat);

    try {
      const results = await Promise.allSettled(
        debits.map((tx) =>
          MizanApi.createManualExpense({
            businessId: activeBusiness.id,
            merchantName: tx.description,
            expenseDate: tx.date,
            netAmountAED: tx.amountAED,
            vatAmountAED: tx.vatRecoverableAED ?? 0,
            totalAmountAED: tx.amountAED,
            category: tx.category,
            source: 'BANK_CSV',
          })
        )
      );
      const okCount = results.filter((r) => r.status === 'fulfilled').length;

      if (okCount === 0) {
        // Revert optimistic placeholders if every import failed
        setExpenses(prevSnapshot.expenses);
        setTotalSpendAED(prevSnapshot.totalSpendAED);
        setRecoverableVatAED(prevSnapshot.recoverableVatAED);
        setFeedback(
          isRTL
            ? 'تعذر استيراد معاملات كشف البنك. يرجى المحاولة مرة أخرى.'
            : 'Could not import bank CSV expenses. Please try again.'
        );
        return;
      }

      setFeedback(
        isRTL
          ? `تم استيراد ${okCount} من ${debits.length} مصروفات بنجاح.`
          : `Imported ${okCount} of ${debits.length} bank expenses.`
      );
      await loadBooks();
    } finally {
      setCsvImporting(false);
    }
  };

  /** Saves a manual expense record optimistically with automatic rollback */
  const handleSaveManual = async () => {
    if (!activeBusiness?.id) return;
    const net = Number(amountInput.replace(/[^0-9.]/g, '') || 0);
    const vat = Number(vatInput.replace(/[^0-9.]/g, '') || 0);
    const cleanMerchant = merchantName.trim();
    if (!cleanMerchant || net <= 0) {
      setFeedback(
        isRTL ? 'يرجى إدخال اسم المورد والمبلغ.' : 'Merchant name and amount are required.'
      );
      return;
    }

    const isEntertainment = category === 'CLIENT_ENTERTAINMENT';
    const effectiveVat = isEntertainment ? 0 : vat;
    const effectiveTotal = net + effectiveVat;
    const tempId = createOptimisticId('exp');

    // Construct an immediate client-side ledger entry for zero-latency UI response
    const optimisticExpense = {
      id: tempId,
      businessId: activeBusiness.id,
      merchantName: cleanMerchant,
      expenseDate,
      netAmountAED: net,
      vatAmountAED: effectiveVat,
      totalAmountAED: effectiveTotal,
      category,
      status: 'PENDING',
    };

    // Capture current inputs to restore cleanly if the backend rejects the mutation
    const draftSnapshot = {
      merchant: merchantName,
      amount: amountInput,
      vat: vatInput,
      date: expenseDate,
      cat: category,
    };

    setFeedback(null);
    setManualSaving(true);

    await runOptimisticMutation({
      // Snapshot full list + hero totals before applying optimistic changes
      snapshot: () => ({
        expenses,
        totalSpendAED,
        recoverableVatAED,
      }),
      // Close the sheet and show the new entry in the ledger immediately
      apply: () => {
        setManualOpen(false);
        setMerchantName('');
        setAmountInput('');
        setVatInput('');
        setExpenses((prev) => [optimisticExpense, ...prev]);
        setTotalSpendAED((prev) => prev + effectiveTotal);
        setRecoverableVatAED((prev) => prev + effectiveVat);
      },
      // Commit to Cloud Run / PostgreSQL in the background
      commit: () =>
        MizanApi.createManualExpense({
          businessId: activeBusiness.id,
          merchantName: cleanMerchant,
          expenseDate,
          netAmountAED: net,
          vatAmountAED: effectiveVat,
          totalAmountAED: effectiveTotal,
          category,
        }),
      // Replace temporary entry with canonical server ID and exact backend VAT math
      onSuccess: () => loadBooks(),
      // Revert ledger, hero totals, and draft inputs if backend save fails
      rollback: (prev) => {
        setExpenses(prev.expenses);
        setTotalSpendAED(prev.totalSpendAED);
        setRecoverableVatAED(prev.recoverableVatAED);
        setMerchantName(draftSnapshot.merchant);
        setAmountInput(draftSnapshot.amount);
        setVatInput(draftSnapshot.vat);
        setExpenseDate(draftSnapshot.date);
        setCategory(draftSnapshot.cat);
      },
      onError: (msg) => setFeedback(msg),
      isRTL,
      fallbackEn: 'Failed to save expense.',
      fallbackAr: 'تعذر حفظ المصروف.',
    });

    setManualSaving(false);
  };

  /** Approves a pending expense optimistically into the ledger */
  const handleApprove = async (id: string) => {
    // Guard against acting on an uncommitted client-generated placeholder ID
    if (isOptimisticId(id)) return;

    setFeedback(null);
    setBusyAction(id);

    await runOptimisticMutation({
      // Save exact ledger list prior to status mutation
      snapshot: () => expenses,
      // Flip status to APPROVED immediately in memory
      apply: () => {
        setExpenses((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'APPROVED' } : item))
        );
      },
      commit: () => MizanApi.approveExpense(id),
      // Reconcile server-computed totals and audit fields asynchronously
      onSuccess: () => loadBooks(),
      rollback: (prevExpenses) => {
        setExpenses(prevExpenses);
      },
      onError: (msg) => setFeedback(msg),
      isRTL,
      fallbackEn: 'Failed to approve expense.',
      fallbackAr: 'تعذر اعتماد المصروف.',
    });

    setBusyAction(null);
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
            onRefresh={loadBooks}
            tintColor={colors.neutral.textPrimary}
          />
        }
      >
        {/* Zone 1: Header, Summary Hero, Actions & Filters */}
        <View style={styles.controlsGroup}>
          <View style={styles.headerRow}>
            <View>
              <AppText variant="h2">
                {isRTL ? 'الدفاتر والمصروفات' : 'Books & Expenses'}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {isRTL
                  ? 'الإيصالات وضريبة المدخلات وكشوف البنك'
                  : 'Receipts, Input VAT & Bank CSV'}
              </AppText>
            </View>
            <Badge label={`${expenses.length} items`} variant="outline" />
          </View>

          <Card variant="inverted" paddingSize="lg" style={styles.summaryCard}>
            <View style={styles.summaryCol}>
              <AppText variant="caption" tone="inverted" style={styles.summaryMuted}>
                {isRTL ? 'إجمالي المصروفات' : 'Total Expenses (YTD)'}
              </AppText>
              <AppText variant="h2" tone="inverted" tabular>
                {formatAED(totalSpendAED)}
              </AppText>
            </View>
            <View style={[styles.summaryCol, styles.summaryRight]}>
              <AppText variant="caption" tone="inverted" style={styles.summaryMuted}>
                {isRTL ? 'ضريبة قابلة للاسترداد' : 'Recoverable VAT'}
              </AppText>
              <AppText variant="h2" tone="inverted" tabular>
                {formatAED(recoverableVatAED)}
              </AppText>
            </View>
          </Card>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleScanReceipt}
              disabled={busyAction === 'scan'}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
              ]}
            >
              <Ionicons name="camera-outline" size={16} color={colors.neutral.textInverted} />
              <AppText variant="caption" weight="semiBold" tone="inverted">
                {busyAction === 'scan'
                  ? isRTL
                    ? 'جارٍ المسح...'
                    : 'Scanning...'
                  : isRTL
                    ? 'مسح إيصال'
                    : 'Scan Receipt'}
              </AppText>
            </Pressable>

            <Pressable
              onPress={handlePickBankCsv}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color={colors.neutral.textPrimary}
              />
              <AppText variant="caption" weight="semiBold">
                {isRTL ? 'كشف بنكي' : 'Bank CSV'}
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => setManualOpen(true)}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
              ]}
            >
              <Ionicons name="add-outline" size={16} color={colors.neutral.textPrimary} />
              <AppText variant="caption" weight="semiBold">
                {isRTL ? '+ يدوي' : '+ Manual'}
              </AppText>
            </Pressable>
          </View>

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

          <View style={styles.filterRow}>
            {(
              [
                { key: 'ALL', label: isRTL ? 'الكل' : 'All' },
                { key: 'PENDING', label: isRTL ? `قيد المراجعة (${pendingCount})` : `Pending (${pendingCount})` },
                { key: 'APPROVED', label: isRTL ? 'معتمد' : 'Approved' },
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
        </View>

        {/* Zone 2: Expense Ledger List (Skeleton on uncached initial load) */}
        <View style={styles.ledgerGroup}>
          {initialLoading ? (
            <LedgerSkeleton rows={3} />
          ) : filteredExpenses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AppText variant="body" weight="semiBold">
                {isRTL ? 'لا توجد مصروفات بعد' : 'No expenses recorded'}
              </AppText>
              <AppText variant="bodySmall" tone="secondary">
                {isRTL
                  ? 'امسح إيصالاً أو استورد كشفاً بنكياً بصيغة CSV للبدء.'
                  : 'Scan a receipt, import a UAE bank CSV, or add a manual expense to start.'}
              </AppText>
            </Card>
          ) : (
            filteredExpenses.map((item) => {
              const status = (item.status || 'PENDING').toUpperCase();
              const isApproved = status === 'APPROVED';
              const isPendingSync = isOptimisticId(item.id);
              const total = item.totalAmountAED ?? item.totalAmount ?? item.amount ?? 0;
              const vat = item.vatAmountAED ?? item.vatAmount ?? 0;

              return (
                <Card key={item.id} style={styles.expCard}>
                  <View style={styles.expTop}>
                    <View style={styles.expInfo}>
                      <AppText variant="body" weight="semiBold" numberOfLines={1}>
                        {item.merchantName || 'Expense'}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        {(item.expenseDate || '').toString().slice(0, 10)} ·{' '}
                        {item.category || 'GENERAL'}
                      </AppText>
                    </View>
                    <View style={styles.expAmounts}>
                      <AppText variant="body" weight="bold" tabular>
                        {formatAED(total)}
                      </AppText>
                      <AppText variant="caption" tone="muted" tabular>
                        VAT {Number(vat).toFixed(2)}
                      </AppText>
                    </View>
                  </View>

                  <View style={[styles.expFooter, { borderTopColor: colors.neutral.border }]}>
                    <Badge
                      label={isPendingSync ? (isRTL ? 'جاري المزامنة' : 'SYNCING') : status}
                      variant={isApproved ? 'solid' : 'outline'}
                    />
                    {!isApproved ? (
                      <Button
                        label={isRTL ? 'اعتماد' : 'Approve'}
                        variant="primary"
                        size="md"
                        fullWidth={false}
                        disabled={isPendingSync}
                        loading={busyAction === item.id}
                        onPress={() => handleApprove(item.id)}
                      />
                    ) : null}
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Manual Expense ModalSheet */}
      <ModalSheet
        visible={manualOpen}
        onClose={() => setManualOpen(false)}
        title={isRTL ? 'إضافة مصروف يدوي' : 'Add Manual Expense'}
      >
        <TextField
          label={isRTL ? 'اسم المورد' : 'Merchant / Supplier'}
          placeholder="Emirates Airlines"
          value={merchantName}
          onChangeText={setMerchantName}
        />
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <TextField
              label={isRTL ? 'المبلغ الصافي (درهم)' : 'Net Amount (AED)'}
              placeholder="1000"
              value={amountInput}
              onChangeText={setAmountInput}
              mono
              keyboardType="numeric"
            />
          </View>
          <View style={styles.col}>
            <TextField
              label={isRTL ? 'ضريبة المدخلات (5%)' : 'Input VAT (AED)'}
              placeholder="50"
              value={vatInput}
              onChangeText={setVatInput}
              mono
              keyboardType="numeric"
            />
          </View>
        </View>
        <TextField
          label={isRTL ? 'التاريخ' : 'Date (YYYY-MM-DD)'}
          value={expenseDate}
          onChangeText={setExpenseDate}
          mono
        />
        <View style={styles.catWrap}>
          {EXPENSE_CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCategory(c.key)}
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
                  {isRTL ? c.ar : c.en}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Button
          label={isRTL ? 'حفظ المصروف' : 'Save Expense'}
          variant="primary"
          loading={manualSaving}
          onPress={handleSaveManual}
        />
      </ModalSheet>

      {/* Bank CSV Preview ModalSheet */}
      <ModalSheet
        visible={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        title={csvResult ? `${csvResult.bankName} CSV` : 'Bank CSV Import'}
      >
        {csvResult ? (
          <>
            <AppText variant="bodySmall" tone="secondary">
              Parsed {csvResult.parsedTransactions.length} rows (Debits:{' '}
              {formatAED(csvResult.totalDebitsAED)} · Credits:{' '}
              {formatAED(csvResult.totalCreditsAED)}).
            </AppText>
            <Button
              label={`Import ${csvResult.parsedTransactions.filter((t) => t.type === 'EXPENSE').length} Expenses`}
              variant="primary"
              loading={csvImporting}
              onPress={handleConfirmCsvImport}
            />
          </>
        ) : null}
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
    // Deliberate 24px breathing space separating workspace controls from the ledger stream
    gap: layoutSpacing.sectionGap,
  },
  controlsGroup: {
    gap: layoutSpacing.groupGap,
  },
  ledgerGroup: {
    gap: layoutSpacing.groupGap,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryCol: {
    gap: 4,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryMuted: {
    opacity: 0.78,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
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
  expCard: {
    gap: spacing.sm,
  },
  expTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  expInfo: {
    flex: 1,
    gap: 2,
  },
  expAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  expFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: borders.hairline,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  catWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
