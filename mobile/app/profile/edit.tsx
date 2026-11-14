// ============================================================================
// Mizan (ميزان) - Dedicated Profile Settings & Custom Identity Screen
// Enables custom username, custom profile picture (instead of auto-fetched Google name),
// organization role management, and contact details
// ============================================================================

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from '../../src/components/SafeAreaView';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { ThemeColors, radii, spacing } from '../../src/theme/tokens';
import { useTheme, useThemedStyles } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useBusiness } from '../../src/context/BusinessContext';
import { AppPreferences } from '../../src/utils/preferences';

const AVATAR_PRESETS = [
  { id: 'founder', icon: 'business-outline', label: 'Founder' },
  { id: 'executive', icon: 'briefcase-outline', label: 'Executive' },
  { id: 'accountant', icon: 'calculator-outline', label: 'Accountant' },
  { id: 'advisor', icon: 'shield-checkmark-outline', label: 'Advisor' },
];

const ROLE_OPTIONS = [
  'Founder & CEO',
  'Managing Director',
  'Finance Manager',
  'Tax Consultant',
  'Operations Admin',
];

export default function EditProfileScreen() {
  const router = useRouter();
  const { isRTL } = useLocale();
  const { currentUser, updateUserProfile } = useBusiness();
  // Resolve theme palette, shadows & dynamic styles for Light/Dark consistency
  const { colors, isDark, shadows } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(
    currentUser?.username ||
      currentUser?.fullName?.toLowerCase().replace(/[^a-z0-9]/g, '_') ||
      'tax_founder'
  );
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [organisationName, setOrganisationName] = useState(
    currentUser?.organisationName || 'UAE Enterprise'
  );
  const [selectedRole, setSelectedRole] = useState(currentUser?.role || 'Founder & CEO');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    currentUser?.profilePictureUrl || null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Compute initials fallback
  const userInitials = fullName
    ? fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MZ';

  const handlePickImage = async () => {
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isRTL ? 'إذن الوصول مطلوب' : 'Permission Required',
          isRTL
            ? 'يرجى منح إذن الوصول إلى الصور لتغيير صورتك الشخصية.'
            : 'Please grant access to your photo gallery to select a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePictureUrl(result.assets[0].uri);
        AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert(
        isRTL ? 'خطأ في اختيار الصورة' : 'Image Selection Error',
        err?.message || 'Could not pick image.'
      );
    }
  };

  const handleTakePhoto = async () => {
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isRTL ? 'إذن الكاميرا مطلوب' : 'Camera Permission Required',
          isRTL
            ? 'يرجى منح إذن استخدام الكاميرا لالتقاط صورة شخصية.'
            : 'Please grant camera access to take a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePictureUrl(result.assets[0].uri);
        AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not take photo.');
    }
  };

  const handlePromptPhotoOptions = () => {
    Alert.alert(
      isRTL ? 'تغيير الصورة الشخصية' : 'Profile Picture',
      isRTL ? 'اختر صورة من المعرض أو التقط صورة جديدة' : 'Choose an option to update your photo:',
      [
        {
          text: isRTL ? 'التقاط صورة' : 'Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: isRTL ? 'اختيار من المعرض' : 'Choose from Library',
          onPress: handlePickImage,
        },
        ...(profilePictureUrl
          ? [
              {
                text: isRTL ? 'إزالة الصورة' : 'Remove Photo',
                style: 'destructive' as const,
                onPress: () => {
                  AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
                  setProfilePictureUrl(null);
                },
              },
            ]
          : []),
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert(
        isRTL ? 'الاسم مطلوب' : 'Name Required',
        isRTL ? 'يرجى إدخال اسمك الكامل أو اسم العرض.' : 'Please enter your full display name.'
      );
      return;
    }

    const cleanUsername = username.trim().replace(/^@/, '');
    if (!cleanUsername) {
      Alert.alert(
        isRTL ? 'اسم المستخدم مطلوب' : 'Username Required',
        isRTL ? 'يرجى إدخال اسم مستخدم فريد لحسابك.' : 'Please enter a unique username handle.'
      );
      return;
    }

    setIsSaving(true);
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateUserProfile({
        fullName: trimmedName,
        username: cleanUsername,
        profilePictureUrl: profilePictureUrl,
        phone: phone.trim() || undefined,
        organisationName: organisationName.trim() || undefined,
      });

      Alert.alert(
        isRTL ? 'تم الحفظ بنجاح' : 'Profile Updated',
        isRTL
          ? 'تم تحديث اسم المستخدم والصورة الشخصية وبيانات الحساب بنجاح.'
          : 'Your username, profile picture, and account details have been saved successfully.',
        [
          {
            text: isRTL ? 'حسناً' : 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not save profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color={colors.neutral.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile & Settings'}
        </Text>

        <TouchableOpacity
          style={[styles.saveHeaderBtn, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.neutral.onPrimary} />
          ) : (
            <Text style={styles.saveHeaderBtnText}>{isRTL ? 'حفظ' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Hero Card */}
          <View style={[styles.avatarHeroCard, shadows.card]}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePromptPhotoOptions}
              activeOpacity={0.85}
            >
              {profilePictureUrl ? (
                <Image source={{ uri: profilePictureUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.cameraIconBadge}>
                <Ionicons name="camera" size={14} color={colors.neutral.onPrimary} />
              </View>
            </TouchableOpacity>

            <Text style={styles.avatarHintTitle}>
              {isRTL ? 'صورتك الشخصية' : 'Profile Picture'}
            </Text>
            <Text style={styles.avatarHintSub}>
              {isRTL
                ? 'اضغط لتغيير صورتك من الكاميرا أو المعرض بدلاً من صورة Google'
                : 'Tap avatar to upload a custom picture instead of the Google default'}
            </Text>

            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={handlePromptPhotoOptions}
                activeOpacity={0.75}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={colors.brand.primary} />
                <Text style={styles.changePhotoBtnText}>
                  {isRTL ? 'تغيير الصورة' : 'Change Photo'}
                </Text>
              </TouchableOpacity>

              {profilePictureUrl && (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => {
                    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
                    setProfilePictureUrl(null);
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.semantic.risk} />
                  <Text style={styles.removePhotoBtnText}>{isRTL ? 'حذف' : 'Remove'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form Fields Card */}
          <View style={[styles.formCard, shadows.card]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-circle-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.sectionTitle}>
                {isRTL ? 'بيانات الحساب الشخصي' : 'Account Identity'}
              </Text>
            </View>

            {/* Full Display Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {isRTL ? 'الاسم الكامل / اسم العرض' : 'Full Name / Display Name'}
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color={colors.neutral.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g., Rashid Al Maktoum"
                  placeholderTextColor={colors.neutral.textTertiary}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  autoCapitalize="words"
                />
              </View>
              <Text style={styles.fieldHelpText}>
                {isRTL
                  ? 'يظهر هذا الاسم في لوحة التحكم وتقارير الامتثال الضريبي.'
                  : 'Shown on dashboard greetings and certified compliance exports.'}
              </Text>
            </View>

            {/* Custom Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {isRTL ? 'اسم المستخدم (Handle)' : 'Username / Unique Handle'}
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.atSymbol}>@</Text>
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={(val) => setUsername(val.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  placeholder="rashid_tax"
                  placeholderTextColor={colors.neutral.textTertiary}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.fieldHelpText}>
                {isRTL
                  ? 'اسم المستخدم الفريد الخاص بك داخل منظومة ميزان.'
                  : 'Custom username independent of Google email or sign-in identity.'}
              </Text>
            </View>

            {/* Email Address (Read-only security badge) */}
            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldLabel}>
                  {isRTL ? 'البريد الإلكتروني الموثق' : 'Verified Email Address'}
                </Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.semantic.successText} />
                  <Text style={styles.verifiedBadgeText}>
                    {isRTL ? 'موثق' : 'Google Verified'}
                  </Text>
                </View>
              </View>
              <View style={[styles.inputContainer, styles.readOnlyInput]}>
                <Ionicons name="mail-outline" size={18} color={colors.neutral.textTertiary} />
                <Text style={styles.readOnlyText}>{currentUser?.email || 'authenticated@user.ae'}</Text>
                <Ionicons name="lock-closed" size={14} color={colors.neutral.textTertiary} />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {isRTL ? 'رقم الهاتف (الإمارات)' : 'UAE Mobile Phone Number'}
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color={colors.neutral.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+971 50 123 4567"
                  placeholderTextColor={colors.neutral.textTertiary}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={styles.fieldHelpText}>
                {isRTL
                  ? 'يستخدم لتنبيهات المواعيد النهائية لإقرارات الهيئة الاتحادية للضرائب.'
                  : 'Used for critical FTA tax return and deadline WhatsApp/SMS reminders.'}
              </Text>
            </View>
          </View>

          {/* Business & Role Card */}
          <View style={[styles.formCard, shadows.card]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="briefcase-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.sectionTitle}>
                {isRTL ? 'المؤسسة والدور الوظيفي' : 'Organisation & Role'}
              </Text>
            </View>

            {/* Organisation Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {isRTL ? 'اسم المجموعة / المنشأة' : 'Organisation Name'}
              </Text>
              <View style={styles.inputContainer}>
                <Ionicons name="business-outline" size={18} color={colors.neutral.textTertiary} />
                <TextInput
                  style={styles.textInput}
                  value={organisationName}
                  onChangeText={setOrganisationName}
                  placeholder="e.g., Al Maktoum Holdings LLC"
                  placeholderTextColor={colors.neutral.textTertiary}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                />
              </View>
            </View>

            {/* Selectable Role */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {isRTL ? 'الدور الوظيفي في المنشأة' : 'Role in Organisation'}
              </Text>
              <View style={styles.rolePillsRow}>
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = selectedRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[styles.rolePill, isSelected && styles.rolePillActive]}
                      onPress={() => {
                        AppPreferences.selection();
                        setSelectedRole(role);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[styles.rolePillText, isSelected && styles.rolePillTextActive]}
                      >
                        {role}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.saveMainBtn, shadows.pillButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.neutral.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.neutral.onPrimary} />
                <Text style={styles.saveMainBtnText}>
                  {isRTL ? 'حفظ التغييرات' : 'Save Profile Changes'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>{isRTL ? 'إلغاء' : 'Cancel'}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Dynamic theme-aware stylesheet factory for EditProfileScreen
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.canvas,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  saveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    color: colors.neutral.onPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  avatarHeroCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.brand.primary,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.neutral.surface,
    elevation: 4,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.neutral.onPrimary,
    letterSpacing: 1,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.surface,
  },
  avatarHintTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  avatarHintSub: {
    fontSize: 12,
    color: colors.neutral.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.primaryMuted,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  changePhotoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.semantic.riskBg,
    borderWidth: 1,
    borderColor: colors.semantic.riskBorder,
  },
  removePhotoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.semantic.risk,
  },
  formCard: {
    backgroundColor: colors.neutral.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.textPrimary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.neutral.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.textPrimary,
    fontWeight: '600',
  },
  atSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  fieldHelpText: {
    fontSize: 11,
    color: colors.neutral.textSecondary,
    paddingHorizontal: 2,
  },
  readOnlyInput: {
    backgroundColor: colors.neutral.surfaceInset,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral.textSecondary,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.semantic.successBg,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.semantic.successText,
  },
  rolePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral.canvas,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  rolePillActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
  rolePillTextActive: {
    color: colors.neutral.onPrimary,
    fontWeight: '700',
  },
  saveMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    height: 52,
    borderRadius: radii.pill,
  },
  saveMainBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.onPrimary,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.textSecondary,
  },
});
