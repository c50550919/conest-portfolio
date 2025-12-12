/**
 * Unit Tests for Profile API Client
 * Tests profile CRUD operations
 */

import axios from 'axios';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
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

import ProfileAPI from '../../../src/services/api/profileAPI';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('ProfileAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyProfile', () => {
    it('should fetch own profile', async () => {
      const mockProfile = {
        success: true,
        data: {
          id: 'profile-123',
          user_id: 'user-123',
          first_name: 'John',
          last_name: 'Doe',
          city: 'San Francisco',
          verified: true,
        },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await ProfileAPI.getMyProfile();

      expect(result.data.first_name).toBe('John');
      expect(mockAxios.get).toHaveBeenCalledWith('/me');
    });

    it('should handle not found (404)', async () => {
      const error = new Error('Profile not found') as any;
      error.response = { status: 404, data: { error: 'Profile not found' } };
      mockAxios.get.mockRejectedValueOnce(error);
      await expect(ProfileAPI.getMyProfile()).rejects.toThrow('Profile not found');
    });

    it('should handle unauthorized (401)', async () => {
      const error = new Error('Unauthorized') as any;
      error.response = { status: 401 };
      mockAxios.get.mockRejectedValueOnce(error);
      await expect(ProfileAPI.getMyProfile()).rejects.toThrow();
    });
  });

  describe('createProfile', () => {
    const validProfile = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
    };

    it('should create profile successfully', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'profile-123', ...validProfile },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await ProfileAPI.createProfile(validProfile);

      expect(result.data.id).toBe('profile-123');
      expect(mockAxios.post).toHaveBeenCalledWith('/', expect.objectContaining({
        first_name: 'John',
        city: 'San Francisco',
      }));
    });

    it('should sanitize input (trim whitespace)', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, data: { id: 'profile-123' } } });

      await ProfileAPI.createProfile({
        ...validProfile,
        first_name: '  John  ',
        bio: '  Hello world  ',
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/', expect.objectContaining({
        first_name: 'John',
        bio: 'Hello world',
      }));
    });

    it('should handle validation errors (400)', async () => {
      const error = new Error('Invalid date') as any;
      error.response = { status: 400, data: { error: 'Invalid date' } };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(ProfileAPI.createProfile(validProfile)).rejects.toThrow('Invalid date');
    });

    it('should handle duplicate profile (409)', async () => {
      const error = new Error('Profile exists') as any;
      error.response = { status: 409, data: { error: 'Profile exists' } };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(ProfileAPI.createProfile(validProfile)).rejects.toThrow('Profile exists');
    });
  });

  describe('updateProfile', () => {
    it('should update profile', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'profile-123', bio: 'Updated bio' },
      };
      mockAxios.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await ProfileAPI.updateProfile({ bio: 'Updated bio' });

      expect(result.data.bio).toBe('Updated bio');
      expect(mockAxios.put).toHaveBeenCalledWith('/me', { bio: 'Updated bio' });
    });

    it('should sanitize string inputs', async () => {
      mockAxios.put.mockResolvedValueOnce({ data: { success: true, data: {} } });

      await ProfileAPI.updateProfile({
        first_name: '  Jane  ',
        city: '  Oakland  ',
      });

      expect(mockAxios.put).toHaveBeenCalledWith('/me', {
        first_name: 'Jane',
        city: 'Oakland',
      });
    });

    it('should handle partial updates', async () => {
      mockAxios.put.mockResolvedValueOnce({ data: { success: true, data: { budget_min: 1500 } } });

      await ProfileAPI.updateProfile({ budget_min: 1500 });

      expect(mockAxios.put).toHaveBeenCalledWith('/me', { budget_min: 1500 });
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile', async () => {
      mockAxios.delete.mockResolvedValueOnce({ data: { success: true, message: 'Profile deleted' } });

      const result = await ProfileAPI.deleteProfile();

      expect(result.success).toBe(true);
      expect(mockAxios.delete).toHaveBeenCalledWith('/me');
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const mockResponse = {
        success: true,
        data: { profile_image_url: 'https://example.com/photo.jpg' },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await ProfileAPI.uploadPhoto({
        uri: 'file:///photo.jpg',
        type: 'image/jpeg',
        fileName: 'photo.jpg',
      });

      expect(result.data.profile_image_url).toBeDefined();
      expect(mockAxios.post).toHaveBeenCalledWith('/photo', expect.any(FormData), expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      }));
    });

    it('should reject invalid file type', async () => {
      await expect(ProfileAPI.uploadPhoto({
        uri: 'file:///document.pdf',
        type: 'application/pdf',
        fileName: 'document.pdf',
      })).rejects.toThrow('Invalid file type');
    });

    it('should accept JPEG images', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, data: {} } });

      await expect(ProfileAPI.uploadPhoto({
        uri: 'file:///photo.jpg',
        type: 'image/jpeg',
        fileName: 'photo.jpg',
      })).resolves.toBeDefined();
    });

    it('should accept PNG images', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, data: {} } });

      await expect(ProfileAPI.uploadPhoto({
        uri: 'file:///photo.png',
        type: 'image/png',
        fileName: 'photo.png',
      })).resolves.toBeDefined();
    });

    it('should accept WebP images', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, data: {} } });

      await expect(ProfileAPI.uploadPhoto({
        uri: 'file:///photo.webp',
        type: 'image/webp',
        fileName: 'photo.webp',
      })).resolves.toBeDefined();
    });
  });

  describe('searchProfiles', () => {
    it('should search profiles with filters', async () => {
      const mockResponse = {
        success: true,
        count: 2,
        data: [
          { id: 'profile-1', first_name: 'John', city: 'San Francisco' },
          { id: 'profile-2', first_name: 'Jane', city: 'San Francisco' },
        ],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await ProfileAPI.searchProfiles({ city: 'San Francisco', verified: true });

      expect(result.data).toHaveLength(2);
      expect(result.count).toBe(2);
      expect(mockAxios.get).toHaveBeenCalledWith('/search', {
        params: { city: 'San Francisco', verified: true },
      });
    });

    it('should return empty array when no matches', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, count: 0, data: [] } });

      const result = await ProfileAPI.searchProfiles({ city: 'Unknown City' });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getProfile', () => {
    it('should get profile by valid UUID', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'profile-123', first_name: 'John' },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await ProfileAPI.getProfile('a1b2c3d4-e5f6-4890-abcd-ef1234567890');

      expect(result.data.first_name).toBe('John');
    });

    it('should reject invalid UUID format', async () => {
      await expect(ProfileAPI.getProfile('invalid-id')).rejects.toThrow('Invalid profile ID format');
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should reject SQL injection attempts', async () => {
      await expect(ProfileAPI.getProfile("'; DROP TABLE profiles; --")).rejects.toThrow('Invalid profile ID format');
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should handle not found (404)', async () => {
      const error = new Error('Not found') as any;
      error.response = { status: 404, data: { error: 'Not found' } };
      mockAxios.get.mockRejectedValueOnce(error);
      await expect(ProfileAPI.getProfile('a1b2c3d4-e5f6-4890-abcd-ef1234567890')).rejects.toThrow('Not found');
    });
  });

  describe('child safety compliance', () => {
    it('should allow optional children info (FHA compliant)', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, data: { id: 'profile-123' } } });

      await ProfileAPI.createProfile({
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1990-01-15',
        city: 'SF',
        state: 'CA',
        zip_code: '94102',
        number_of_children: 2,
        ages_of_children: '5-10',
      });

      // Should not include child names or specific data
      expect(mockAxios.post).toHaveBeenCalledWith('/', expect.not.objectContaining({
        children_names: expect.anything(),
        children_birthdays: expect.anything(),
      }));
    });
  });
});
