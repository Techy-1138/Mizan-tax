// ============================================================================
// Mizan (ميزان) - Expense Categorization & Batch Review Screen
// Real Multi-Tenant Review & Approval Workflow Connected to Backend API
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppPreferences } from '../../src/utils/preferences';
import { ThemeColors, ThemeShadows, radii, spacing } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { MizanApi } from '../../src/services/api';
import { SmoothModal } from '../../src/animations';
import { AnimatedCheckbox, AnimatedSwitch } from '../../src/animations';

type ReviewView = 'hub' | 'single' | 'batch';

export default function ExpenseReviewScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { activeBusiness } = useBusiness();
  // Resolve theme palette & dynamic styles for Light/Dark reactivity
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [currentView, setCurrentView] = useState<ReviewView>('hub');
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Real backend data
  const [pendingExpenses, setPendingExpenses] = useState<any[]>([]);
  const [summaryReport, setSummaryReport] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedExpenseIndex, setSelectedExpenseIndex] = useState(0);

  // Single Review editing state
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [editMerchant, setEditMerchant] = useState('');
  const [editTrn, setEditTrn] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editReceiptNo, setEditReceiptNo] = useState('');
  const [editCategory, setEditCategory] = useState('OFFICE_SUPPLIES');
  const [editCategoryName, setEditCategoryName] = useState('Office Supplies');
  const [editAmount, setEditAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [isEntertainmentSplit, setIsEntertainmentSplit] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Batch selection set
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchExpensesAndSummaries = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setIsLoading(true);
    try {
      const [exps, summary, cats] = await Promise.all([
        MizanApi.getExpenses(activeBusiness.id, 'REVIEW_REQUIRED'),
        MizanApi.getExpenseSummaries(activeBusiness.id),
        MizanApi.getExpenseCategories(),
      ]);

      setPendingExpenses(exps || []);
      setSummaryReport(summary || null);
      if (cats && cats.length > 0) setCategories(cats);

      // Select all by default in batch view
      if (exps && exps.length > 0) {
        setSelectedIds(exps.map((e: any) => e.id));
        setSingleExpenseData(exps[0]);
      } else {
        setSelectedIds([]);
        setSelectedExpense(null);
      }
    } catch (err: any) {
      console.warn('Failed to load review data:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    fetchExpensesAndSummaries();
  }, [fetchExpensesAndSummaries]);

  const setSingleExpenseData = (exp: any) => {
    if (!exp) return;
    setSelectedExpense(exp);
    setEditMerchant(exp.supplierName || 'Merchant');
    setEditTrn(exp.supplierTrn || '');
    setEditDate(exp.expenseDate || '');
    setEditReceiptNo(exp.receiptNumber || '');
    setEditCategory(exp.category || 'OFFICE_SUPPLIES');
    setEditCategoryName(exp.categoryNameEn || 'Office Supplies');
    setEditAmount(exp.totalAmount || 0);
    setEditNotes(exp.notes || '');

    const isEnt =
      exp.isEntertainmentSplit ||
      exp.category === 'ENTERTAINMENT' ||
      exp.category === 'MEALS_ENTERTAINMENT' ||
      (exp.supplierName && /cafe|coffee|restaurant|dining|starbucks|costa|bistro|deliveroo|talabat/i.test(exp.supplierName));
    setIsEntertainmentSplit(Boolean(isEnt));
  };

  const handleOpenSingle = (exp: any, idx: number) => {
    setSelectedExpenseIndex(idx);
    setSingleExpenseData(exp);
    setCurrentView('single');
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingExpenses.map((e) => e.id));
    }
  };

  // Single review actions
  const handleApproveCurrent = async () => {
    if (!selectedExpense?.id) return;
    setIsActionLoading(true);
    try {
      // First update any changes
      await MizanApi.updateExpense(selectedExpense.id, {
        supplierName: editMerchant.trim(),
        supplierTrn: editTrn.trim() || undefined,
        receiptNumber: editReceiptNo.trim() || undefined,
        expenseDate: editDate,
        category: isEntertainmentSplit ? 'MEALS_ENTERTAINMENT' : editCategory,
        totalAmount: editAmount,
        notes: isEntertainmentSplit
          ? `${editNotes.trim() ? editNotes.trim() + ' | ' : ''}Article 32 Entertainment 50% split applied`
          : editNotes.trim() || undefined,
        isEntertainmentSplit,
      });

      // Then approve
      await MizanApi.approveExpense(selectedExpense.id);

      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Expense Approved', `${editMerchant} (AED ${editAmount.toFixed(2)}) approved and added to your ledger.`);

      await fetchExpensesAndSummaries();
      if (pendingExpenses.length > 1) {
        const nextIdx = Math.min(selectedExpenseIndex, pendingExpenses.length - 2);
        const nextExp = pendingExpenses.filter((e) => e.id !== selectedExpense.id)[nextIdx];
        if (nextExp) {
          setSingleExpenseData(nextExp);
        } else {
          setCurrentView('hub');
        }
      } else {
        setCurrentView('hub');
      }
    } catch (err: any) {
      Alert.alert('Approval Error', err?.message || 'Could not approve expense.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectCurrent = async () => {
    if (!selectedExpense?.id) return;
    setIsActionLoading(true);
    try {
      await MizanApi.rejectExpense(selectedExpense.id, editNotes || 'User rejected during review');
      AppPreferences.notification(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Expense Rejected', `${editMerchant} marked as rejected.`);
      await fetchExpensesAndSummaries();
      setCurrentView('hub');
    } catch (err: any) {
      Alert.alert('Rejection Error', err?.message || 'Could not reject expense.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Batch actions
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsActionLoading(true);
    try {
      await MizanApi.batchExpenseAction({
        expenseIds: selectedIds,
        action: 'APPROVE',
      });
      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Batch Approved', `${selectedIds.length} expenses approved and posted to the business ledger.`);
      await fetchExpensesAndSummaries();
      setCurrentView('hub');
    } catch (err: any) {
      Alert.alert('Batch Action Failed', err?.message || 'Could not approve selected expenses.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;
    setIsActionLoading(true);
    try {
      await MizanApi.batchExpenseAction({
        expenseIds: selectedIds,
        action: 'REJECT',
        reason: 'Batch rejected by user',
      });
      AppPreferences.notification(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Batch Rejected', `${selectedIds.length} expenses marked as rejected.`);
      await fetchExpensesAndSummaries();
      setCurrentView('hub');
    } catch (err: any) {
      Alert.alert('Batch Reject Failed', err?.message || 'Could not reject selected expenses.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const toReviewCount = summaryReport?.pendingCount ?? pendingExpenses.length;
  const approvedCount = summaryReport?.approvedCount ?? 0;
  const vatAmountAED = summaryReport?.totalVatAmountAED ?? 0;
  const recordedAmountAED = summaryReport?.totalRecordedExpensesAED ?? 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentView === 'batch') setCurrentView('single');
              else if (currentView === 'single') setCurrentView('hub');
              else router.back();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentView === 'hub'
              ? 'Expense Review & Approval'
              : currentView === 'single'
              ? 'Review & Categorize'
              : 'Batch Expense Review'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {currentView === 'single' && pendingExpenses.length > 0 && (
            <View style={styles.counterIndicator}>
              <Text style={styles.counterText}>
                {selectedExpenseIndex + 1} of {pendingExpenses.length}
              </Text>
            </View>
          )}
          {currentView === 'batch' && (
            <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
              <Text style={styles.selectAllText}>
                {selectedIds.length === pendingExpenses.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}
          {currentView === 'hub' && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push('/expenses/scan')}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text style={styles.loadingText}>Loading expenses for {activeBusiness?.legalName}...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* ==================================================================== */}
          {/* VIEW 1: HUB OVERVIEW                                                 */}
          {/* ==================================================================== */}
          {currentView === 'hub' && (
            <View style={styles.hubSection}>
              <View style={styles.titleBanner}>
                <Text style={styles.mainTitle}>Expense Categorization & Review</Text>
                <Text style={styles.subtitle}>
                  Review unverified OCR receipts, assign standard UAE categories, and approve financial records.
                </Text>
                {activeBusiness && (
                  <View style={styles.activeBizBadge}>
                    <Ionicons name="business-outline" size={13} color={colors.brand.primary} />
                    <Text style={styles.activeBizText}>Active Entity: {activeBusiness.legalName}</Text>
                  </View>
                )}
              </View>

              {/* 4 Metric Counter Cards */}
              <View style={styles.metricsRow}>
                <TouchableOpacity
                  style={[styles.metricCard, styles.metricCardActive]}
                  onPress={() => pendingExpenses.length > 0 && setCurrentView('batch')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="layers" size={18} color={colors.brand.primary} />
                  <Text style={styles.metricCardTitle}>To Review</Text>
                  <Text style={[styles.metricCardVal, { color: colors.brand.primary }]}>{toReviewCount}</Text>
                </TouchableOpacity>

                <View style={styles.metricCard}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.semantic.successDark} />
                  <Text style={styles.metricCardTitle}>Approved</Text>
                  <Text style={styles.metricCardVal}>{approvedCount}</Text>
                </View>

                <View style={styles.metricCard}>
                  <Ionicons name="pie-chart-outline" size={18} color={colors.neutral.textSecondary} />
                  <Text style={styles.metricCardTitle}>Total VAT (5%)</Text>
                  <Text style={styles.metricCardVal}>AED {vatAmountAED.toFixed(0)}</Text>
                </View>

                <View style={styles.metricCard}>
                  <Ionicons name="cash-outline" size={18} color={colors.neutral.textSecondary} />
                  <Text style={styles.metricCardTitle}>Recorded Total</Text>
                  <Text style={styles.metricCardVal}>AED {recordedAmountAED.toFixed(0)}</Text>
                </View>
              </View>

              {/* Expenses to Review List */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.brand.primary} />
                  <Text style={styles.sectionTitle}>Pending Review ({pendingExpenses.length})</Text>
                </View>
                {pendingExpenses.length > 0 && (
                  <TouchableOpacity onPress={() => setCurrentView('batch')}>
                    <Text style={styles.viewAllText}>Batch Action</Text>
                  </TouchableOpacity>
                )}
              </View>

              {pendingExpenses.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.semantic.successDark} />
                  <Text style={styles.emptyTitle}>All Caught Up!</Text>
                  <Text style={styles.emptySub}>
                    Zero pending expense receipts requiring review for {activeBusiness?.legalName}.
                  </Text>
                  <TouchableOpacity
                    style={styles.scanCtaBtn}
                    onPress={() => router.push('/expenses/scan')}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.neutral.onPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.scanCtaText}>Scan New Receipt</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.expensesListCard}>
                  {pendingExpenses.slice(0, 5).map((exp, idx) => (
                    <React.Fragment key={exp.id}>
                      <TouchableOpacity
                        style={styles.expenseItemRow}
                        activeOpacity={0.7}
                        onPress={() => handleOpenSingle(exp, idx)}
                      >
                        <View style={styles.expenseThumb}>
                          <Ionicons name="receipt-outline" size={18} color={colors.neutral.textSecondary} />
                        </View>
                        <View style={styles.expenseInfoCol}>
                          <Text style={styles.expenseMerchant}>{exp.supplierName}</Text>
                          <Text style={styles.expenseDate}>{exp.expenseDate} • {exp.categoryNameEn || exp.category}</Text>
                          <View style={styles.aiSuggestionBadge}>
                            <Ionicons name="sparkles" size={10} color={colors.brand.primary} />
                            <Text style={styles.aiSuggestionText}>Confidence: {exp.ocrConfidence ?? 95}%</Text>
                          </View>
                        </View>
                        <Text style={styles.expenseAmountText}>AED {exp.totalAmount.toFixed(2)}</Text>
                      </TouchableOpacity>
                      {idx < Math.min(4, pendingExpenses.length - 1) && <View style={styles.itemDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              {pendingExpenses.length > 0 && (
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => handleOpenSingle(pendingExpenses[0], 0)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="sparkles" size={18} color={colors.neutral.onPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionText}>
                    Review & Categorize ({pendingExpenses.length}) →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ==================================================================== */}
          {/* VIEW 2: SINGLE EXPENSE REVIEW & APPROVAL                             */}
          {/* ==================================================================== */}
          {currentView === 'single' && selectedExpense && (
            <View style={styles.singleReviewSection}>
              {/* Header Box */}
              <View style={styles.merchantHeaderCard}>
                <View style={styles.receiptThumbBig}>
                  <Ionicons name="receipt" size={32} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.merchantTitle}>{editMerchant}</Text>
                  <Text style={styles.merchantSub}>
                    {editDate} • {editCategoryName}
                  </Text>
                  <View style={styles.scoreRow}>
                    <Ionicons name="shield-outline" size={12} color={colors.semantic.warning} />
                    <Text style={styles.scoreText}>Unverified Extracted Draft • Needs Human Approval</Text>
                  </View>
                </View>
              </View>

              {/* Details Form Card */}
              <View style={styles.formCard}>
                {/* Vendor Name */}
                <View style={styles.formRow}>
                  <Text style={styles.formRowKey}>Vendor / Supplier Name</Text>
                  <TextInput
                    style={styles.formTextInput}
                    value={editMerchant}
                    onChangeText={setEditMerchant}
                    placeholder="Merchant name"
                    placeholderTextColor={colors.neutral.textTertiary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                  />
                </View>
                <View style={styles.itemDivider} />

                {/* Supplier TRN */}
                <View style={styles.formRow}>
                  <Text style={styles.formRowKey}>Supplier TRN (15-digit)</Text>
                  <TextInput
                    style={styles.formTextInput}
                    value={editTrn}
                    onChangeText={setEditTrn}
                    placeholder="100XXXXXXXXXXXX"
                    placeholderTextColor={colors.neutral.textTertiary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.itemDivider} />

                {/* Date */}
                <View style={styles.formRow}>
                  <Text style={styles.formRowKey}>Expense Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formTextInput}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="2026-10-15"
                    placeholderTextColor={colors.neutral.textTertiary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                  />
                </View>
                <View style={styles.itemDivider} />

                {/* Receipt Number */}
                <View style={styles.formRow}>
                  <Text style={styles.formRowKey}>Receipt / Reference #</Text>
                  <TextInput
                    style={styles.formTextInput}
                    value={editReceiptNo}
                    onChangeText={setEditReceiptNo}
                    placeholder="INV-XXXXX"
                    placeholderTextColor={colors.neutral.textTertiary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                  />
                </View>
                <View style={styles.itemDivider} />

                {/* Category Dropdown */}
                <TouchableOpacity
                  style={styles.formRow}
                  onPress={() => setShowCategoryModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.formRowKey}>UAE Expense Category</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.formRowVal, { color: colors.brand.primary }]}>{editCategoryName}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.neutral.textSecondary} style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
                <View style={styles.itemDivider} />

                {/* Total Amount */}
                <View style={styles.formRow}>
                  <Text style={styles.formRowKey}>Total Gross Amount (AED)</Text>
                  <TextInput
                    style={[styles.formTextInput, { fontWeight: '800', color: colors.brand.primary, fontSize: 16 }]}
                    value={String(editAmount)}
                    onChangeText={(val) => setEditAmount(parseFloat(val) || 0)}
                    placeholderTextColor={colors.neutral.textTertiary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemDivider} />

                {/* Article 32 Entertainment & Hospitality Smart-Split */}
                <View style={styles.entertainmentCard}>
                  <View style={styles.entertainmentHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Ionicons name="restaurant-outline" size={16} color={colors.brand.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.entertainmentTitle}>Article 32 Entertainment Split</Text>
                      </View>
                      <Text style={styles.entertainmentSubtitle}>
                        50% CT deduction limit & 100% blocked VAT recovery
                      </Text>
                    </View>
                    <AnimatedSwitch
                      value={isEntertainmentSplit}
                      onValueChange={(val) => {
                        setIsEntertainmentSplit(val);
                        if (val && editCategory !== 'MEALS_ENTERTAINMENT') {
                          setEditCategory('MEALS_ENTERTAINMENT');
                          setEditCategoryName('Meals & Entertainment');
                        }
                      }}
                    />
                  </View>

                  {isEntertainmentSplit && (
                    <View style={styles.entertainmentBreakdown}>
                      <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Corporate Tax Deductible (50%):</Text>
                        <Text style={[styles.splitValue, { color: colors.semantic.success }]}>
                          AED {(editAmount * 0.5).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Corporate Tax Add-Back (50%):</Text>
                        <Text style={[styles.splitValue, { color: colors.semantic.risk }]}>
                          AED {(editAmount * 0.5).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.splitRow}>
                        <Text style={styles.splitLabel}>Input VAT Recovery (Art. 53):</Text>
                        <Text style={[styles.splitValue, { color: colors.semantic.warning, fontWeight: '700' }]}>
                          AED 0.00 (Blocked)
                        </Text>
                      </View>
                      <Text style={styles.splitCitation}>
                        Statutory Reference: Art. 32 Federal Decree-Law No. 47/2022 & Art. 53 Cabinet Decision No. 52/2017.
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.itemDivider} />

                {/* Notes */}
                <View style={styles.notesGroup}>
                  <Text style={styles.formRowKey}>Notes & Compliance Rationale</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add audit notes or justification..."
                    placeholderTextColor={colors.neutral.textTertiary}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    value={editNotes}
                    onChangeText={setEditNotes}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.bottomButtonsRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={handleRejectCurrent}
                  disabled={isActionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={handleApproveCurrent}
                  disabled={isActionLoading}
                  activeOpacity={0.88}
                >
                  {isActionLoading ? (
                    <ActivityIndicator color={colors.neutral.onPrimary} />
                  ) : (
                    <Text style={styles.approveBtnText}>Approve & Post to Ledger →</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ==================================================================== */}
          {/* VIEW 3: BATCH REVIEW                                                 */}
          {/* ==================================================================== */}
          {currentView === 'batch' && (
            <View style={styles.batchSection}>
              {/* Batch Hero Banner */}
              <View style={styles.batchHeroDarkCard}>
                <View style={styles.batchHeroTopRow}>
                  <View style={styles.batchIconSquare}>
                    <Ionicons name="layers" size={20} color={colors.brand.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.batchHeroTitle}>{pendingExpenses.length} Expenses to Review</Text>
                    <Text style={styles.batchHeroSub}>Batch approve or reject verified expenses</Text>
                  </View>
                </View>

                <View style={styles.batchStatsRow}>
                  <View style={styles.batchStatCol}>
                    <Text style={styles.batchStatVal}>
                      AED {pendingExpenses.reduce((sum, e) => sum + e.totalAmount, 0).toFixed(2)}
                    </Text>
                    <Text style={styles.batchStatLabel}>Pending Total</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.batchStatCol}>
                    <Text style={styles.batchStatVal}>{selectedIds.length}</Text>
                    <Text style={styles.batchStatLabel}>Selected</Text>
                  </View>
                </View>
              </View>

              {/* Batch List */}
              <View style={styles.batchListCard}>
                {pendingExpenses.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.batchItemRow}
                    activeOpacity={0.7}
                    onPress={() => toggleSelectId(item.id)}
                  >
                    <AnimatedCheckbox
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelectId(item.id)}
                      size={20}
                      accessibilityLabel={`Select expense ${item.supplierName}`}
                    />

                    <View style={styles.batchItemInfo}>
                      <Text style={styles.batchMerchant}>{item.supplierName}</Text>
                      <Text style={styles.batchMeta}>
                        {item.categoryNameEn || item.category} • {item.expenseDate}
                      </Text>
                    </View>

                    <View style={styles.batchAmountCol}>
                      <Text style={styles.batchAmount}>AED {item.totalAmount.toFixed(2)}</Text>
                      <Text style={styles.matchScoreText}>{item.ocrConfidence ?? 95}% confidence</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Batch Action Buttons */}
              <View style={styles.batchActionsRow}>
                <TouchableOpacity
                  style={[styles.batchCategorizeBtn, selectedIds.length === 0 && { opacity: 0.5 }]}
                  disabled={selectedIds.length === 0 || isActionLoading}
                  onPress={handleBatchApprove}
                  activeOpacity={0.88}
                >
                  {isActionLoading ? (
                    <ActivityIndicator color={colors.neutral.onPrimary} />
                  ) : (
                    <Text style={styles.batchCategorizeText}>
                      Approve Selected ({selectedIds.length})
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.batchMarkBtn, selectedIds.length === 0 && { opacity: 0.5 }]}
                  disabled={selectedIds.length === 0 || isActionLoading}
                  onPress={handleBatchReject}
                  activeOpacity={0.88}
                >
                  <Text style={styles.batchMarkText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Category Selection Modal */}
      <SmoothModal visible={showCategoryModal} onClose={() => setShowCategoryModal(false)} maxWidth={440}>
        <View style={[styles.modalContent, { width: '100%', borderRadius: 0 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select UAE Expense Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.code}
                style={[styles.categoryOption, editCategory === cat.code && styles.categoryOptionActive]}
                onPress={() => {
                  setEditCategory(cat.code);
                  setEditCategoryName(cat.nameEn);
                  setShowCategoryModal(false);
                }}
              >
                <Ionicons name={cat.icon || 'pricetag-outline'} size={18} color={colors.brand.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.catOptionName}>{cat.nameEn}</Text>
                  <Text style={styles.catOptionDesc}>{cat.description}</Text>
                </View>
                {editCategory === cat.code && (
                  <Ionicons name="checkmark" size={18} color={colors.brand.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SmoothModal>
    </SafeAreaView>
  );
}

// Dynamic theme-aware stylesheet factory for ExpenseReviewScreen
const createStyles = (colors: ThemeColors, _isDark: boolean, shadows: ThemeShadows) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  hubSection: {
    flex: 1,
  },
  singleReviewSection: {
    flex: 1,
  },
  batchSection: {
    flex: 1,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    backgroundColor: colors.neutral.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  selectAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  counterIndicator: {
    backgroundColor: colors.brand.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  titleBanner: {
    marginBottom: spacing.md,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral.textSecondary,
    lineHeight: 20,
  },
  activeBizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.blushSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  activeBizText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.primary,
    marginLeft: 6,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.sm,
  },
  metricCardActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.blushSoft,
  },
  metricCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    marginTop: 4,
  },
  metricCardVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginLeft: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  expensesListCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  expenseThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  expenseInfoCol: {
    flex: 1,
  },
  expenseMerchant: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  expenseDate: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 1,
  },
  aiSuggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  aiSuggestionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.primary,
    marginLeft: 4,
  },
  expenseAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.neutral.border,
  },
  primaryActionButton: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  primaryActionText: {
    color: colors.neutral.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  scanCtaBtn: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  scanCtaText: {
    color: colors.neutral.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  merchantHeaderCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    ...shadows.sm,
  },
  receiptThumbBig: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.brand.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  merchantTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  merchantSub: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scoreText: {
    fontSize: 10,
    color: colors.semantic.warning,
    fontWeight: '600',
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  formRow: {
    paddingVertical: 10,
  },
  formRowKey: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  formRowVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  formTextInput: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
    paddingVertical: 2,
  },
  notesGroup: {
    paddingVertical: 10,
  },
  notesInput: {
    fontSize: 13,
    color: colors.neutral.textPrimary,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    borderRadius: radii.md,
    padding: 8,
    marginTop: 4,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: colors.semantic.riskBg,
    borderWidth: 1,
    borderColor: colors.semantic.risk,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: colors.semantic.riskText,
    fontSize: 14,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 2,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  approveBtnText: {
    color: colors.neutral.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  batchHeroDarkCard: {
    backgroundColor: colors.brand.darkHero,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.darkHeroBorder,
    marginBottom: spacing.md,
  },
  batchHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  batchIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchHeroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  batchHeroSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  batchStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  batchStatCol: {
    alignItems: 'center',
  },
  batchStatVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  batchStatLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  batchListCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  batchItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  batchItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  batchMerchant: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  batchMeta: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  batchAmountCol: {
    alignItems: 'flex-end',
  },
  batchAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  matchScoreText: {
    fontSize: 10,
    color: colors.semantic.successDark,
    fontWeight: '600',
    marginTop: 1,
  },
  batchActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  batchCategorizeBtn: {
    flex: 2,
    backgroundColor: colors.brand.primary,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchCategorizeText: {
    color: colors.neutral.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  batchMarkBtn: {
    flex: 1,
    backgroundColor: colors.semantic.riskBg,
    borderWidth: 1,
    borderColor: colors.semantic.risk,
    paddingVertical: 14,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchMarkText: {
    color: colors.semantic.riskText,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.neutral.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.surfaceRaised,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  categoryOptionActive: {
    backgroundColor: colors.brand.blushSoft,
  },
  catOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  catOptionDesc: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  entertainmentCard: {
    backgroundColor: colors.neutral.surfaceSubdued,
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  entertainmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entertainmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  entertainmentSubtitle: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    marginTop: 2,
  },
  entertainmentBreakdown: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  splitLabel: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
  },
  splitValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  splitCitation: {
    fontSize: 10,
    color: colors.neutral.textTertiary,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
