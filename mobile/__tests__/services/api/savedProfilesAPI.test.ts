/**
 * Unit Tests for Saved Profiles API Client
 * Tests bookmark/save profile operations
 */

import axios from 'axios';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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

import SavedProfilesAPI from '../../../src/services/api/savedProfilesAPI';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('SavedProfilesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveProfile', () => {
    it('should save profile to folder', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'saved-123',
          profile_id: 'profile-456',
          folder: 'Top Choice',
          saved_at: new Date().toISOString(),
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.saveProfile('profile-456', 'Top Choice', 'Great match!');

      expect(result.folder).toBe('Top Choice');
      expect(mockAxios.post).toHaveBeenCalledWith('/', {
        profile_id: 'profile-456',
        folder: 'Top Choice',
        notes: 'Great match!',
      });
    });

    it('should save profile without folder', async () => {
      const mockResponse = { success: true, data: { id: 'saved-123', folder: null } };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.saveProfile('profile-456');

      expect(result.folder).toBeNull();
    });

    it('should handle duplicate save (409)', async () => {
      const error = new Error('Duplicate') as any;
      error.response = { status: 409 };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(SavedProfilesAPI.saveProfile('profile-456')).rejects.toThrow();
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should handle limit reached (400)', async () => {
      const error = new Error('Limit reached') as any;
      error.response = { status: 400, data: { error: 'limit reached' } };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(SavedProfilesAPI.saveProfile('profile-456')).rejects.toThrow();
      expect(mockAxios.post).toHaveBeenCalled();
    });
  });

  describe('listSavedProfiles', () => {
    it('should list all saved profiles', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'saved-1', profile_id: 'p-1', folder: 'Top Choice' },
          { id: 'saved-2', profile_id: 'p-2', folder: 'Considering' },
        ],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.listSavedProfiles();

      expect(result).toHaveLength(2);
    });

    it('should filter by folder', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } });

      await SavedProfilesAPI.listSavedProfiles('Top Choice');

      expect(mockAxios.get).toHaveBeenCalledWith('/', { params: { folder: 'Top Choice' } });
    });
  });

  describe('getSavedProfilesByFolder', () => {
    it('should get profiles grouped by folder', async () => {
      const mockResponse = {
        success: true,
        data: {
          'Top Choice': [{ id: 'saved-1' }],
          'Strong Maybe': [],
          'Considering': [{ id: 'saved-2' }],
          'Backup': [],
          'Uncategorized': [],
        },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.getSavedProfilesByFolder();

      expect(result['Top Choice']).toHaveLength(1);
      expect(result['Considering']).toHaveLength(1);
    });
  });

  describe('getLimitStatus', () => {
    it('should get limit status', async () => {
      const mockResponse = {
        success: true,
        data: { current: 35, limit: 50, remaining: 15, isAtLimit: false },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.getLimitStatus();

      expect(result.current).toBe(35);
      expect(result.remaining).toBe(15);
      expect(result.isAtLimit).toBe(false);
    });

    it('should indicate when at limit', async () => {
      const mockResponse = {
        success: true,
        data: { current: 50, limit: 50, remaining: 0, isAtLimit: true },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.getLimitStatus();

      expect(result.isAtLimit).toBe(true);
    });
  });

  describe('compareProfiles', () => {
    it('should compare 2 profiles', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'saved-1', firstName: 'John', compatibilityScore: 85 },
          { id: 'saved-2', firstName: 'Jane', compatibilityScore: 78 },
        ],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.compareProfiles(['saved-1', 'saved-2']);

      expect(result).toHaveLength(2);
      expect(mockAxios.get).toHaveBeenCalledWith('/compare', { params: { ids: 'saved-1,saved-2' } });
    });

    it('should compare up to 4 profiles', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: [{}, {}, {}, {}] } });

      const result = await SavedProfilesAPI.compareProfiles(['1', '2', '3', '4']);

      expect(result).toHaveLength(4);
    });

    it('should reject less than 2 profiles', async () => {
      await expect(SavedProfilesAPI.compareProfiles(['1'])).rejects.toThrow('2-4 profiles');
    });

    it('should reject more than 4 profiles', async () => {
      await expect(SavedProfilesAPI.compareProfiles(['1', '2', '3', '4', '5'])).rejects.toThrow('2-4 profiles');
    });
  });

  describe('getNotes', () => {
    it('should get decrypted notes', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { notes: 'Great compatibility!' } } });

      const result = await SavedProfilesAPI.getNotes('saved-123');

      expect(result).toBe('Great compatibility!');
      expect(mockAxios.get).toHaveBeenCalledWith('/saved-123/notes');
    });

    it('should return null when no notes', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { notes: null } } });

      const result = await SavedProfilesAPI.getNotes('saved-123');

      expect(result).toBeNull();
    });
  });

  describe('updateSavedProfile', () => {
    it('should update folder', async () => {
      const mockResponse = { success: true, data: { id: 'saved-123', folder: 'Strong Maybe' } };
      mockAxios.patch.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.updateSavedProfile('saved-123', 'Strong Maybe');

      expect(result.folder).toBe('Strong Maybe');
      expect(mockAxios.patch).toHaveBeenCalledWith('/saved-123', { folder: 'Strong Maybe', notes: undefined });
    });

    it('should update notes', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { id: 'saved-123' } } });

      await SavedProfilesAPI.updateSavedProfile('saved-123', undefined, 'Updated notes');

      expect(mockAxios.patch).toHaveBeenCalledWith('/saved-123', { folder: undefined, notes: 'Updated notes' });
    });

    it('should update both folder and notes', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { id: 'saved-123' } } });

      await SavedProfilesAPI.updateSavedProfile('saved-123', 'Top Choice', 'New notes');

      expect(mockAxios.patch).toHaveBeenCalledWith('/saved-123', { folder: 'Top Choice', notes: 'New notes' });
    });
  });

  describe('removeSavedProfile', () => {
    it('should remove saved profile', async () => {
      mockAxios.delete.mockResolvedValueOnce({ data: { success: true, message: 'Removed' } });

      const result = await SavedProfilesAPI.removeSavedProfile('saved-123');

      expect(result.success).toBe(true);
      expect(mockAxios.delete).toHaveBeenCalledWith('/saved-123');
    });

    it('should handle not found (404)', async () => {
      const error = new Error('Not found') as any;
      error.response = { status: 404 };
      mockAxios.delete.mockRejectedValueOnce(error);
      await expect(SavedProfilesAPI.removeSavedProfile('invalid')).rejects.toThrow();
      expect(mockAxios.delete).toHaveBeenCalled();
    });
  });

  describe('checkIfSaved', () => {
    it('should check if profile is saved', async () => {
      const mockResponse = {
        success: true,
        data: { isSaved: true, folder: 'Top Choice', savedProfileId: 'saved-123' },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.checkIfSaved('profile-456');

      expect(result.isSaved).toBe(true);
      expect(result.folder).toBe('Top Choice');
      expect(result.savedProfileId).toBe('saved-123');
    });

    it('should return false for unsaved profile', async () => {
      const mockResponse = {
        success: true,
        data: { isSaved: false, folder: null, savedProfileId: null },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await SavedProfilesAPI.checkIfSaved('profile-789');

      expect(result.isSaved).toBe(false);
      expect(result.folder).toBeNull();
    });
  });
});
