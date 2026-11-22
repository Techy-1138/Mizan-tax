// ============================================================================
// Mizan (ميزان) - Business Onboarding Screen (Screen 3)
// 3-Way UAE Trade License entry (Camera OCR, PDF/Image Upload, Manual) +
// 3-Step Monochrome Wizard wired to VisionOcr and MizanApi.saveTradeLicense().
// ============================================================================

import React, { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { MizanApi, SaveTradeLicensePayload } from '../../src/services/api';
import { VisionOcr } from '../../src/services/visionOcr';
import { getFriendlyErrorMessage } from '../../src/utils/errorMessages';
import {
  requestCameraOsPermission,
  requestFilesOsPermission,
} from '../../src/utils/permissions';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { borders, radii, spacing } from '../../src/theme/tokens';
import { AppText, Badge, Button, Card, Screen, SlideIn, TextField } from '../../src/ui';

type EntryMode = 'scan' | 'upload' | 'manual';
type EntityType = SaveTradeLicensePayload['legalEntityType'];
type JurisdictionType = SaveTradeLicensePayload['jurisdictionType'];

const ENTITY_OPTIONS: { value: EntityType; labelEn: string; labelAr: string }[] = [
  { value: 'LLC', labelEn: 'LLC', labelAr: 'ذ.م.م' },
  { value: 'FREE_ZONE_COMPANY', labelEn: 'FZCO / FZE', labelAr: 'منطقة حرة' },
  { value: 'SOLE_ESTABLISHMENT', labelEn: 'Sole Est.', labelAr: 'مؤسسة فردية' },
  { value: 'NATURAL_PERSON', labelEn: 'Freelancer', labelAr: 'عمل حر' },
  { value: 'BRANCH_OF_FOREIGN_COMPANY', labelEn: 'Branch', labelAr: 'فرع شركة' },
];

const JURISDICTION_OPTIONS: { value: JurisdictionType; labelEn: string; labelAr: string }[] = [
  { value: 'MAINLAND', labelEn: 'Mainland', labelAr: 'داخل الدولة' },
  { value: 'FREE_ZONE', labelEn: 'Free Zone', labelAr: 'منطقة حرة' },
  { value: 'DESIGNATED_FREE_ZONE', labelEn: 'Designated FZ', labelAr: 'منطقة حرة محددة' },
];

/** Normalizes OCR legal form strings into backend LegalEntityType enum values */
function normalizeEntityType(raw?: string): EntityType {
  const s = (raw || '').toUpperCase();
  if (s.includes('FREE') || s.includes('FZE') || s.includes('FZCO')) return 'FREE_ZONE_COMPANY';
  if (s.includes('SOLE')) return 'SOLE_ESTABLISHMENT';
  if (s.includes('FREELANCE') || s.includes('NATURAL')) return 'NATURAL_PERSON';
  if (s.includes('BRANCH')) return 'BRANCH_OF_FOREIGN_COMPANY';
  return 'LLC';
}

/** Normalizes OCR jurisdiction strings into backend JurisdictionType enum values */
function normalizeJurisdictionType(raw?: string): JurisdictionType {
  const s = (raw || '').toUpperCase();
  if (s.includes('DESIGNATED')) return 'DESIGNATED_FREE_ZONE';
  if (s.includes('FREE') || s.includes('DMCC') || s.includes('JAFZA') || s.includes('IFZA')) {
    return 'FREE_ZONE';
  }
  return 'MAINLAND';
}

/**
 * Reads a local file:// or Android content:// URI as a raw base64 string.
 * Uses the modern Expo File API first, falling back to fetch + FileReader.
 */
async function readUriAsBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    const b64 = await file.base64();
    if (b64) return b64;
  } catch {
    // Fall through to fetch + FileReader for content:// URIs
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      if (commaIdx >= 0) {
        resolve(result.slice(commaIdx + 1));
      } else if (result) {
        resolve(result);
      } else {
        reject(new Error('Selected file could not be read.'));
      }
    };
    reader.onerror = () => reject(new Error('Selected file could not be read.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Monochrome 3-Way Trade License Onboarding & 3-Step Entity Wizard.
 */
export default function BusinessOnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isRTL, toggleLocale } = useLocale();
  const { addOrUpdateBusiness } = useBusiness();

  const [mode, setMode] = useState<EntryMode>('manual');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Entity Identity
  const [legalName, setLegalName] = useState('');
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState('');
  const [legalEntityType, setLegalEntityType] = useState<EntityType>('LLC');

  // Step 2: Jurisdiction & Authority
  const [jurisdictionType, setJurisdictionType] = useState<JurisdictionType>('MAINLAND');
  const [emirate, setEmirate] = useState('Dubai');
  const [licensingAuthority, setLicensingAuthority] = useState('DET (DED)');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Step 3: Revenue & Tax Profile
  const [annualRevenue, setAnnualRevenue] = useState('');
  const [vatTrn, setVatTrn] = useState('');
  const [corporateTaxTrn, setCorporateTaxTrn] = useState('');

  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsRequired, setSettingsRequired] = useState(false);

  const parsedRevenue = useMemo(() => {
    const cleaned = annualRevenue.replace(/[^0-9.]/g, '');
    return cleaned ? Number(cleaned) : 0;
  }, [annualRevenue]);

  const isSbrEligible = parsedRevenue > 0 && parsedRevenue <= 3_000_000;

  /** Populates wizard fields from OCR extraction and switches to Manual review */
  const applyOcrResult = async (base64: string, mimeType: string) => {
    setError(null);
    setOcrLoading(true);
    try {
      const extracted = await VisionOcr.extractTradeLicense(base64, mimeType);
      if (extracted.businessName) setLegalName(extracted.businessName);
      if (extracted.licenseNumber) setTradeLicenseNumber(extracted.licenseNumber);
      if (extracted.legalForm) setLegalEntityType(normalizeEntityType(extracted.legalForm));
      if (extracted.jurisdiction) {
        setJurisdictionType(normalizeJurisdictionType(extracted.jurisdiction));
        setLicensingAuthority(extracted.jurisdiction);
      }
      if (extracted.issueDate) setIssueDate(extracted.issueDate);
      if (extracted.expiryDate) setExpiryDate(extracted.expiryDate);

      // Switch to Manual wizard at Step 1 for user confirmation
      setMode('manual');
      setStep(1);
    } catch (err: any) {
      setError(
        getFriendlyErrorMessage(
          err,
          isRTL,
          'Could not extract Trade License details. You can enter them manually.',
          'تعذر استخراج بيانات الرخصة. يمكنك الإدخال يدوياً.'
        )
      );
    } finally {
      setOcrLoading(false);
    }
  };

  /** Requests OS camera permission and launches native camera */
  const handleCameraScan = async () => {
    setError(null);
    setSettingsRequired(false);
    try {
      const perm = await requestCameraOsPermission();
      if (!perm.granted) {
        setSettingsRequired(!perm.canAskAgain);
        setError(
          isRTL
            ? 'تم رفض إذن الكاميرا. اسمح بالوصول من الإعدادات أو استخدم الإدخال اليدوي.'
            : 'Camera permission denied. Allow access in Settings or use Manual entry.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const base64 = asset.base64 || (await readUriAsBase64(asset.uri));
        await applyOcrResult(base64, asset.mimeType || 'image/jpeg');
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL
            ? 'تعذر فتح الكاميرا أو قراءة الصورة.'
            : 'Could not open camera or read captured image.')
      );
    }
  };

  /** Requests OS media/files permission and opens native document picker */
  const handleDocumentUpload = async () => {
    setError(null);
    setSettingsRequired(false);
    try {
      const perm = await requestFilesOsPermission();
      if (!perm.granted) {
        setSettingsRequired(!perm.canAskAgain);
        setError(
          isRTL
            ? 'تم رفض إذن الوصول إلى الملفات والصور. اسمح بالوصول من الإعدادات.'
            : 'Files/Media permission denied. Allow access in Settings to upload a Trade License.'
        );
        return;
      }

      // Keep copyToCacheDirectory: false so content:// URIs are read directly without cache IO issues
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > 10 * 1024 * 1024) {
          setError(
            isRTL
              ? 'حجم الملف يتجاوز 10 ميغابايت. يرجى اختيار ملف أصغر.'
              : 'File exceeds 10 MB limit. Please choose a smaller PDF or image.'
          );
          return;
        }
        const base64 = await readUriAsBase64(asset.uri);
        await applyOcrResult(base64, asset.mimeType || 'application/pdf');
      }
    } catch (err: any) {
      setError(
        err?.message ||
          (isRTL
            ? 'تعذر قراءة الملف المختار. جرب ملفاً آخر أو أدخل البيانات يدوياً.'
            : 'Could not read the selected file. Try another file or enter details manually.')
      );
    }
  };

  /** Validates current step before advancing or submitting */
  const handleNext = async () => {
    setError(null);

    if (step === 1) {
      if (!legalName.trim() || !tradeLicenseNumber.trim()) {
        setError(
          isRTL
            ? 'يرجى إدخال الاسم القانوني ورقم الرخصة التجارية.'
            : 'Legal Name and Trade License Number are required.'
        );
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!licensingAuthority.trim()) {
        setError(
          isRTL ? 'يرجى إدخال جهة الترخيص.' : 'Licensing Authority is required.'
        );
        return;
      }
      setStep(3);
      return;
    }

    // Step 3: Validate optional 15-digit TRNs if provided
    const cleanVat = vatTrn.replace(/\s+/g, '');
    if (cleanVat.length > 0 && !/^\d{15}$/.test(cleanVat)) {
      setError(
        isRTL
          ? 'رقم ضريبة القيمة المضافة يجب أن يتكون من 15 رقماً.'
          : 'UAE VAT TRN must be exactly 15 digits.'
      );
      return;
    }
    const cleanCt = corporateTaxTrn.replace(/\s+/g, '');
    if (cleanCt.length > 0 && !/^\d{15}$/.test(cleanCt)) {
      setError(
        isRTL
          ? 'رقم ضريبة الشركات يجب أن يتكون من 15 رقماً.'
          : 'UAE Corporate Tax TRN must be exactly 15 digits.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: SaveTradeLicensePayload = {
        legalName: legalName.trim(),
        tradeLicenseNumber: tradeLicenseNumber.trim(),
        legalEntityType,
        jurisdictionType,
        licensingAuthority: licensingAuthority.trim(),
        ...(emirate.trim() ? { emirate: emirate.trim() } : {}),
        ...(issueDate.trim() ? { issueDate: issueDate.trim() } : {}),
        ...(expiryDate.trim() ? { expiryDate: expiryDate.trim() } : {}),
        ...(parsedRevenue > 0 ? { annualRevenueEstimateAED: parsedRevenue } : {}),
        ...(cleanVat ? { vatTrn: cleanVat } : {}),
        ...(cleanCt ? { corporateTaxTrn: cleanCt } : {}),
      };

      // Persist through BusinessContext so activeBusiness & cached list update immediately
      await addOrUpdateBusiness(payload);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(
        getFriendlyErrorMessage(
          err,
          isRTL,
          'Failed to save business entity. Please try again.',
          'تعذر حفظ بيانات المنشأة. يرجى المحاولة مرة أخرى.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.scrollContent}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Badge
          label={isRTL ? `الخطوة ${step} من 3` : `Step ${step} of 3`}
          variant="outline"
        />
        <View style={styles.topActions}>
          <Pressable
            onPress={toggleLocale}
            style={[
              styles.pillBtn,
              { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
            ]}
          >
            <AppText variant="caption" weight="semiBold">
              {isRTL ? 'EN' : 'العربية'}
            </AppText>
          </Pressable>
          <Pressable
            onPress={async () => {
              await MizanApi.logout();
              router.replace('/auth/login');
            }}
            style={[
              styles.pillBtn,
              { backgroundColor: colors.neutral.surface, borderColor: colors.neutral.border },
            ]}
          >
            <AppText variant="caption" weight="medium" tone="secondary">
              {isRTL ? 'خروج' : 'Sign Out'}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <AppText variant="h1">
          {isRTL ? 'تسجيل المنشأة الإماراتية' : 'Register UAE Business'}
        </AppText>
        <AppText variant="bodySmall" tone="secondary">
          {isRTL
            ? 'امسح الرخصة التجارية أو أدخل البيانات يدوياً'
            : 'Scan your Trade License or enter entity details manually'}
        </AppText>
      </View>

      {/* 3-Way Segmented Entry Control */}
      <View
        style={[
          styles.modeBar,
          { backgroundColor: colors.neutral.surfaceSubtle, borderColor: colors.neutral.border },
        ]}
      >
        {(
          [
            { key: 'scan', en: 'Scan', ar: 'مسح' },
            { key: 'upload', en: 'Upload', ar: 'رفع ملف' },
            { key: 'manual', en: 'Manual', ar: 'يدوي' },
          ] as const
        ).map((tab) => {
          const active = mode === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setError(null);
                setMode(tab.key);
              }}
              style={[
                styles.modeTab,
                active && { backgroundColor: colors.neutral.surface },
              ]}
            >
              <AppText
                variant="caption"
                weight="semiBold"
                tone={active ? 'primary' : 'secondary'}
              >
                {isRTL ? tab.ar : tab.en}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Error Banner */}
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.neutral.surfaceSubtle,
              borderColor: colors.neutral.borderStrong,
            },
          ]}
        >
          <AppText variant="bodySmall" weight="semiBold">
            {error}
          </AppText>
          {settingsRequired ? (
            <Button
              label={isRTL ? 'فتح إعدادات الجهاز' : 'Open Device Settings'}
              variant="outline"
              size="md"
              onPress={() => Linking.openSettings()}
              style={{ marginTop: spacing.xs }}
            />
          ) : null}
        </View>
      ) : null}

      {/* Mode: Scan or Upload */}
      {mode !== 'manual' ? (
        <Card style={styles.ocrCard}>
          <View style={[styles.ocrBadge, { borderColor: colors.neutral.borderStrong }]}>
            <AppText variant="bodySmall" weight="bold">
              OCR
            </AppText>
          </View>
          <AppText variant="h3" style={styles.centeredText}>
            {mode === 'scan'
              ? isRTL
                ? 'تصوير الرخصة التجارية'
                : 'Capture UAE Trade License'
              : isRTL
                ? 'رفع ملف PDF أو صورة'
                : 'Upload License PDF or Image'}
          </AppText>
          <AppText variant="bodySmall" tone="secondary" style={styles.centeredText}>
            {isRTL
              ? 'يستخرج رقم الرخصة والاسم القانوني وجهة الترخيص تلقائياً.'
              : 'Automatically extracts License No., Legal Name, Authority, and Dates across all 7 Emirates.'}
          </AppText>
          <Button
            label={
              mode === 'scan'
                ? isRTL
                  ? 'فتح الكاميرا'
                  : 'Open Camera Scanner'
                : isRTL
                  ? 'اختيار ملف'
                  : 'Choose File'
            }
            loading={ocrLoading}
            onPress={mode === 'scan' ? handleCameraScan : handleDocumentUpload}
          />
        </Card>
      ) : (
        /* Mode: 3-Step Manual Wizard */
        <Card style={styles.wizardCard}>
          {/* Progress Bar */}
          <View style={styles.stepBarRow}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepSegment,
                  {
                    backgroundColor:
                      s <= step ? colors.brand.primary : colors.neutral.border,
                  },
                ]}
              />
            ))}
          </View>

          {step === 1 ? (
            <SlideIn key="step-1" from={isRTL ? 'left' : 'right'} style={styles.stepFields}>
              <TextField
                label={isRTL ? 'الاسم القانوني' : 'Legal Name'}
                placeholder="Al Nahda Trading LLC"
                value={legalName}
                onChangeText={setLegalName}
              />
              <TextField
                label={isRTL ? 'رقم الرخصة التجارية' : 'Trade License Number'}
                placeholder="CN-4829104"
                value={tradeLicenseNumber}
                onChangeText={setTradeLicenseNumber}
                mono
              />
              <View>
                <AppText variant="bodySmall" weight="medium" tone="secondary" style={styles.chipLabel}>
                  {isRTL ? 'الشكل القانوني' : 'Legal Entity Type'}
                </AppText>
                <View style={styles.chipWrap}>
                  {ENTITY_OPTIONS.map((opt) => {
                    const selected = legalEntityType === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setLegalEntityType(opt.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? colors.brand.primary
                              : colors.neutral.surface,
                            borderColor: selected
                              ? colors.brand.primary
                              : colors.neutral.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight="semiBold"
                          tone={selected ? 'inverted' : 'primary'}
                        >
                          {isRTL ? opt.labelAr : opt.labelEn}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </SlideIn>
          ) : null}

          {step === 2 ? (
            <SlideIn key="step-2" from={isRTL ? 'left' : 'right'} style={styles.stepFields}>
              <View>
                <AppText variant="bodySmall" weight="medium" tone="secondary" style={styles.chipLabel}>
                  {isRTL ? 'النطاق القانوني' : 'Jurisdiction'}
                </AppText>
                <View style={styles.chipWrap}>
                  {JURISDICTION_OPTIONS.map((opt) => {
                    const selected = jurisdictionType === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setJurisdictionType(opt.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? colors.brand.primary
                              : colors.neutral.surface,
                            borderColor: selected
                              ? colors.brand.primary
                              : colors.neutral.border,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight="semiBold"
                          tone={selected ? 'inverted' : 'primary'}
                        >
                          {isRTL ? opt.labelAr : opt.labelEn}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.rowTwoCol}>
                <View style={styles.col}>
                  <TextField
                    label={isRTL ? 'الإمارة' : 'Emirate'}
                    placeholder="Dubai"
                    value={emirate}
                    onChangeText={setEmirate}
                  />
                </View>
                <View style={styles.col}>
                  <TextField
                    label={isRTL ? 'جهة الترخيص' : 'Authority'}
                    placeholder="DET (DED)"
                    value={licensingAuthority}
                    onChangeText={setLicensingAuthority}
                  />
                </View>
              </View>
            </SlideIn>
          ) : null}

          {step === 3 ? (
            <SlideIn key="step-3" from={isRTL ? 'left' : 'right'} style={styles.stepFields}>
              <TextField
                label={isRTL ? 'الإيرادات السنوية المقدرة (درهم)' : 'Est. Annual Revenue (AED)'}
                placeholder="1250000"
                value={annualRevenue}
                onChangeText={setAnnualRevenue}
                mono
                keyboardType="numeric"
              />
              <TextField
                label={isRTL ? 'رقم ضريبة القيمة المضافة (اختياري)' : 'VAT TRN (15 digits, Opt.)'}
                placeholder="100458923100003"
                value={vatTrn}
                onChangeText={setVatTrn}
                mono
                keyboardType="number-pad"
                maxLength={15}
              />
              <TextField
                label={isRTL ? 'رقم ضريبة الشركات (اختياري)' : 'Corporate Tax TRN (Opt.)'}
                placeholder="100458923100003"
                value={corporateTaxTrn}
                onChangeText={setCorporateTaxTrn}
                mono
                keyboardType="number-pad"
                maxLength={15}
              />
              {isSbrEligible ? (
                <View
                  style={[
                    styles.sbrBanner,
                    {
                      backgroundColor: colors.neutral.surfaceSubtle,
                      borderColor: colors.neutral.border,
                    },
                  ]}
                >
                  <AppText variant="caption" tone="secondary">
                    {isRTL
                      ? 'أقل من 3,000,000 درهم: مؤهل لإعفاء الأعمال الصغيرة (0% ضريبة شركات).'
                      : 'Under AED 3,000,000: Eligible for Small Business Relief (0% CT under MD 73/2023).'}
                  </AppText>
                </View>
              ) : null}
            </SlideIn>
          ) : null}

          {/* Wizard Step Navigation */}
          <View style={styles.navRow}>
            {step > 1 ? (
              <Button
                label={isRTL ? 'السابق' : 'Previous'}
                variant="outline"
                fullWidth={false}
                style={styles.navBtn}
                onPress={() => setStep((prev) => (prev === 3 ? 2 : 1))}
              />
            ) : null}
            <Button
              label={
                step === 3
                  ? isRTL
                    ? 'حفظ والمتابعة'
                    : 'Complete Setup'
                  : isRTL
                    ? 'متابعة'
                    : 'Continue'
              }
              variant="primary"
              fullWidth={false}
              loading={submitting}
              style={styles.navBtn}
              onPress={handleNext}
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pillBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  header: {
    gap: spacing.xxs,
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
  errorBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  ocrCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  ocrBadge: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  wizardCard: {
    gap: spacing.md,
  },
  stepBarRow: {
    flexDirection: 'row',
    gap: spacing.xxs + 2,
  },
  stepSegment: {
    flex: 1,
    height: 3,
    borderRadius: radii.pill,
  },
  stepFields: {
    gap: spacing.sm,
  },
  chipLabel: {
    marginBottom: spacing.xs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radii.pill,
    borderWidth: borders.hairline,
  },
  rowTwoCol: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  sbrBanner: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  navBtn: {
    flex: 1,
  },
});
