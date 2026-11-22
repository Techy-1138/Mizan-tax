// ============================================================================
// Mizan (ميزان) - Native OS Runtime Permissions Helper
// Uses React Native's PermissionsAndroid directly on Android so Android 13+
// (READ_MEDIA_IMAGES) and Android <= 12 (READ_EXTERNAL_STORAGE) always trigger
// the real OS permission dialog instead of expo-image-picker's TIRAMISU no-op.
// ============================================================================

import { PermissionsAndroid, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface OsPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Requests OS Camera runtime permission across Android 6–16+ and iOS.
 */
export async function requestCameraOsPermission(): Promise<OsPermissionResult> {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  }

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  return {
    granted: perm.granted,
    canAskAgain: perm.canAskAgain,
  };
}

/**
 * Requests OS Files / Photos & Media runtime permission across Android 6–16+ and iOS.
 * Android 13+ (API 33+) requests READ_MEDIA_IMAGES directly; Android <= 12 requests READ_EXTERNAL_STORAGE.
 */
export async function requestFilesOsPermission(): Promise<OsPermissionResult> {
  if (Platform.OS === 'android') {
    const apiLevel = Number(Platform.Version);
    const permission =
      apiLevel >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const result = await PermissionsAndroid.request(permission);
    return {
      granted: result === PermissionsAndroid.RESULTS.GRANTED,
      canAskAgain: result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    };
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return {
    granted: perm.granted,
    canAskAgain: perm.canAskAgain,
  };
}
