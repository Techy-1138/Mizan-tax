// ============================================================================
// Mizan (ميزان) - Profile & Settings Screen (Screen 8)
// Monochrome identity card, multi-entity switcher & deletion, Appearance
// ('system' | 'light' | 'dark'), EN/AR RTL toggle, Haptics & Shutter Sound
// preferences, and Sign Out.
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBusiness } from '../../src/context/BusinessContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { AppPreferences } from '../../src/utils/preferences';
import { borders, radii, spacing, ThemeMode } from '../../src/theme/tokens';
import { AppText, Badge, Button, Card, ModalSheet, TextField } from '../../src/ui';

function getInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || 'M').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Monochrome Profile, Entity Management & App Preferences screen.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { themeMode, setThemeMode } = useTheme();
  const { isRTL, toggleLocale } = useLocale();
  const {
    currentUser,
    businesses,
    activeBusiness,
    setActiveBusinessId,
    updateUserProfile,
    deleteBusiness,
    logout,
  } = useBusiness();

  const [hapticsEnabled, setHapticsEnabled] = useState(AppPreferences.isHapticsEnabled());
  const [shutterEnabled, setShutterEnabled] = useState(AppPreferences.isShutterSoundEnabled());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit Profile ModalSheet state
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [orgName, setOrgName] = useState(currentUser?.organisationName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delete Business Confirmation ModalSheet state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBiz, setDeletingBiz] = useState(false);

  useEffect(() => {
    AppPreferences.init().then((prefs) => {
      setHapticsEnabled(prefs.hapticsEnabled);
      setShutterEnabled(prefs.shutterSoundEnabled);
    });
  }, []);

  const initials = useMemo(
    () => getInitials(currentUser?.fullName, currentUser?.email),
    [currentUser?.fullName, currentUser?.email]
  );

  const openEditProfile = () => {
    setFullName(currentUser?.fullName || '');
    setUsername(currentUser?.username || '');
    setOrgName(currentUser?.organisationName || '');
    setEditOpen(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setFeedback(null);
    try {
      await updateUserProfile({
        fullName: fullName.trim() || undefined,
        username: username.trim() || undefined,
        organisationName: orgName.trim() || undefined,
      });
      setEditOpen(false);
      setFeedback(isRTL ? 'تم تحديث الملف الشخصي.' : 'Profile updated.');
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleHaptics = async () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    await AppPreferences.update({ hapticsEnabled: next });
  };

  const handleToggleShutter = async () => {
    const next = !shutterEnabled;
    setShutterEnabled(next);
    await AppPreferences.update({ shutterSoundEnabled: next });
  };

  const handleDeleteActiveBusiness = async () => {
    if (!activeBusiness?.id) return;
    setDeletingBiz(true);
    setFeedback(null);
    try {
      const remainingCount = businesses.length - 1;
      await deleteBusiness(activeBusiness.id);
      setDeleteOpen(false);
      if (remainingCount <= 0) {
        router.replace('/onboarding/business');
      }
    } catch (err: any) {
      setDeleteOpen(false);
      setFeedback(err?.message || 'Could not delete business entity.');
    } finally {
      setDeletingBiz(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace('/auth/login');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: colors.neutral.canvas }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AppText variant="h2">
          {isRTL ? 'الحساب والإعدادات' : 'Profile & Settings'}
        </AppText>

        {/* User Identity Card */}
        <Card style={styles.identityCard}>
          <View style={styles.identityLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.brand.primary }]}>
              <AppText variant="body" weight="bold" tone="inverted">
                {initials}
              </AppText>
            </View>
            <View style={styles.identityInfo}>
              <AppText variant="body" weight="bold" numberOfLines={1}>
                {currentUser?.fullName || 'Mizan User'}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {currentUser?.email || '—'}
              </AppText>
              {currentUser?.username ? (
                <AppText variant="caption" tone="muted" tabular>
                  @{currentUser.username}
                </AppText>
              ) : null}
            </View>
          </View>
          <Button
            label={isRTL ? 'تعديل' : 'Edit'}
            variant="outline"
            size="md"
            fullWidth={false}
            onPress={openEditProfile}
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

        {/* Business Entities Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <AppText variant="caption" weight="semiBold" tone="secondary">
              {isRTL ? 'المنشآت التجارية' : 'BUSINESS ENTITIES'}
            </AppText>
            <Pressable onPress={() => router.push('/onboarding/business')}>
              <AppText variant="caption" weight="semiBold" style={styles.underline}>
                {isRTL ? '+ إضافة منشأة' : '+ Add Business'}
              </AppText>
            </Pressable>
          </View>

          {businesses.map((biz) => {
            const isActive = biz.id === activeBusiness?.id;
            return (
              <Pressable
                key={biz.id}
                onPress={() => setActiveBusinessId(biz.id)}
                style={[styles.bizRow, { borderTopColor: colors.neutral.border }]}
              >
                <View style={styles.bizInfo}>
                  <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                    {biz.legalName}
                  </AppText>
                  <AppText variant="caption" tone="muted" tabular>
                    {biz.tradeLicenseNumber} · {biz.jurisdictionType}
                  </AppText>
                </View>
                <Badge
                  label={isActive ? (isRTL ? 'نشط' : 'ACTIVE') : isRTL ? 'تبديل' : 'Switch'}
                  variant={isActive ? 'solid' : 'outline'}
                />
              </Pressable>
            );
          })}
        </Card>

        {/* Appearance & Preferences Card */}
        <Card style={styles.sectionCard}>
          <AppText variant="caption" weight="semiBold" tone="secondary">
            {isRTL ? 'المظهر والتفضيلات' : 'APPEARANCE & PREFERENCES'}
          </AppText>

          {/* Theme Mode Segmented Control */}
          <View
            style={[
              styles.modeBar,
              { backgroundColor: colors.neutral.surfaceSubtle, borderColor: colors.neutral.border },
            ]}
          >
            {(
              [
                { key: 'system', en: 'System', ar: 'النظام' },
                { key: 'light', en: 'Light', ar: 'فاتح' },
                { key: 'dark', en: 'Dark', ar: 'داكن' },
              ] as const
            ).map((opt) => {
              const active = themeMode === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setThemeMode(opt.key as ThemeMode)}
                  style={[styles.modeTab, active && { backgroundColor: colors.neutral.surface }]}
                >
                  <AppText
                    variant="caption"
                    weight="semiBold"
                    tone={active ? 'primary' : 'secondary'}
                  >
                    {isRTL ? opt.ar : opt.en}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Language Row */}
          <View style={[styles.prefRow, { borderTopColor: colors.neutral.border }]}>
            <AppText variant="bodySmall" weight="medium">
              {isRTL ? 'اللغة (EN / العربية)' : 'Language (EN / العربية)'}
            </AppText>
            <Button
              label={isRTL ? 'العربية' : 'English'}
              variant="outline"
              size="md"
              fullWidth={false}
              onPress={toggleLocale}
            />
          </View>

          {/* Haptics Row */}
          <Pressable
            onPress={handleToggleHaptics}
            style={[styles.prefRow, { borderTopColor: colors.neutral.border }]}
          >
            <AppText variant="bodySmall" weight="medium">
              {isRTL ? 'الاهتزاز اللمسي' : 'Haptic Feedback'}
            </AppText>
            <Badge
              label={hapticsEnabled ? 'ON' : 'OFF'}
              variant={hapticsEnabled ? 'solid' : 'outline'}
            />
          </Pressable>

          {/* Shutter Sound Row */}
          <Pressable
            onPress={handleToggleShutter}
            style={[styles.prefRow, { borderTopColor: colors.neutral.border }]}
          >
            <AppText variant="bodySmall" weight="medium">
              {isRTL ? 'صوت الكاميرا' : 'Camera Shutter Sound'}
            </AppText>
            <Badge
              label={shutterEnabled ? 'ON' : 'OFF'}
              variant={shutterEnabled ? 'solid' : 'outline'}
            />
          </Pressable>
        </Card>

        {/* Danger Zone & Sign Out */}
        <View style={styles.bottomActions}>
          {activeBusiness ? (
            <Button
              label={isRTL ? 'حذف المنشأة النشطة' : 'Delete Active Business'}
              variant="outline"
              onPress={() => setDeleteOpen(true)}
            />
          ) : null}
          <Button
            label={isRTL ? 'تسجيل الخروج' : 'Sign Out'}
            variant="primary"
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>

      {/* Edit Profile ModalSheet */}
      <ModalSheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title={isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile'}
      >
        <TextField
          label={isRTL ? 'الاسم الكامل' : 'Full Name'}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextField
          label={isRTL ? 'اسم المستخدم' : 'Username (@handle)'}
          placeholder="tariq"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextField
          label={isRTL ? 'اسم المؤسسة' : 'Organisation Name'}
          value={orgName}
          onChangeText={setOrgName}
        />
        <Button
          label={isRTL ? 'حفظ التغييرات' : 'Save Changes'}
          variant="primary"
          loading={savingProfile}
          onPress={handleSaveProfile}
        />
      </ModalSheet>

      {/* Delete Business Confirmation ModalSheet */}
      <ModalSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={isRTL ? 'تأكيد الحذف' : 'Delete Business Entity?'}
      >
        <AppText variant="bodySmall" tone="secondary">
          {isRTL
            ? `سيتم حذف "${activeBusiness?.legalName}" وكافة الفواتير والمصروفات المرتبطة بها نهائياً.`
            : `This will permanently delete "${activeBusiness?.legalName}" and its associated tax/ledger records.`}
        </AppText>
        <Button
          label={isRTL ? 'نعم، حذف المنشأة' : 'Confirm Delete'}
          variant="primary"
          loading={deletingBiz}
          onPress={handleDeleteActiveBusiness}
        />
        <Button
          label={isRTL ? 'إلغاء' : 'Cancel'}
          variant="outline"
          onPress={() => setDeleteOpen(false)}
        />
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
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identityLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityInfo: { flex: 1, gap: 2 },
  feedbackBox: {
    borderWidth: borders.hairline,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  sectionCard: { gap: spacing.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  underline: { textDecorationLine: 'underline' },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    marginTop: spacing.xxs,
    borderTopWidth: borders.hairline,
    gap: spacing.sm,
  },
  bizInfo: { flex: 1, gap: 2 },
  modeBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.md,
    borderWidth: borders.hairline,
    gap: 4,
    marginTop: spacing.xxs,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    marginTop: spacing.xxs,
    borderTopWidth: borders.hairline,
  },
  bottomActions: { gap: spacing.xs },
});
