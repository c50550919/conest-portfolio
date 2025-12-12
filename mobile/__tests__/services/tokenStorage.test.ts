/**
 * Token Storage Service Tests
 * Tests secure token persistence using react-native-keychain
 */

// Setup mock functions before jest.mock
const mockSetGenericPassword = jest.fn();
const mockGetGenericPassword = jest.fn();
const mockResetGenericPassword = jest.fn();

// Mock react-native-keychain - must be before import
jest.mock('react-native-keychain', () => ({
  __esModule: true,
  setGenericPassword: (...args: any[]) => mockSetGenericPassword(...args),
  getGenericPassword: (...args: any[]) => mockGetGenericPassword(...args),
  resetGenericPassword: (...args: any[]) => mockResetGenericPassword(...args),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  },
}));

// Import after mock setup
import tokenStorage, { AuthTokens } from '../../src/services/tokenStorage';

describe('TokenStorageService', () => {
  const mockTokens: AuthTokens = {
    accessToken: 'mock-access-token-12345',
    refreshToken: 'mock-refresh-token-67890',
    userId: 'user-uuid-123',
  };

  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('saveTokens', () => {
    it('should save tokens successfully', async () => {
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.saveTokens(mockTokens);

      expect(result).toBe(true);
      expect(mockSetGenericPassword).toHaveBeenCalledWith(
        'user-tokens',
        JSON.stringify(mockTokens),
        {
          service: 'conest-auth',
          accessible: 'whenUnlockedThisDeviceOnly',
        }
      );
    });

    it('should return false on save error', async () => {
      mockSetGenericPassword.mockRejectedValue(new Error('Keychain error'));

      const result = await tokenStorage.saveTokens(mockTokens);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TokenStorage] Failed to save tokens:',
        expect.any(Error)
      );
    });

    it('should verify saved tokens by reading them back', async () => {
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      await tokenStorage.saveTokens(mockTokens);

      // Verify getGenericPassword was called for verification
      expect(mockGetGenericPassword).toHaveBeenCalled();
    });
  });

  describe('getTokens', () => {
    it('should retrieve tokens successfully', async () => {
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.getTokens();

      expect(result).toEqual(mockTokens);
      expect(mockGetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-auth',
      });
    });

    it('should return null when no tokens exist', async () => {
      mockGetGenericPassword.mockResolvedValue(false);

      const result = await tokenStorage.getTokens();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetGenericPassword.mockRejectedValue(new Error('Keychain error'));

      const result = await tokenStorage.getTokens();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TokenStorage] Failed to get tokens:',
        expect.any(Error)
      );
    });

    it('should handle malformed JSON', async () => {
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: 'invalid-json',
      });

      const result = await tokenStorage.getTokens();

      expect(result).toBeNull();
    });
  });

  describe('clearTokens', () => {
    it('should clear tokens successfully', async () => {
      mockResetGenericPassword.mockResolvedValue(true);

      const result = await tokenStorage.clearTokens();

      expect(result).toBe(true);
      expect(mockResetGenericPassword).toHaveBeenCalledWith({
        service: 'conest-auth',
      });
    });

    it('should return false on clear error', async () => {
      mockResetGenericPassword.mockRejectedValue(new Error('Keychain error'));

      const result = await tokenStorage.clearTokens();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TokenStorage] Failed to clear tokens:',
        expect.any(Error)
      );
    });
  });

  describe('hasTokens', () => {
    it('should return true when tokens exist', async () => {
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.hasTokens();

      expect(result).toBe(true);
    });

    it('should return false when no tokens exist', async () => {
      mockGetGenericPassword.mockResolvedValue(false);

      const result = await tokenStorage.hasTokens();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockGetGenericPassword.mockRejectedValue(new Error('Keychain error'));

      const result = await tokenStorage.hasTokens();

      expect(result).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when available', async () => {
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.getAccessToken();

      expect(result).toBe(mockTokens.accessToken);
    });

    it('should return null when tokens not available', async () => {
      mockGetGenericPassword.mockResolvedValue(false);

      const result = await tokenStorage.getAccessToken();

      expect(result).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token when available', async () => {
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.getRefreshToken();

      expect(result).toBe(mockTokens.refreshToken);
    });

    it('should return null when tokens not available', async () => {
      mockGetGenericPassword.mockResolvedValue(false);

      const result = await tokenStorage.getRefreshToken();

      expect(result).toBeNull();
    });
  });

  describe('getUserId', () => {
    it('should return user ID when available', async () => {
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.getUserId();

      expect(result).toBe(mockTokens.userId);
    });

    it('should return null when tokens not available', async () => {
      mockGetGenericPassword.mockResolvedValue(false);

      const result = await tokenStorage.getUserId();

      expect(result).toBeNull();
    });
  });

  describe('setTokens (alias)', () => {
    it('should work as alias for saveTokens', async () => {
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      const result = await tokenStorage.setTokens(mockTokens);

      expect(result).toBe(true);
      expect(mockSetGenericPassword).toHaveBeenCalled();
    });
  });

  describe('Token Security', () => {
    it('should use correct service name', async () => {
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      await tokenStorage.saveTokens(mockTokens);

      expect(mockSetGenericPassword).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          service: 'conest-auth',
        })
      );
    });

    it('should use secure accessibility setting', async () => {
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(mockTokens),
      });

      await tokenStorage.saveTokens(mockTokens);

      expect(mockSetGenericPassword).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          accessible: 'whenUnlockedThisDeviceOnly',
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty access token (falsy check)', async () => {
      // Note: getAccessToken uses || which treats empty string as falsy
      const tokensWithEmptyAccess = {
        ...mockTokens,
        accessToken: '',
      };
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(tokensWithEmptyAccess),
      });

      const result = await tokenStorage.getAccessToken();

      // Empty string is treated as falsy, so returns null
      expect(result).toBeNull();
    });

    it('should handle very long tokens', async () => {
      const longToken = 'a'.repeat(10000);
      const tokensWithLongAccess = {
        ...mockTokens,
        accessToken: longToken,
      };
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(tokensWithLongAccess),
      });

      await tokenStorage.saveTokens(tokensWithLongAccess);
      const result = await tokenStorage.getAccessToken();

      expect(result).toBe(longToken);
    });

    it('should handle special characters in tokens', async () => {
      const specialToken = 'token+with/special=chars&more';
      const tokensWithSpecial = {
        ...mockTokens,
        accessToken: specialToken,
      };
      mockSetGenericPassword.mockResolvedValue(true);
      mockGetGenericPassword.mockResolvedValue({
        username: 'user-tokens',
        password: JSON.stringify(tokensWithSpecial),
      });

      await tokenStorage.saveTokens(tokensWithSpecial);
      const result = await tokenStorage.getAccessToken();

      expect(result).toBe(specialToken);
    });
  });
});
