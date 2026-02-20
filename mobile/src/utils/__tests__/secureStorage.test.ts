/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Secure Storage Utility Tests
 * Comprehensive test coverage for react-native-keychain based secure storage
 */

import * as Keychain from 'react-native-keychain';
import {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  setSecureItems,
  getSecureItems,
  clearSecureStorage,
  setAuthToken,
  getAuthToken,
  removeAuthToken,
  setRefreshToken,
  getRefreshToken,
  removeRefreshToken,
} from '../secureStorage';

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setSecureItem', () => {
    it('should store data securely using react-native-keychain', async () => {
      const key = 'testKey';
      const value = 'testValue';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(key, value, {
        accessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
        service: `conest-secure-${key}`,
      });
    });

    it('should handle empty string values', async () => {
      const key = 'emptyKey';
      const value = '';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        key,
        value,
        expect.objectContaining({
          service: `conest-secure-${key}`,
        })
      );
    });

    it('should handle special characters in values', async () => {
      const key = 'specialKey';
      const value = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(key, value, expect.any(Object));
    });

    it('should handle large data strings', async () => {
      const key = 'largeKey';
      const value = 'x'.repeat(10000); // 10KB string

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(key, value, expect.any(Object));
    });

    it('should throw error when keychain storage fails', async () => {
      const key = 'failKey';
      const value = 'failValue';

      (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      await expect(setSecureItem(key, value)).rejects.toThrow(
        `Failed to store secure item: ${key}`,
      );
    });

    it('should use unique service names for different keys', async () => {
      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem('key1', 'value1');
      await setSecureItem('key2', 'value2');

      expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
        1,
        'key1',
        'value1',
        expect.objectContaining({ service: 'conest-secure-key1' })
      );
      expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
        2,
        'key2',
        'value2',
        expect.objectContaining({ service: 'conest-secure-key2' })
      );
    });
  });

  describe('getSecureItem', () => {
    it('should retrieve stored data from keychain', async () => {
      const key = 'testKey';
      const value = 'testValue';

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: key,
        password: value,
        service: `conest-secure-${key}`,
      });

      const result = await getSecureItem(key);

      expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
        service: `conest-secure-${key}`,
      });
      expect(result).toBe(value);
    });

    it('should return null when key does not exist', async () => {
      const key = 'nonExistentKey';

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

      const result = await getSecureItem(key);

      expect(result).toBeNull();
    });

    it('should return null on retrieval error', async () => {
      const key = 'errorKey';

      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(
        new Error('Keychain retrieval failed')
      );

      const result = await getSecureItem(key);

      expect(result).toBeNull();
    });

    it('should handle Unicode values', async () => {
      const key = 'unicodeKey';
      const value = '你好世界 🌍 مرحبا';

      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: key,
        password: value,
      });

      const result = await getSecureItem(key);

      expect(result).toBe(value);
    });
  });

  describe('removeSecureItem', () => {
    it('should remove stored item from keychain', async () => {
      const key = 'removeKey';

      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      await removeSecureItem(key);

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: `conest-secure-${key}`,
      });
    });

    it('should throw error when removal fails', async () => {
      const key = 'removeFailKey';

      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValue(new Error('Removal failed'));

      await expect(removeSecureItem(key)).rejects.toThrow(`Failed to remove secure item: ${key}`);
    });

    it('should handle removal of non-existent keys', async () => {
      const key = 'nonExistentKey';

      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(false);

      await removeSecureItem(key);

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: `conest-secure-${key}`,
      });
    });
  });

  describe('setSecureItems', () => {
    it('should store multiple items in parallel', async () => {
      const items: Array<[string, string]> = [
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ];

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItems(items);

      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(3);
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'key1',
        'value1',
        expect.objectContaining({ service: 'conest-secure-key1' })
      );
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'key2',
        'value2',
        expect.objectContaining({ service: 'conest-secure-key2' })
      );
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'key3',
        'value3',
        expect.objectContaining({ service: 'conest-secure-key3' })
      );
    });

    it('should handle empty array', async () => {
      const items: Array<[string, string]> = [];

      await setSecureItems(items);

      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
    });

    it('should throw error when any storage operation fails', async () => {
      const items: Array<[string, string]> = [
        ['key1', 'value1'],
        ['key2', 'value2'],
      ];

      (Keychain.setGenericPassword as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Storage failed'));

      await expect(setSecureItems(items)).rejects.toThrow();
    });
  });

  describe('getSecureItems', () => {
    it('should retrieve multiple items in parallel', async () => {
      const keys = ['key1', 'key2', 'key3'];

      (Keychain.getGenericPassword as jest.Mock)
        .mockResolvedValueOnce({ password: 'value1' })
        .mockResolvedValueOnce({ password: 'value2' })
        .mockResolvedValueOnce({ password: 'value3' });

      const result = await getSecureItems(keys);

      expect(Keychain.getGenericPassword).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3'],
      ]);
    });

    it('should handle missing items with null values', async () => {
      const keys = ['key1', 'key2', 'key3'];

      (Keychain.getGenericPassword as jest.Mock)
        .mockResolvedValueOnce({ password: 'value1' })
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce({ password: 'value3' });

      const result = await getSecureItems(keys);

      expect(result).toEqual([
        ['key1', 'value1'],
        ['key2', null],
        ['key3', 'value3'],
      ]);
    });

    it('should return null for all keys on error', async () => {
      const keys = ['key1', 'key2'];

      (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

      const result = await getSecureItems(keys);

      expect(result).toEqual([
        ['key1', null],
        ['key2', null],
      ]);
    });

    it('should handle empty keys array', async () => {
      const keys: string[] = [];

      const result = await getSecureItems(keys);

      expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('clearSecureStorage', () => {
    it('should clear all common secure storage items', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      await clearSecureStorage();

      // Should attempt to clear all common keys
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-auth_token',
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-refresh_token',
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-user_data',
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-device_id',
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-encryption_key',
      });
    });

    it('should continue clearing even if some items do not exist', async () => {
      (Keychain.resetGenericPassword as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      await clearSecureStorage();

      // Should have attempted to clear all items
      expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(5);
    });

    it('should not throw error for non-existent keys', async () => {
      (Keychain.resetGenericPassword as jest.Mock).mockRejectedValue(new Error('Key not found'));

      // Should not throw error
      await expect(clearSecureStorage()).resolves.not.toThrow();
    });
  });

  describe('Authentication Token Management', () => {
    describe('setAuthToken / getAuthToken', () => {
      it('should store and retrieve auth token', async () => {
        const token = 'test_auth_token_12345';

        (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
        (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
          password: token,
        });

        await setAuthToken(token);
        const retrieved = await getAuthToken();

        expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
          'auth_token',
          token,
          expect.objectContaining({ service: 'conest-secure-auth_token' })
        );
        expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
          service: 'conest-secure-auth_token',
        });
        expect(retrieved).toBe(token);
      });

      it('should return null when auth token does not exist', async () => {
        (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

        const result = await getAuthToken();

        expect(result).toBeNull();
      });
    });

    describe('removeAuthToken', () => {
      it('should remove auth token', async () => {
        (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

        await removeAuthToken();

        expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
          service: 'conest-secure-auth_token',
        });
      });
    });
  });

  describe('Refresh Token Management', () => {
    describe('setRefreshToken / getRefreshToken', () => {
      it('should store and retrieve refresh token', async () => {
        const token = 'test_refresh_token_67890';

        (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
        (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
          password: token,
        });

        await setRefreshToken(token);
        const retrieved = await getRefreshToken();

        expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
          'refresh_token',
          token,
          expect.objectContaining({ service: 'conest-secure-refresh_token' })
        );
        expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
          service: 'conest-secure-refresh_token',
        });
        expect(retrieved).toBe(token);
      });

      it('should return null when refresh token does not exist', async () => {
        (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

        const result = await getRefreshToken();

        expect(result).toBeNull();
      });
    });

    describe('removeRefreshToken', () => {
      it('should remove refresh token', async () => {
        (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

        await removeRefreshToken();

        expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
          service: 'conest-secure-refresh_token',
        });
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete auth flow', async () => {
      const authToken = 'auth_token_abc';
      const refreshToken = 'refresh_token_xyz';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);
      (Keychain.getGenericPassword as jest.Mock)
        .mockResolvedValueOnce({ password: authToken })
        .mockResolvedValueOnce({ password: refreshToken });
      (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

      // Store tokens
      await setAuthToken(authToken);
      await setRefreshToken(refreshToken);

      // Retrieve tokens
      const retrievedAuth = await getAuthToken();
      const retrievedRefresh = await getRefreshToken();

      expect(retrievedAuth).toBe(authToken);
      expect(retrievedRefresh).toBe(refreshToken);

      // Remove tokens
      await removeAuthToken();
      await removeRefreshToken();

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-auth_token',
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-secure-refresh_token',
      });
    });

    it('should handle multiple concurrent operations', async () => {
      const items: Array<[string, string]> = [
        ['key1', 'value1'],
        ['key2', 'value2'],
      ];

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      // Execute multiple operations concurrently
      await Promise.all([setAuthToken('token1'), setRefreshToken('token2'), setSecureItems(items)]);

      // Total calls: 2 (tokens) + 2 (items) = 4
      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle JSON strings', async () => {
      const key = 'jsonKey';
      const value = JSON.stringify({ user: 'test', id: 123 });

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(key, value, expect.any(Object));
    });

    it('should handle whitespace-only values', async () => {
      const key = 'whitespaceKey';
      const value = '   \n\t\r   ';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(key, value, expect.any(Object));
    });

    it('should handle very long keys', async () => {
      const key = 'x'.repeat(255);
      const value = 'test';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        key,
        value,
        expect.objectContaining({ service: `conest-secure-${key}` })
      );
    });

    it('should handle rapid sequential calls', async () => {
      const key = 'rapidKey';
      const values = ['value1', 'value2', 'value3'];

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      // Rapidly store different values to the same key
      for (const value of values) {
        await setSecureItem(key, value);
      }

      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(3);
    });
  });

  describe('Security Properties', () => {
    it('should use secure accessibility option for all items', async () => {
      const key = 'secureKey';
      const value = 'secureValue';

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      await setSecureItem(key, value);

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        key,
        value,
        expect.objectContaining({
          accessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
        })
      );
    });

    it('should use unique service names to avoid key collisions', async () => {
      const keys = ['user', 'user_data', 'user_email'];

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      for (const key of keys) {
        await setSecureItem(key, 'value');
      }

      expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
        1,
        'user',
        'value',
        expect.objectContaining({ service: 'conest-secure-user' })
      );
      expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
        2,
        'user_data',
        'value',
        expect.objectContaining({ service: 'conest-secure-user_data' })
      );
      expect(Keychain.setGenericPassword).toHaveBeenNthCalledWith(
        3,
        'user_email',
        'value',
        expect.objectContaining({ service: 'conest-secure-user_email' })
      );
    });

    it('should handle sensitive data like passwords and tokens', async () => {
      const sensitiveData = {
        password: 'MyP@ssw0rd!',
        apiKey: 'sk_live_1234567890abcdef',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...',
      };

      (Keychain.setGenericPassword as jest.Mock).mockResolvedValue(true);

      for (const [key, value] of Object.entries(sensitiveData)) {
        await setSecureItem(key, value);
      }

      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(3);
    });
  });
});
