import api from '../../src/services/api';

/**
 * API Service Tests
 * Tests API client with mocked responses
 */

// Mock fetch
global.fetch = jest.fn();

describe('API Service', () => {
  beforeEach(() => {
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('Authentication', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com' },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.auth.login('test@example.com', 'password123');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle login failure', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      } as Response);

      await expect(
        api.auth.login('test@example.com', 'wrong-password')
      ).rejects.toThrow();
    });

    it('should register new user', async () => {
      const mockResponse = {
        user: { id: 'new-user', email: 'new@example.com' },
        accessToken: 'new-token',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await api.auth.register({
        email: 'new@example.com',
        password: 'SecurePass123!',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Profile Management', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'profile-123',
        first_name: 'Test',
        last_name: 'User',
        children_count: 2,
        children_ages_range: '5-10',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfile,
      } as Response);

      const result = await api.profiles.getProfile('profile-123');

      expect(result).toEqual(mockProfile);
      expect(result).not.toHaveProperty('children_names'); // Safety check
    });

    it('should create profile without child data', async () => {
      const profileData = {
        first_name: 'Test',
        last_name: 'User',
        children_count: 2,
        children_ages_range: '5-10',
        // NO children_names or children_photos
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...profileData, id: 'new-profile' }),
      } as Response);

      const result = await api.profiles.createProfile(profileData);

      expect(result.id).toBe('new-profile');
    });

    it('should reject profile with child data', async () => {
      const invalidProfileData = {
        first_name: 'Test',
        children_names: ['Tommy'], // Should be rejected
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Child data not allowed' }),
      } as Response);

      await expect(
        api.profiles.createProfile(invalidProfileData as any)
      ).rejects.toThrow();
    });
  });

  describe('Matching', () => {
    it('should fetch potential matches', async () => {
      const mockMatches = [
        {
          profile_id: 'profile-1',
          compatibility_score: 0.85,
          profile: { first_name: 'Match1' },
        },
        {
          profile_id: 'profile-2',
          compatibility_score: 0.75,
          profile: { first_name: 'Match2' },
        },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMatches,
      } as Response);

      const result = await api.matches.getPotentialMatches();

      expect(result).toHaveLength(2);
      expect(result[0].compatibility_score).toBe(0.85);
    });

    it('should express interest in profile', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ match_id: 'match-123', status: 'one_interested' }),
      } as Response);

      const result = await api.matches.expressInterest('profile-123');

      expect(result.match_id).toBe('match-123');
      expect(result.status).toBe('one_interested');
    });
  });

  describe('Messaging', () => {
    it('should send message', async () => {
      const mockMessage = {
        id: 'msg-123',
        content: 'Test message',
        sender_id: 'user-123',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessage,
      } as Response);

      const result = await api.messages.sendMessage('conv-123', 'Test message');

      expect(result.content).toBe('Test message');
    });

    it('should fetch conversation messages', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Message 1' },
        { id: 'msg-2', content: 'Message 2' },
      ];

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessages,
      } as Response);

      const result = await api.messages.getMessages('conv-123');

      expect(result).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(api.auth.login('test@example.com', 'password')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle 500 errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      } as Response);

      await expect(api.profiles.getProfile('profile-123')).rejects.toThrow();
    });
  });
});
