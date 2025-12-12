/**
 * Biometric Authentication Utility
 * Face ID, Touch ID, and Fingerprint authentication for React Native
 *
 * TODO: Implement for bare React Native using react-native-biometrics
 */

// import * as LocalAuthentication from 'expo-local-authentication';

export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACIAL_RECOGNITION = 'facial_recognition',
  IRIS = 'iris',
}

/**
 * Check if device supports biometric authentication
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    // const compatible = await LocalAuthentication.hasHardwareAsync();
    // return compatible;
    return false; // TODO: Implement for bare RN
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
}

/**
 * Check if biometric credentials are enrolled
 */
export async function isBiometricEnrolled(): Promise<boolean> {
  try {
    // const enrolled = await LocalAuthentication.isEnrolledAsync();
    // return enrolled;
    return false; // TODO: Implement for bare RN
  } catch (error) {
    console.error('Error checking biometric enrollment:', error);
    return false;
  }
}

/**
 * Get available biometric types
 */
export async function getSupportedBiometrics(): Promise<BiometricType[]> {
  try {
    // const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    // const biometricTypes: BiometricType[] = [];

    // types.forEach(type => {
    //   switch (type) {
    //     case LocalAuthentication.AuthenticationType.FINGERPRINT:
    //       biometricTypes.push(BiometricType.FINGERPRINT);
    //       break;
    //     case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
    //       biometricTypes.push(BiometricType.FACIAL_RECOGNITION);
    //       break;
    //     case LocalAuthentication.AuthenticationType.IRIS:
    //       biometricTypes.push(BiometricType.IRIS);
    //       break;
    //   }
    // });

    // return biometricTypes;
    return []; // TODO: Implement for bare RN
  } catch (error) {
    console.error('Error getting supported biometrics:', error);
    return [];
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometric(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Check if biometric is available
    const isSupported = await isBiometricSupported();
    if (!isSupported) {
      return {
        success: false,
        error: 'Biometric authentication not supported on this device',
      };
    }

    const isEnrolled = await isBiometricEnrolled();
    if (!isEnrolled) {
      return {
        success: false,
        error: 'No biometric credentials enrolled',
      };
    }

    // Attempt authentication
    // const result = await LocalAuthentication.authenticateAsync({
    //   promptMessage: options?.promptMessage || 'Authenticate to continue',
    //   cancelLabel: options?.cancelLabel || 'Cancel',
    //   fallbackLabel: options?.fallbackLabel || 'Use Passcode',
    //   disableDeviceFallback: options?.disableDeviceFallback || false,
    // });

    // if (result.success) {
    //   return { success: true };
    // } else {
    //   return {
    //     success: false,
    //     error: result.error || 'Authentication failed',
    //   };
    // }
    return {
      success: false,
      error: 'Biometric auth not implemented for bare RN',
    }; // TODO: Implement for bare RN
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Get biometric authentication prompt message based on type
 */
export async function getBiometricPromptMessage(): Promise<string> {
  const types = await getSupportedBiometrics();

  if (types.includes(BiometricType.FACIAL_RECOGNITION)) {
    return 'Use Face ID to authenticate';
  } else if (types.includes(BiometricType.FINGERPRINT)) {
    return 'Use Touch ID to authenticate';
  } else if (types.includes(BiometricType.IRIS)) {
    return 'Use Iris scan to authenticate';
  }

  return 'Authenticate to continue';
}

/**
 * Enable biometric authentication for the app
 */
export async function enableBiometric(): Promise<boolean> {
  const isSupported = await isBiometricSupported();
  const isEnrolled = await isBiometricEnrolled();

  return isSupported && isEnrolled;
}

/**
 * Verify biometric before sensitive operation
 */
export async function verifyBiometricForOperation(operationName: string): Promise<boolean> {
  const result = await authenticateWithBiometric({
    promptMessage: `Use biometric to ${operationName}`,
  });

  return result.success;
}

/**
 * Check if app should use biometric authentication
 */
export async function shouldUseBiometric(): Promise<boolean> {
  try {
    const isSupported = await isBiometricSupported();
    const isEnrolled = await isBiometricEnrolled();

    // Check user preference (would be stored in secure storage)
    // const userPreference = await getSecureItem('biometric_enabled');

    return isSupported && isEnrolled;
  } catch (error) {
    return false;
  }
}
