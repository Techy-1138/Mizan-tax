// ============================================================================
// Mizan (ميزان) - Corporate Tax Registration Deadline Countdown Widget
// Statutory Framework: FTA Decision No. (3) of 2024 on CT Registration Timelines
// & Cabinet Decision No. (75) of 2023 on Administrative Penalties (AED 10,000 fine)
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors, ThemeShadows, radii, spacing, typography, fontStyles } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useBusiness, BusinessEntity } from '../context/BusinessContext';
import { useLocale } from '../context/LocaleContext';
import { AppPreferences } from '../utils/preferences';
import { SmoothModal } from './SmoothModal';

/**
 * Statutory deadline calculator per FTA Decision No. 3 of 2024.
 * Staggered deadline based on license issuance month:
 * - Jan / Feb: 31 May
 * - Mar / Apr: 30 June
 * - May: 31 July
 * - Jun: 31 August
 * - Jul: 30 September
 * - Aug / Sep: 31 October
 * - Oct / Nov: 30 November
 * - Dec: 31 December
 */
export function getCorporateTaxDeadline(issueDateStr?: string): { deadline: Date; monthLabel: string } {
  const currentYear = new Date().getFullYear();
  let issueMonth = 0; // Default: January (0-indexed)

  if (issueDateStr) {
    const parsed = new Date(issueDateStr);
    if (!isNaN(parsed.getTime())) {
      issueMonth = parsed.getMonth(); // 0 to 11
    }
  }

  // FTA Decision No. 3 of 2024 Schedule Map
  switch (issueMonth) {
    case 0: // January
    case 1: // February
      return { deadline: new Date(currentYear, 4, 31, 23, 59, 59), monthLabel: 'Jan-Feb Issuance (Deadline: May 31)' };
    case 2: // March
    case 3: // April
      return { deadline: new Date(currentYear, 5, 30, 23, 59, 59), monthLabel: 'Mar-Apr Issuance (Deadline: June 30)' };
    case 4: // May
      return { deadline: new Date(currentYear, 6, 31, 23, 59, 59), monthLabel: 'May Issuance (Deadline: July 31)' };
    case 5: // June
      return { deadline: new Date(currentYear, 7, 31, 23, 59, 59), monthLabel: 'June Issuance (Deadline: August 31)' };
    case 6: // July
      return { deadline: new Date(currentYear, 8, 30, 23, 59, 59), monthLabel: 'July Issuance (Deadline: September 30)' };
    case 7: // August
    case 8: // September
      return { deadline: new Date(currentYear, 9, 31, 23, 59, 59), monthLabel: 'Aug-Sep Issuance (Deadline: October 31)' };
    case 9: // October
    case 10: // November
      return { deadline: new Date(currentYear, 10, 30, 23, 59, 59), monthLabel: 'Oct-Nov Issuance (Deadline: November 30)' };
    case 11: // December
    default:
      return { deadline: new Date(currentYear, 11, 31, 23, 59, 59), monthLabel: 'Dec Issuance (Deadline: December 31)' };
  }
}

export function CtRegistrationCountdownWidget() {
  const { activeBusiness, addOrUpdateBusiness } = useBusiness();
  const { isRTL } = useLocale();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trnInput, setTrnInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine registration status
  const ctTrn = activeBusiness?.corporateTaxTrn?.trim();
  const isRegistered = Boolean(ctTrn && ctTrn.length >= 10);

  // Compute deadline details
  const { deadline, monthLabel } = useMemo(
    () => getCorporateTaxDeadline(activeBusiness?.issueDate),
    [activeBusiness?.issueDate]
  );

  const daysRemaining = useMemo(() => {
    const now = new Date().getTime();
    const target = deadline.getTime();
    const diff = target - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [deadline]);

  const isOverdue = daysRemaining < 0;

  // Open official EmaraTax portal in browser
  const handleOpenEmaraTax = async () => {
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    const emaraTaxUrl = 'https://eservices.tax.gov.ae/';
    try {
      const supported = await Linking.canOpenURL(emaraTaxUrl);
      if (supported) {
        await Linking.openURL(emaraTaxUrl);
      } else {
        Alert.alert('Portal Link', `Please visit: ${emaraTaxUrl}`);
      }
    } catch {
      Alert.alert('Portal Link', `Please visit: ${emaraTaxUrl}`);
    }
  };

  // Open TRN input modal
  const handleOpenTrnModal = () => {
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    setTrnInput(ctTrn || '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Save TRN to active business entity
  const handleSaveTrn = async () => {
    const cleaned = trnInput.replace(/[^0-9]/g, '');
    if (cleaned.length !== 15) {
      setErrorMessage('UAE Corporate Tax TRN must be exactly 15 digits.');
      AppPreferences.notification(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!activeBusiness?.id) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await addOrUpdateBusiness({
        ...activeBusiness,
        corporateTaxTrn: cleaned,
      });

      AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      setIsModalOpen(false);
      Alert.alert(
        'Corporate Tax TRN Saved',
        `Business is now registered with TRN: ${cleaned}. Countdown has been resolved.`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not save Corporate Tax TRN.');
    } finally {
      setIsSaving(false);
    }
  };

  // If already registered, render compact green reassurance pill/card
  if (isRegistered) {
    return (
      <View style={styles.registeredCard}>
        <View style={styles.registeredHeader}>
          <View style={styles.registeredIconBox}>
            <Ionicons name="shield-checkmark" size={20} color={colors.semantic.success} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.registeredTitle}>
                {isRTL ? 'مسجل في ضريبة الشركات' : 'Corporate Tax Registered'}
              </Text>
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>{isRTL ? 'ممتثل' : 'COMPLIANT'}</Text>
              </View>
            </View>
            <Text style={styles.registeredTrn}>
              TRN: {ctTrn}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editTrnBtn}
            onPress={handleOpenTrnModal}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={colors.neutral.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Modal to update TRN with SmoothModal zero-distortion spring */}
        <SmoothModal
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          maxWidth={420}
        >
          <View style={{ padding: spacing.lg }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Corporate Tax TRN</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter the 15-digit Corporate Tax Registration Number issued by the Federal Tax Authority (FTA).
            </Text>

            <TextInput
              style={styles.trnTextInput}
              value={trnInput}
              onChangeText={setTrnInput}
              placeholder="100XXXXXXXXXXXX"
              placeholderTextColor={colors.neutral.textTertiary}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              keyboardType="numeric"
              maxLength={15}
              autoFocus
            />

            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveTrn}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save TRN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SmoothModal>
      </View>
    );
  }

  // Not registered yet: Render High-Priority Countdown Alert Widget
  return (
    <View style={[styles.countdownCard, isOverdue ? styles.countdownCardOverdue : null]}>
      {/* Top Banner Row */}
      <View style={styles.topRow}>
        <View style={[styles.warningBadge, isOverdue ? styles.warningBadgeOverdue : null]}>
          <Ionicons
            name={isOverdue ? 'alert-circle' : 'time-outline'}
            size={16}
            color={isOverdue ? colors.semantic.risk : colors.semantic.warningDark}
          />
          <Text style={[styles.warningBadgeText, isOverdue ? styles.warningBadgeTextOverdue : null]}>
            {isOverdue ? 'REGISTRATION OVERDUE' : 'CT DEADLINE TRACKER'}
          </Text>
        </View>
        <Text style={styles.scheduleText}>{monthLabel}</Text>
      </View>

      {/* Main Countdown Display */}
      <View style={styles.bodyRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headline}>
            {isOverdue ? 'Action Required Immediately' : 'Corporate Tax Registration Due'}
          </Text>
          <Text style={styles.subheadline}>
            Under FTA Decision No. 3 of 2024, failure to register before the deadline triggers a statutory{' '}
            <Text style={{ fontWeight: '800', color: colors.semantic.riskText }}>AED 10,000 penalty</Text> (Cabinet Decision No. 75/2023).
          </Text>
        </View>

        {/* Days Badge */}
        <View style={[styles.daysBox, isOverdue ? styles.daysBoxOverdue : null]}>
          <Text style={[styles.daysNumber, isOverdue ? styles.daysNumberOverdue : null]}>
            {isOverdue ? Math.abs(daysRemaining) : daysRemaining}
          </Text>
          <Text style={[styles.daysLabel, isOverdue ? styles.daysLabelOverdue : null]}>
            {isOverdue ? 'DAYS LATE' : 'DAYS LEFT'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.emaraTaxBtn}
          onPress={handleOpenEmaraTax}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.emaraTaxBtnText}>Register on EmaraTax</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.enterTrnBtn}
          onPress={handleOpenTrnModal}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={15} color={colors.brand.primary} style={{ marginRight: 6 }} />
          <Text style={styles.enterTrnBtnText}>I Have a CT TRN</Text>
        </TouchableOpacity>
      </View>

      {/* Modal to input 15-digit TRN with SmoothModal zero-distortion spring */}
      <SmoothModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth={420}
      >
        <View style={{ padding: spacing.lg }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Corporate Tax TRN</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Ionicons name="close" size={22} color={colors.neutral.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSub}>
            Enter your 15-digit FTA Corporate Tax Registration Number to clear this penalty alert and link your entity.
          </Text>

          <TextInput
            style={styles.trnTextInput}
            value={trnInput}
            onChangeText={setTrnInput}
            placeholder="e.g. 100123456789012"
            placeholderTextColor={colors.neutral.textTertiary}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            keyboardType="numeric"
            maxLength={15}
            autoFocus
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setIsModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveTrn}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Verify & Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SmoothModal>
    </View>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean, shadows: ThemeShadows) =>
  StyleSheet.create({
    registeredCard: {
      backgroundColor: colors.semantic.successBg,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.semantic.successBorder,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    registeredHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    registeredIconBox: {
      width: 36,
      height: 36,
      borderRadius: radii.full,
      backgroundColor: colors.semantic.successBg,
      borderWidth: 1,
      borderColor: colors.semantic.successBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    registeredTitle: {
      fontFamily: typography.fontFamily.display.semiBold,
      includeFontPadding: false,
      fontSize: 13,
      fontWeight: '700',
      color: colors.semantic.successText,
    },
    activePill: {
      backgroundColor: colors.semantic.successDark,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radii.sm,
      marginLeft: 8,
    },
    activePillText: {
      fontFamily: typography.fontFamily.en.bold,
      includeFontPadding: false,
      color: colors.neutral.onPrimary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    registeredTrn: {
      fontFamily: typography.fontFamily.mono.medium,
      includeFontPadding: false,
      fontSize: 12,
      color: colors.semantic.successText,
      marginTop: 2,
      fontWeight: '500',
    },
    editTrnBtn: {
      padding: 6,
      borderRadius: radii.sm,
      backgroundColor: colors.neutral.surface,
      borderWidth: 1,
      borderColor: colors.semantic.successBorder,
    },
    countdownCard: {
      backgroundColor: colors.semantic.warningBg,
      borderRadius: radii.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.semantic.warningBorder,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    countdownCardOverdue: {
      backgroundColor: colors.semantic.riskBg,
      borderColor: colors.semantic.riskBorder,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    warningBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.semantic.warningBg,
      borderWidth: 1,
      borderColor: colors.semantic.warningBorder,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
    },
    warningBadgeOverdue: {
      backgroundColor: colors.semantic.riskBg,
      borderColor: colors.semantic.riskBorder,
    },
    warningBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.semantic.warningText,
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    warningBadgeTextOverdue: {
      color: colors.semantic.riskText,
    },
    scheduleText: {
      fontSize: 11,
      color: colors.neutral.textSecondary,
      fontWeight: '600',
    },
    bodyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.xs,
    },
    headline: {
      ...fontStyles.displayBold,
      fontSize: 14,
      color: colors.neutral.textPrimary,
      marginBottom: 4,
    },
    subheadline: {
      fontSize: 12,
      color: colors.neutral.textSecondary,
      lineHeight: 17,
    },
    daysBox: {
      backgroundColor: colors.semantic.warning,
      borderRadius: radii.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
      minWidth: 70,
    },
    daysBoxOverdue: {
      backgroundColor: colors.semantic.riskDark,
    },
    daysNumber: {
      ...fontStyles.displayBold,
      fontSize: 20,
      color: colors.neutral.onPrimary,
      lineHeight: 24,
    },
    daysNumberOverdue: {
      color: colors.neutral.onPrimary,
    },
    daysLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.9)',
      letterSpacing: 0.5,
    },
    daysLabelOverdue: {
      color: 'rgba(255,255,255,0.95)',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      gap: 8,
    },
    emaraTaxBtn: {
      flex: 1.2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand.primary,
      paddingVertical: 9,
      borderRadius: radii.md,
    },
    emaraTaxBtnText: {
      color: colors.neutral.onPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    enterTrnBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.neutral.surface,
      borderWidth: 1,
      borderColor: colors.brand.primary,
      paddingVertical: 9,
      borderRadius: radii.md,
    },
    enterTrnBtnText: {
      color: colors.brand.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.neutral.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.neutral.surfaceRaised,
      borderRadius: radii.lg,
      padding: spacing.lg,
      ...shadows.cardHover,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    modalTitle: {
      ...fontStyles.displayBold,
      fontSize: 16,
      color: colors.neutral.textPrimary,
    },
    modalSub: {
      ...fontStyles.bodyRegular,
      fontSize: 12,
      color: colors.neutral.textSecondary,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    trnTextInput: {
      ...fontStyles.monoMedium,
      borderWidth: 1,
      borderColor: colors.neutral.border,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.neutral.textPrimary,
      letterSpacing: 1.5,
      backgroundColor: colors.neutral.surfaceInset,
    },
    errorText: {
      color: colors.semantic.riskText,
      fontSize: 12,
      marginTop: 6,
      fontWeight: '600',
    },
    modalBtnRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: spacing.lg,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.md,
    },
    cancelBtnText: {
      fontSize: 13,
      color: colors.neutral.textSecondary,
      fontWeight: '600',
    },
    saveBtn: {
      backgroundColor: colors.brand.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radii.md,
      minWidth: 90,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 13,
      color: colors.neutral.onPrimary,
      fontWeight: '700',
    },
  });
