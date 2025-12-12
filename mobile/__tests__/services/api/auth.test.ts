/**
 * Unit Tests for Auth API Client
 * Tests authentication-related API operations
 */

import axios from 'axios';

// Mock axios before importing
jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    ...mockAxiosInstance,
  };
});

// Mock token storage
jest.mock('../../../src/services/tokenStorage', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    getRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
    saveTokens: jest.fn().mockResolvedValue(true),
    clearTokens: jest.fn().mockResolvedValue(undefined),
    hasTokens: jest.fn().mockResolvedValue(true),
    getUserId: jest.fn().mockResolvedValue('user-123'),
  },
}));

import AuthAPI from '../../../src/services/api/auth';
import tokenStorage from '../../../src/services/tokenStorage';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('AuthAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRequest = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      phone: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register user successfully', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await AuthAPI.register(validRequest);

      expect(result).toEqual(mockResponse);
      expect(tokenStorage.saveTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });

    it('should handle duplicate email error (409)', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 409 } });
      await expect(AuthAPI.register(validRequest)).rejects.toMatchObject({ response: { status: 409 } });
    });

    it('should handle validation errors (400)', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 400 } });
      await expect(AuthAPI.register(validRequest)).rejects.toMatchObject({ response: { status: 400 } });
    });
  });

  describe('login', () => {
    const validRequest = { email: 'test@example.com', password: 'password123' };

    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          user: { id: 'user-123', email: 'test@example.com', first_name: 'John', last_name: 'Doe', profile_complete: true },
          tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await AuthAPI.login(validRequest);

      expect(result.user.email).toBe('test@example.com');
      expect(tokenStorage.saveTokens).toHaveBeenCalled();
    });

    it('should handle invalid credentials (401)', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 401 } });
      await expect(AuthAPI.login(validRequest)).rejects.toMatchObject({ response: { status: 401 } });
    });

    it('should handle rate limiting (429)', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 429 } });
      await expect(AuthAPI.login(validRequest)).rejects.toMatchObject({ response: { status: 429 } });
    });

    it('should handle network errors', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      await expect(AuthAPI.login(validRequest)).rejects.toThrow('Network Error');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = { tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' } };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await AuthAPI.refresh();

      expect(result.tokens).toBeDefined();
      expect(tokenStorage.saveTokens).toHaveBeenCalledWith(mockResponse.tokens);
    });

    it('should handle missing refresh token', async () => {
      (tokenStorage.getRefreshToken as jest.Mock).mockResolvedValueOnce(null);
      await expect(AuthAPI.refresh()).rejects.toThrow('No refresh token available');
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { verified: true, message: 'Phone verified' } });
      const result = await AuthAPI.verifyPhone({ phone: '+1234567890', code: '123456' });
      expect(result.verified).toBe(true);
    });

    it('should handle invalid code', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 400 } });
      await expect(AuthAPI.verifyPhone({ phone: '+1234567890', code: '000000' })).rejects.toMatchObject({ response: { status: 400 } });
    });
  });

  describe('requestPhoneVerification', () => {
    it('should request verification successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'Code sent' } });
      const result = await AuthAPI.requestPhoneVerification('+1234567890');
      expect(result.success).toBe(true);
    });
  });

  describe('logout', () => {
    it('should logout and clear tokens', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });
      const result = await AuthAPI.logout();
      expect(result.success).toBe(true);
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should clear tokens even on API failure', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      await expect(AuthAPI.logout()).rejects.toThrow();
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when tokens exist', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockResolvedValueOnce(true);
      expect(await AuthAPI.isAuthenticated()).toBe(true);
    });

    it('should return false when no tokens', async () => {
      (tokenStorage.hasTokens as jest.Mock).mockResolvedValueOnce(false);
      expect(await AuthAPI.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUserId', () => {
    it('should return user ID', async () => {
      (tokenStorage.getUserId as jest.Mock).mockResolvedValueOnce('user-123');
      expect(await AuthAPI.getCurrentUserId()).toBe('user-123');
    });

    it('should return null when not stored', async () => {
      (tokenStorage.getUserId as jest.Mock).mockResolvedValueOnce(null);
      expect(await AuthAPI.getCurrentUserId()).toBeNull();
    });
  });
});
