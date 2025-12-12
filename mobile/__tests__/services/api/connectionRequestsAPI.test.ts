/**
 * Unit Tests for Connection Requests API Client
 * Tests connection request operations (send/accept/decline)
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

import ConnectionRequestsAPI from '../../../src/services/api/connectionRequestsAPI';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('ConnectionRequestsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendConnectionRequest', () => {
    it('should send connection request with message', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'request-123', sender_id: 'user-1', recipient_id: 'user-2', status: 'pending' },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await ConnectionRequestsAPI.sendConnectionRequest('user-2', 'Hello!');

      expect(result.id).toBe('request-123');
      expect(mockAxios.post).toHaveBeenCalledWith('/', { recipient_id: 'user-2', message: 'Hello!' });
    });

    it('should reject empty message', async () => {
      await expect(ConnectionRequestsAPI.sendConnectionRequest('user-2', '')).rejects.toThrow(
        'Please include a message with your connection request'
      );
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only message', async () => {
      await expect(ConnectionRequestsAPI.sendConnectionRequest('user-2', '   ')).rejects.toThrow(
        'Please include a message'
      );
    });

    it('should reject message over 500 characters', async () => {
      await expect(ConnectionRequestsAPI.sendConnectionRequest('user-2', 'a'.repeat(501))).rejects.toThrow(
        'Message is too long'
      );
    });

    it('should handle duplicate request (409)', async () => {
      const error = new Error('Duplicate request') as any;
      error.response = { status: 409 };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(ConnectionRequestsAPI.sendConnectionRequest('user-2', 'Hi')).rejects.toThrow();
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should handle daily rate limit (429)', async () => {
      const error = new Error('Daily limit exceeded') as any;
      error.response = { status: 429, data: { error: 'daily limit' } };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(ConnectionRequestsAPI.sendConnectionRequest('user-2', 'Hi')).rejects.toThrow();
      expect(mockAxios.post).toHaveBeenCalled();
    });

    it('should handle weekly rate limit (429)', async () => {
      const error = new Error('Weekly limit exceeded') as any;
      error.response = { status: 429, data: { error: 'weekly limit' } };
      mockAxios.post.mockRejectedValueOnce(error);
      await expect(ConnectionRequestsAPI.sendConnectionRequest('user-2', 'Hi')).rejects.toThrow();
      expect(mockAxios.post).toHaveBeenCalled();
    });
  });

  describe('listReceivedRequests', () => {
    it('should list received requests', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: 'req-1', sender: { first_name: 'John', age: 35, city: 'SF' } }],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await ConnectionRequestsAPI.listReceivedRequests();

      expect(result).toHaveLength(1);
      expect(result[0].senderProfile?.firstName).toBe('John');
    });

    it('should filter by status', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
      await ConnectionRequestsAPI.listReceivedRequests('pending');
      expect(mockAxios.get).toHaveBeenCalledWith('/received', { params: { status: 'pending' } });
    });
  });

  describe('listSentRequests', () => {
    it('should list sent requests', async () => {
      const mockResponse = {
        success: true,
        data: [{ id: 'req-1', recipient: { first_name: 'Jane', age: 32 } }],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await ConnectionRequestsAPI.listSentRequests();

      expect(result[0].recipientProfile?.firstName).toBe('Jane');
    });
  });

  describe('getMessage', () => {
    it('should get decrypted message', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { message: 'Hello!' } } });
      const result = await ConnectionRequestsAPI.getMessage('req-123');
      expect(result).toBe('Hello!');
    });

    it('should return null for no message', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { message: null } } });
      expect(await ConnectionRequestsAPI.getMessage('req-123')).toBeNull();
    });
  });

  describe('getResponseMessage', () => {
    it('should get decrypted response message', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { responseMessage: 'Thanks!' } } });
      const result = await ConnectionRequestsAPI.getResponseMessage('req-123');
      expect(result).toBe('Thanks!');
    });
  });

  describe('acceptConnectionRequest', () => {
    it('should accept request without response', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { status: 'accepted' } } });
      const result = await ConnectionRequestsAPI.acceptConnectionRequest('req-123');
      expect(result.status).toBe('accepted');
    });

    it('should accept with response message', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { status: 'accepted' } } });
      await ConnectionRequestsAPI.acceptConnectionRequest('req-123', 'Thanks!');
      expect(mockAxios.patch).toHaveBeenCalledWith('/req-123/accept', { response_message: 'Thanks!' });
    });

    it('should reject response over 500 chars', async () => {
      await expect(ConnectionRequestsAPI.acceptConnectionRequest('req-123', 'a'.repeat(501))).rejects.toThrow(
        'Response message is too long'
      );
    });
  });

  describe('declineConnectionRequest', () => {
    it('should decline request', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { status: 'declined' } } });
      const result = await ConnectionRequestsAPI.declineConnectionRequest('req-123');
      expect(result.status).toBe('declined');
    });

    it('should decline with reason', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { status: 'declined' } } });
      await ConnectionRequestsAPI.declineConnectionRequest('req-123', 'Not a good fit');
      expect(mockAxios.patch).toHaveBeenCalledWith('/req-123/decline', { response_message: 'Not a good fit' });
    });

    it('should reject reason over 500 chars', async () => {
      await expect(ConnectionRequestsAPI.declineConnectionRequest('req-123', 'a'.repeat(501))).rejects.toThrow(
        'Decline reason is too long'
      );
    });
  });

  describe('cancelConnectionRequest', () => {
    it('should cancel request', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true, data: { status: 'cancelled' } } });
      const result = await ConnectionRequestsAPI.cancelConnectionRequest('req-123');
      expect(result.status).toBe('cancelled');
    });
  });

  describe('getRateLimitStatus', () => {
    it('should get rate limit status', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: { daily: 3, weekly: 10 } } });
      const result = await ConnectionRequestsAPI.getRateLimitStatus();
      expect(result.daily).toBe(3);
      expect(result.weekly).toBe(10);
    });
  });

  describe('getStatistics', () => {
    it('should get statistics', async () => {
      const mockStats = {
        sent: { total: 10, pending: 2, accepted: 5, declined: 2, expired: 1, cancelled: 0 },
        received: { total: 8, pending: 1, accepted: 4, declined: 2, expired: 1 },
        rateLimit: { daily: 3, weekly: 10 },
      };
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: mockStats } });

      const result = await ConnectionRequestsAPI.getStatistics();

      expect(result.sent.total).toBe(10);
      expect(result.received.total).toBe(8);
    });
  });
});
