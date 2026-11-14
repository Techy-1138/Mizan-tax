// ============================================================================
// Mizan (ميزان) - Offline & Cloud Sync Status Pill
// Displays real-time sync state (🟢 Synced / 🟠 N Pending / 🔄 Syncing)
// ============================================================================

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors, radii } from '../theme/tokens';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useOfflineSync } from '../utils/offlineQueue';
import { AppPreferences } from '../utils/preferences';

interface SyncStatusPillProps {
  compact?: boolean;
}

export function SyncStatusPill({ compact = false }: SyncStatusPillProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { pendingCount, isSyncing, flushQueue } = useOfflineSync();

  const handlePress = async () => {
    AppPreferences.impact(Haptics.ImpactFeedbackStyle.Light);
    if (pendingCount > 0) {
      const res = await flushQueue();
      if (res.succeeded > 0) {
        AppPreferences.notification(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Sync Complete',
          `Successfully synchronized ${res.succeeded} pending item(s) to the cloud.`
        );
      } else if (res.failed > 0) {
        Alert.alert(
          'Sync Notice',
          `Could not connect to the cloud. ${res.failed} item(s) remain safely cached locally.`
        );
      }
    } else {
      Alert.alert(
        'Cloud Ledger Synced',
        'All your financial records, VAT calculations, and corporate tax data are fully synchronized with the cloud.'
      );
    }
  };

  if (isSyncing) {
    return (
      <View style={[styles.pill, styles.pillSyncing]}>
        <ActivityIndicator size="small" color={colors.brand.primary} style={{ marginRight: 4, transform: [{ scale: 0.7 }] }} />
        {!compact && <Text style={[styles.pillText, { color: colors.brand.primary }]}>Syncing...</Text>}
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <TouchableOpacity
        style={[styles.pill, styles.pillPending]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons name="cloud-upload-outline" size={13} color={colors.semantic.warningDark} style={{ marginRight: 4 }} />
        <Text style={[styles.pillText, { color: colors.semantic.warningText }]}>
          {pendingCount} Pending
        </Text>
      </TouchableOpacity>
    );
  }

  // Fully synced
  return (
    <TouchableOpacity
      style={[styles.pill, styles.pillSynced]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.greenDot} />
      {!compact && <Text style={[styles.pillText, { color: colors.semantic.successText }]}>Synced</Text>}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.full,
      borderWidth: 1,
    },
    pillSynced: {
      backgroundColor: colors.semantic.successBg,
      borderColor: colors.semantic.successBorder,
    },
    pillPending: {
      backgroundColor: colors.semantic.warningBg,
      borderColor: colors.semantic.warningBorder,
    },
    pillSyncing: {
      backgroundColor: colors.brand.primaryMuted,
      borderColor: colors.brand.blushAlt,
    },
    pillText: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.semantic.success,
      marginRight: 4,
    },
  });
