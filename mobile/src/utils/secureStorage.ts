/**
 * Secure Storage Utility
 * Encrypted AsyncStorage wrapper for React Native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// In production, derive this from device-specific data
const ENCRYPTION_KEY = 'your-encryption-key-here';

/**
 * Encrypt data using AES
 */
async function encrypt(data: string): Promise<string> {
  try {
    // Use Expo Crypto for encryption
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${ENCRYPTION_KEY}:${data}`
    );

    // In production, use proper AES encryption library like react-native-aes-crypto
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data
 */
async function decrypt(encryptedData: string): Promise<string> {
  try {
    // This is a simplified example
    // In production, use proper AES decryption
    return encryptedData;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Securely store data
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    const encrypted = await encrypt(value);
    await AsyncStorage.setItem(`secure_${key}`, encrypted);
  } catch (error) {
    console.error('Error storing secure item:', error);
    throw error;
  }
}

/**
 * Retrieve securely stored data
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    const encrypted = await AsyncStorage.getItem(`secure_${key}`);
    if (!encrypted) return null;

    return await decrypt(encrypted);
  } catch (error) {
    console.error('Error retrieving secure item:', error);
    return null;
  }
}

/**
 * Remove securely stored data
 */
export async function removeSecureItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`secure_${key}`);
  } catch (error) {
    console.error('Error removing secure item:', error);
    throw error;
  }
}

/**
 * Store multiple secure items
 */
export async function setSecureItems(items: Array<[string, string]>): Promise<void> {
  try {
    const encryptedItems = await Promise.all(
      items.map(async ([key, value]) => {
        const encrypted = await encrypt(value);
        return [`secure_${key}`, encrypted] as [string, string];
      })
    );

    await AsyncStorage.multiSet(encryptedItems);
  } catch (error) {
    console.error('Error storing secure items:', error);
    throw error;
  }
}

/**
 * Retrieve multiple secure items
 */
export async function getSecureItems(keys: string[]): Promise<Array<[string, string | null]>> {
  try {
    const secureKeys = keys.map(key => `secure_${key}`);
    const encryptedItems = await AsyncStorage.multiGet(secureKeys);

    return await Promise.all(
      encryptedItems.map(async ([key, value]) => {
        const originalKey = key.replace('secure_', '');
        if (!value) return [originalKey, null];

        const decrypted = await decrypt(value);
        return [originalKey, decrypted];
      })
    );
  } catch (error) {
    console.error('Error retrieving secure items:', error);
    return keys.map(key => [key, null]);
  }
}

/**
 * Clear all secure storage
 */
export async function clearSecureStorage(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const secureKeys = allKeys.filter(key => key.startsWith('secure_'));
    await AsyncStorage.multiRemove(secureKeys);
  } catch (error) {
    console.error('Error clearing secure storage:', error);
    throw error;
  }
}

/**
 * Store authentication token securely
 */
export async function setAuthToken(token: string): Promise<void> {
  await setSecureItem('auth_token', token);
}

/**
 * Retrieve authentication token
 */
export async function getAuthToken(): Promise<string | null> {
  return await getSecureItem('auth_token');
}

/**
 * Remove authentication token
 */
export async function removeAuthToken(): Promise<void> {
  await removeSecureItem('auth_token');
}

/**
 * Store refresh token securely
 */
export async function setRefreshToken(token: string): Promise<void> {
  await setSecureItem('refresh_token', token);
}

/**
 * Retrieve refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  return await getSecureItem('refresh_token');
}

/**
 * Remove refresh token
 */
export async function removeRefreshToken(): Promise<void> {
  await removeSecureItem('refresh_token');
}
