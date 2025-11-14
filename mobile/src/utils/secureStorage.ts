/**
 * Secure Storage Utility
 *
 * Purpose: Secure storage wrapper using react-native-keychain for sensitive data
 * Constitution: Principle IV (Performance - fast secure storage)
 *
 * Uses iOS Keychain and Android Keystore for hardware-backed encryption.
 * All data is stored securely using platform-native secure storage mechanisms.
 *
 * Methods:
 * - setSecureItem(): Store a single secure item
 * - getSecureItem(): Retrieve a single secure item
 * - removeSecureItem(): Remove a single secure item
 * - setSecureItems(): Store multiple secure items
 * - getSecureItems(): Retrieve multiple secure items
 * - clearSecureStorage(): Clear all secure storage
 * - setAuthToken(): Store authentication token
 * - getAuthToken(): Retrieve authentication token
 * - removeAuthToken(): Remove authentication token
 * - setRefreshToken(): Store refresh token
 * - getRefreshToken(): Retrieve refresh token
 * - removeRefreshToken(): Remove refresh token
 *
 * Created: 2025-10-06
 * Updated: 2025-11-10 - Security fix: Replaced SHA-256 with react-native-keychain
 */

import * as Keychain from 'react-native-keychain';

/**
 * Security options for all keychain operations
 * - WHEN_UNLOCKED_THIS_DEVICE_ONLY: Most secure option, requires device unlock
 * - Data is hardware-backed on iOS and Android
 * - No iCloud sync, device-only storage
 */
const SECURITY_OPTIONS: Keychain.Options = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Generate a service name for keychain storage
 * Each key gets its own service to avoid conflicts
 */
function getServiceName(key: string): string {
  return `conest-secure-${key}`;
}

/**
 * Securely store data using react-native-keychain
 *
 * @param key - Unique identifier for the data
 * @param value - Data to store securely
 * @throws Error if storage fails
 *
 * @example
 * await setSecureItem('user_email', 'user@example.com');
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await Keychain.setGenericPassword(
      key, // username field (not used for auth, just metadata)
      value, // password field (the actual secure data)
      {
        ...SECURITY_OPTIONS,
        service: getServiceName(key),
      }
    );
  } catch (error) {
    console.error(`[SecureStorage] Error storing secure item '${key}':`, error);
    throw new Error(`Failed to store secure item: ${key}`);
  }
}

/**
 * Retrieve securely stored data
 *
 * @param key - Unique identifier for the data
 * @returns Stored value or null if not found
 *
 * @example
 * const email = await getSecureItem('user_email');
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: getServiceName(key),
    });

    if (!credentials) {
      return null;
    }

    return credentials.password;
  } catch (error) {
    console.error(`[SecureStorage] Error retrieving secure item '${key}':`, error);
    return null;
  }
}

/**
 * Remove securely stored data
 *
 * @param key - Unique identifier for the data
 * @throws Error if removal fails
 *
 * @example
 * await removeSecureItem('user_email');
 */
export async function removeSecureItem(key: string): Promise<void> {
  try {
    await Keychain.resetGenericPassword({
      service: getServiceName(key),
    });
  } catch (error) {
    console.error(`[SecureStorage] Error removing secure item '${key}':`, error);
    throw new Error(`Failed to remove secure item: ${key}`);
  }
}

/**
 * Store multiple secure items in parallel
 *
 * @param items - Array of [key, value] tuples
 * @throws Error if any storage operation fails
 *
 * @example
 * await setSecureItems([
 *   ['user_email', 'user@example.com'],
 *   ['user_phone', '+1234567890']
 * ]);
 */
export async function setSecureItems(items: Array<[string, string]>): Promise<void> {
  try {
    await Promise.all(
      items.map(([key, value]) => setSecureItem(key, value))
    );
  } catch (error) {
    console.error('[SecureStorage] Error storing secure items:', error);
    throw error;
  }
}

/**
 * Retrieve multiple secure items in parallel
 *
 * @param keys - Array of keys to retrieve
 * @returns Array of [key, value] tuples (value is null if not found)
 *
 * @example
 * const items = await getSecureItems(['user_email', 'user_phone']);
 * // Returns: [['user_email', 'user@example.com'], ['user_phone', '+1234567890']]
 */
export async function getSecureItems(keys: string[]): Promise<Array<[string, string | null]>> {
  try {
    const results = await Promise.all(
      keys.map(async (key) => {
        const value = await getSecureItem(key);
        return [key, value] as [string, string | null];
      })
    );

    return results;
  } catch (error) {
    console.error('[SecureStorage] Error retrieving secure items:', error);
    return keys.map(key => [key, null]);
  }
}

/**
 * Clear all secure storage
 *
 * Note: This only clears items stored through this utility.
 * It does not affect tokens stored via tokenStorage.ts service.
 *
 * @throws Error if clearing fails
 *
 * @example
 * await clearSecureStorage(); // Clears all secure storage on logout
 */
export async function clearSecureStorage(): Promise<void> {
  try {
    // Note: react-native-keychain doesn't provide a way to enumerate all services
    // We can only clear known keys. In practice, this should be called with
    // specific keys to clear, or use removeSecureItem() for individual items.

    // For now, we'll clear common secure items
    const commonKeys = [
      'auth_token',
      'refresh_token',
      'user_data',
      'device_id',
      'encryption_key',
    ];

    await Promise.all(
      commonKeys.map(key =>
        removeSecureItem(key).catch(() => {
          // Ignore errors for non-existent keys
        })
      )
    );
  } catch (error) {
    console.error('[SecureStorage] Error clearing secure storage:', error);
    throw new Error('Failed to clear secure storage');
  }
}

/**
 * Store authentication token securely
 *
 * Note: For token storage, consider using tokenStorage.ts service
 * which provides additional token-specific functionality.
 *
 * @param token - JWT authentication token
 *
 * @example
 * await setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 */
export async function setAuthToken(token: string): Promise<void> {
  await setSecureItem('auth_token', token);
}

/**
 * Retrieve authentication token
 *
 * @returns Token or null if not found
 *
 * @example
 * const token = await getAuthToken();
 */
export async function getAuthToken(): Promise<string | null> {
  return await getSecureItem('auth_token');
}

/**
 * Remove authentication token
 *
 * @example
 * await removeAuthToken(); // Called on logout
 */
export async function removeAuthToken(): Promise<void> {
  await removeSecureItem('auth_token');
}

/**
 * Store refresh token securely
 *
 * @param token - JWT refresh token
 *
 * @example
 * await setRefreshToken('refresh_token_here...');
 */
export async function setRefreshToken(token: string): Promise<void> {
  await setSecureItem('refresh_token', token);
}

/**
 * Retrieve refresh token
 *
 * @returns Token or null if not found
 *
 * @example
 * const refreshToken = await getRefreshToken();
 */
export async function getRefreshToken(): Promise<string | null> {
  return await getSecureItem('refresh_token');
}

/**
 * Remove refresh token
 *
 * @example
 * await removeRefreshToken(); // Called on logout
 */
export async function removeRefreshToken(): Promise<void> {
  await removeSecureItem('refresh_token');
}
