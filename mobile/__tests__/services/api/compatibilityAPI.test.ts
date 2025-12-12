/**
 * Unit Tests for Compatibility API Client
 * Tests compatibility calculation operations
 */

import axios from 'axios';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
    isAxiosError: jest.fn((err) => err?.response !== undefined),
    ...mockAxiosInstance,
  };
});

jest.mock('../../../src/services/tokenStorage', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

import CompatibilityAPI from '../../../src/services/api/compatibilityAPI';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('CompatibilityAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCompatibility', () => {
    it('should calculate compatibility between two profiles', async () => {
      const mockResponse = {
        success: true,
        data: {
          overallScore: 85,
          dimensions: [
            { dimension: 'Schedule Compatibility', score: 90, weight: 0.25, explanation: 'Similar schedules', icon: 'clock' },
            { dimension: 'Parenting Philosophy', score: 85, weight: 0.20, explanation: 'Aligned parenting', icon: 'heart' },
            { dimension: 'House Rules', score: 80, weight: 0.20, explanation: 'Compatible rules', icon: 'home' },
            { dimension: 'Location', score: 88, weight: 0.15, explanation: 'Same area', icon: 'map' },
            { dimension: 'Budget', score: 82, weight: 0.10, explanation: 'Budget overlap', icon: 'dollar' },
            { dimension: 'Lifestyle', score: 78, weight: 0.10, explanation: 'Similar lifestyle', icon: 'users' },
          ],
          calculatedAt: new Date().toISOString(),
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await CompatibilityAPI.calculateCompatibility('profile-1', 'profile-2');

      expect(result.overallScore).toBe(85);
      expect(result.dimensions).toHaveLength(6);
      expect(result.dimensions[0].dimension).toBe('Schedule Compatibility');
      expect(mockAxios.post).toHaveBeenCalledWith('/compatibility/calculate', {
        profile1Id: 'profile-1',
        profile2Id: 'profile-2',
      });
    });

    it('should include all 6 compatibility dimensions', async () => {
      const mockResponse = {
        success: true,
        data: {
          overallScore: 75,
          dimensions: [
            { dimension: 'Schedule Compatibility', score: 70, weight: 0.25, explanation: 'test', icon: 'clock' },
            { dimension: 'Parenting Philosophy', score: 75, weight: 0.20, explanation: 'test', icon: 'heart' },
            { dimension: 'House Rules', score: 80, weight: 0.20, explanation: 'test', icon: 'home' },
            { dimension: 'Location', score: 78, weight: 0.15, explanation: 'test', icon: 'map' },
            { dimension: 'Budget', score: 72, weight: 0.10, explanation: 'test', icon: 'dollar' },
            { dimension: 'Lifestyle', score: 68, weight: 0.10, explanation: 'test', icon: 'users' },
          ],
          calculatedAt: new Date().toISOString(),
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await CompatibilityAPI.calculateCompatibility('p1', 'p2');

      const dimensions = result.dimensions.map(d => d.dimension);
      expect(dimensions).toContain('Schedule Compatibility');
      expect(dimensions).toContain('Parenting Philosophy');
      expect(dimensions).toContain('House Rules');
      expect(dimensions).toContain('Location');
      expect(dimensions).toContain('Budget');
      expect(dimensions).toContain('Lifestyle');
    });

    it('should handle API failure response', async () => {
      const mockResponse = { success: false, data: null };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await expect(CompatibilityAPI.calculateCompatibility('p1', 'p2')).rejects.toThrow('Failed to calculate compatibility');
    });

    it('should handle profile not found (404)', async () => {
      const error = { response: { status: 404, data: { error: 'Profile not found' } } };
      mockAxios.post.mockRejectedValueOnce(error);
      (axios.isAxiosError as jest.Mock).mockReturnValueOnce(true);

      await expect(CompatibilityAPI.calculateCompatibility('invalid', 'p2')).rejects.toThrow('Compatibility calculation failed');
    });

    it('should handle unauthorized (401)', async () => {
      const error = { response: { status: 401, data: { error: 'Unauthorized' } } };
      mockAxios.post.mockRejectedValueOnce(error);
      (axios.isAxiosError as jest.Mock).mockReturnValueOnce(true);

      await expect(CompatibilityAPI.calculateCompatibility('p1', 'p2')).rejects.toThrow('Compatibility calculation failed');
    });

    it('should handle network errors', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      (axios.isAxiosError as jest.Mock).mockReturnValueOnce(false);

      await expect(CompatibilityAPI.calculateCompatibility('p1', 'p2')).rejects.toThrow('Network Error');
    });

    it('should include calculated timestamp', async () => {
      const timestamp = new Date().toISOString();
      const mockResponse = {
        success: true,
        data: { overallScore: 80, dimensions: [], calculatedAt: timestamp },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await CompatibilityAPI.calculateCompatibility('p1', 'p2');

      expect(result.calculatedAt).toBe(timestamp);
    });
  });

  describe('calculateBatchCompatibility', () => {
    it('should calculate compatibility for multiple pairs', async () => {
      const mockResponse1 = {
        success: true,
        data: { overallScore: 85, dimensions: [], calculatedAt: new Date().toISOString() },
      };
      const mockResponse2 = {
        success: true,
        data: { overallScore: 72, dimensions: [], calculatedAt: new Date().toISOString() },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse1 });
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse2 });

      const pairs = [
        { profile1Id: 'p1', profile2Id: 'p2' },
        { profile1Id: 'p1', profile2Id: 'p3' },
      ];
      const results = await CompatibilityAPI.calculateBatchCompatibility(pairs);

      expect(results).toHaveLength(2);
      expect(results[0].overallScore).toBe(85);
      expect(results[1].overallScore).toBe(72);
    });

    it('should handle partial failures in batch', async () => {
      mockAxios.post.mockResolvedValueOnce({
        data: { success: true, data: { overallScore: 80, dimensions: [], calculatedAt: new Date().toISOString() } },
      });
      const error = { response: { data: { error: 'Profile not found' } } };
      mockAxios.post.mockRejectedValueOnce(error);
      (axios.isAxiosError as jest.Mock).mockReturnValueOnce(true);

      const pairs = [
        { profile1Id: 'p1', profile2Id: 'p2' },
        { profile1Id: 'p1', profile2Id: 'invalid' },
      ];

      await expect(CompatibilityAPI.calculateBatchCompatibility(pairs)).rejects.toThrow('Compatibility calculation failed');
    });

    it('should handle empty pairs array', async () => {
      const results = await CompatibilityAPI.calculateBatchCompatibility([]);
      expect(results).toHaveLength(0);
    });

    it('should call API for each pair', async () => {
      mockAxios.post.mockResolvedValue({
        data: { success: true, data: { overallScore: 75, dimensions: [], calculatedAt: new Date().toISOString() } },
      });

      const pairs = [
        { profile1Id: 'p1', profile2Id: 'p2' },
        { profile1Id: 'p1', profile2Id: 'p3' },
        { profile1Id: 'p2', profile2Id: 'p3' },
      ];
      await CompatibilityAPI.calculateBatchCompatibility(pairs);

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('compatibility score validation', () => {
    it('should return score between 0-100', async () => {
      const mockResponse = {
        success: true,
        data: { overallScore: 85, dimensions: [], calculatedAt: new Date().toISOString() },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await CompatibilityAPI.calculateCompatibility('p1', 'p2');

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should include dimension weights that sum to 1', async () => {
      const mockResponse = {
        success: true,
        data: {
          overallScore: 80,
          dimensions: [
            { dimension: 'Schedule', score: 80, weight: 0.25, explanation: '', icon: '' },
            { dimension: 'Parenting', score: 80, weight: 0.20, explanation: '', icon: '' },
            { dimension: 'House Rules', score: 80, weight: 0.20, explanation: '', icon: '' },
            { dimension: 'Location', score: 80, weight: 0.15, explanation: '', icon: '' },
            { dimension: 'Budget', score: 80, weight: 0.10, explanation: '', icon: '' },
            { dimension: 'Lifestyle', score: 80, weight: 0.10, explanation: '', icon: '' },
          ],
          calculatedAt: new Date().toISOString(),
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await CompatibilityAPI.calculateCompatibility('p1', 'p2');

      const totalWeight = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 2);
    });
  });
});
