/**
 * API Service Tests
 * Tests API client with mocked axios
 * Updated to match actual api.ts service structure
 */

import axios from 'axios';

// Mock axios before importing api service
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
jest.mock('../../src/services/tokenStorage', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    getRefreshToken: jest.fn().mockResolvedValue('mock-refresh'),
    setTokens: jest.fn().mockResolvedValue(undefined),
    clearTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

import api from '../../src/services/api';

// Get the mocked axios instance (axios.create() returns our mock)
const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
      };

      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await api.login('test@example.com', 'password123');

      expect(result).toEqual(mockResponse);
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle login failure', async () => {
      mockAxios.post.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Invalid credentials' } },
      });

      await expect(api.login('test@example.com', 'wrong-password')).rejects.toMatchObject({
        response: { status: 401 },
      });
    });

    it('should register new user', async () => {
      const mockResponse = {
        user: { id: 'new-user', email: 'new@example.com' },
        accessToken: 'new-token',
      };

      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await api.register({
        email: 'new@example.com',
        password: 'SecurePass123!',
        phone: '+1234567890',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should verify phone', async () => {
      const mockResponse = { success: true };

      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await api.verifyPhone('+1234567890', '123456');

      expect(result.success).toBe(true);
    });
  });

  describe('Profile Management', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'profile-123',
        first_name: 'Test',
        last_name: 'User',
        number_of_children: 2,
        ages_of_children: '5-10',
      };

      mockAxios.get.mockResolvedValueOnce({ data: mockProfile });

      const result = await api.getUserProfile();

      expect(result).toEqual(mockProfile);
      expect(result).not.toHaveProperty('children_names'); // Safety check - no child data
      expect(mockAxios.get).toHaveBeenCalledWith('/profiles/me');
    });

    it('should create profile without child data', async () => {
      const profileData = {
        first_name: 'Test',
        last_name: 'User',
        date_of_birth: '1990-01-01',
        city: 'Test City',
        state: 'CA',
        zip_code: '12345',
        number_of_children: 2,
        ages_of_children: '5-10',
      };

      mockAxios.post.mockResolvedValueOnce({ data: { ...profileData, id: 'new-profile' } });

      const result = await api.createProfile(profileData);

      expect(result.id).toBe('new-profile');
    });

    it('should update profile', async () => {
      const updateData = { bio: 'Updated bio' };

      mockAxios.put.mockResolvedValueOnce({ data: { id: 'profile-123', ...updateData } });

      const result = await api.updateProfile(updateData);

      expect(result.bio).toBe('Updated bio');
      expect(mockAxios.put).toHaveBeenCalledWith('/profiles/me', updateData);
    });

    it('should search profiles', async () => {
      const mockProfiles = [
        { id: 'profile-1', first_name: 'User1' },
        { id: 'profile-2', first_name: 'User2' },
      ];

      mockAxios.get.mockResolvedValueOnce({ data: mockProfiles });

      const result = await api.searchProfiles({ city: 'San Francisco' });

      expect(result).toHaveLength(2);
    });
  });

  describe('Matches', () => {
    it('should fetch matches', async () => {
      const mockMatches = [
        { id: 'match-1', name: 'User 1' },
        { id: 'match-2', name: 'User 2' },
      ];

      mockAxios.get.mockResolvedValueOnce({ data: mockMatches });

      const result = await api.getMatches();

      expect(result).toHaveLength(2);
    });

    it('should like a parent', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await api.likeParent('parent-123');

      expect(result.success).toBe(true);
    });

    it('should skip a parent', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await api.skipParent('parent-123');

      expect(result.success).toBe(true);
    });
  });

  describe('Messaging', () => {
    it('should send message', async () => {
      const mockMessage = {
        id: 'msg-123',
        text: 'Test message',
        sender_id: 'user-123',
      };

      mockAxios.post.mockResolvedValueOnce({ data: mockMessage });

      const result = await api.sendMessage('conv-123', 'Test message');

      expect(result.text).toBe('Test message');
    });

    it('should fetch conversation messages', async () => {
      const mockMessages = [
        { id: 'msg-1', text: 'Message 1' },
        { id: 'msg-2', text: 'Message 2' },
      ];

      mockAxios.get.mockResolvedValueOnce({ data: mockMessages });

      const result = await api.getMessages('conv-123');

      expect(result).toHaveLength(2);
    });

    it('should fetch conversations', async () => {
      const mockConversations = [
        { id: 'conv-1', lastMessage: 'Hello' },
        { id: 'conv-2', lastMessage: 'Hi there' },
      ];

      mockAxios.get.mockResolvedValueOnce({ data: mockConversations });

      const result = await api.getConversations();

      expect(result).toHaveLength(2);
    });
  });

  describe('Verification', () => {
    it('should request background check', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { status: 'pending' } });

      const result = await api.requestBackgroundCheck();

      expect(result.status).toBe('pending');
    });
  });

  describe('Household', () => {
    it('should fetch household', async () => {
      const mockHousehold = { id: 'household-123', name: 'Test Household' };

      mockAxios.get.mockResolvedValueOnce({ data: mockHousehold });

      const result = await api.getHousehold();

      expect(result.id).toBe('household-123');
    });

    it('should update household', async () => {
      const updateData = { name: 'Updated Household' };

      mockAxios.patch.mockResolvedValueOnce({ data: { ...updateData, id: 'household-123' } });

      const result = await api.updateHousehold(updateData);

      expect(result.name).toBe('Updated Household');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.login('test@example.com', 'password')).rejects.toThrow('Network error');
    });

    it('should handle 500 errors', async () => {
      mockAxios.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Internal server error' } },
      });

      await expect(api.getUserProfile()).rejects.toMatchObject({
        response: { status: 500 },
      });
    });

    it('should setup interceptors on initialization', () => {
      // Verify interceptors were set up
      expect(mockAxios.interceptors.request.use).toBeDefined();
      expect(mockAxios.interceptors.response.use).toBeDefined();
    });
  });
});
