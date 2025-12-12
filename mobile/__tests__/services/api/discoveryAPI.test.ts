/**
 * Unit Tests for Discovery API Client
 * Tests browse discovery screen operations
 */

import axios from 'axios';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
  };
  return { create: jest.fn(() => mockAxiosInstance), ...mockAxiosInstance };
});

jest.mock('../../../src/services/tokenStorage', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

import DiscoveryAPI from '../../../src/services/api/discoveryAPI';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('DiscoveryAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfiles', () => {
    it('should fetch discovery profiles', async () => {
      const mockResponse = {
        success: true,
        data: {
          profiles: [
            {
              userId: 'user-1',
              firstName: 'John',
              age: 35,
              city: 'San Francisco',
              childrenCount: 2,
              childrenAgeGroups: ['toddler', 'elementary'],
              compatibilityScore: 85,
              verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true },
            },
          ],
          nextCursor: 'cursor-123',
        },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DiscoveryAPI.getProfiles();

      expect(result.profiles).toHaveLength(1);
      expect(result.profiles[0].firstName).toBe('John');
      expect(result.nextCursor).toBe('cursor-123');
    });

    it('should paginate with cursor', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { profiles: [], nextCursor: null } } });

      await DiscoveryAPI.getProfiles('cursor-123', 20);

      expect(mockAxios.get).toHaveBeenCalledWith('/discovery/profiles', {
        params: { limit: 20, cursor: 'cursor-123' },
      });
    });

    it('should use default limit of 10', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { profiles: [], nextCursor: null } } });

      await DiscoveryAPI.getProfiles();

      expect(mockAxios.get).toHaveBeenCalledWith('/discovery/profiles', { params: { limit: 10 } });
    });

    it('should handle empty profiles', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { profiles: [], nextCursor: null } } });

      const result = await DiscoveryAPI.getProfiles();

      expect(result.profiles).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle unauthorized (401)', async () => {
      mockAxios.get.mockRejectedValueOnce({ response: { status: 401, data: { error: 'Access token required' } } });
      await expect(DiscoveryAPI.getProfiles()).rejects.toMatchObject({ response: { status: 401 } });
    });

    it('should handle server errors (500)', async () => {
      mockAxios.get.mockRejectedValueOnce({ response: { status: 500 } });
      await expect(DiscoveryAPI.getProfiles()).rejects.toMatchObject({ response: { status: 500 } });
    });

    it('should handle network errors', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network Error'));
      await expect(DiscoveryAPI.getProfiles()).rejects.toThrow('Network Error');
    });
  });

  describe('reportScreenshot', () => {
    it('should report screenshot successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'Screenshot reported' } });

      const result = await DiscoveryAPI.reportScreenshot('user-123');

      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith('/discovery/screenshot', { targetUserId: 'user-123' });
    });

    it('should handle user not found (404)', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 404 } });
      await expect(DiscoveryAPI.reportScreenshot('invalid')).rejects.toMatchObject({ response: { status: 404 } });
    });

    it('should handle rate limiting (429)', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 429 } });
      await expect(DiscoveryAPI.reportScreenshot('user-123')).rejects.toMatchObject({ response: { status: 429 } });
    });
  });

  describe('child safety compliance', () => {
    it('should not include child PII in profile data', async () => {
      const mockResponse = {
        success: true,
        data: {
          profiles: [{ userId: 'user-1', firstName: 'John', childrenCount: 2, childrenAgeGroups: ['toddler'] }],
          nextCursor: null,
        },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DiscoveryAPI.getProfiles();

      expect(result.profiles[0]).not.toHaveProperty('childrenNames');
      expect(result.profiles[0]).not.toHaveProperty('childrenPhotos');
      expect(result.profiles[0]).not.toHaveProperty('childrenBirthdays');
    });

    it('should include verification status', async () => {
      const mockResponse = {
        success: true,
        data: {
          profiles: [{
            userId: 'user-1',
            verificationStatus: { idVerified: true, backgroundCheckComplete: true, phoneVerified: true },
          }],
          nextCursor: null,
        },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await DiscoveryAPI.getProfiles();

      expect(result.profiles[0].verificationStatus).toBeDefined();
      expect(result.profiles[0].verificationStatus.idVerified).toBe(true);
    });
  });
});
