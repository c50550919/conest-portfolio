/**
 * Unit Tests for Messages API Client
 * Tests basic messaging functionality
 */

import axios from 'axios';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
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

import MessagesAPI from '../../../src/services/api/messages';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('MessagesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MessagesAPI.clearRetryQueue();
  });

  describe('getMatches', () => {
    it('should fetch matches with messages', async () => {
      const mockResponse = {
        matches: [
          {
            id: 'match-1',
            userId: 'user-2',
            firstName: 'Jane',
            unreadCount: 2,
            compatibilityScore: 85,
            lastMessage: { content: 'Hello!' },
          },
        ],
        nextCursor: null,
        hasMore: false,
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await MessagesAPI.getMatches();

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].unreadCount).toBe(2);
    });

    it('should paginate matches', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { matches: [], nextCursor: null, hasMore: false } });

      await MessagesAPI.getMatches('cursor-123', 10);

      expect(mockAxios.get).toHaveBeenCalledWith('/messages/matches', {
        params: { limit: 10, cursor: 'cursor-123' },
      });
    });

    it('should use default limit of 20', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { matches: [], nextCursor: null, hasMore: false } });

      await MessagesAPI.getMatches();

      expect(mockAxios.get).toHaveBeenCalledWith('/messages/matches', { params: { limit: 20 } });
    });
  });

  describe('getHistory', () => {
    it('should fetch message history', async () => {
      const mockResponse = {
        messages: [
          { id: 'msg-1', content: 'Hello', senderId: 'user-1', createdAt: new Date().toISOString() },
          { id: 'msg-2', content: 'Hi there', senderId: 'user-2', createdAt: new Date().toISOString() },
        ],
        nextCursor: 'cursor-456',
        hasMore: true,
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await MessagesAPI.getHistory('match-123');

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('should paginate with cursor', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { messages: [], nextCursor: null, hasMore: false } });

      await MessagesAPI.getHistory('match-123', 'cursor-123', 100);

      expect(mockAxios.get).toHaveBeenCalledWith('/messages/history/match-123', {
        params: { limit: 100, cursor: 'cursor-123' },
      });
    });

    it('should use default limit of 50', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { messages: [], nextCursor: null, hasMore: false } });

      await MessagesAPI.getHistory('match-123');

      expect(mockAxios.get).toHaveBeenCalledWith('/messages/history/match-123', { params: { limit: 50 } });
    });
  });

  describe('sendMessage', () => {
    it('should send text message', async () => {
      const mockResponse = {
        message: {
          id: 'msg-123',
          matchId: 'match-1',
          content: 'Hello!',
          messageType: 'text',
          status: 'sent',
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await MessagesAPI.sendMessage('match-1', 'Hello!');

      expect(result.message.content).toBe('Hello!');
      expect(mockAxios.post).toHaveBeenCalledWith('/messages/match-1', {
        content: 'Hello!',
        messageType: 'text',
        fileUrl: undefined,
      });
    });

    it('should send image message', async () => {
      const mockResponse = {
        message: { id: 'msg-123', messageType: 'image', fileUrl: 'https://example.com/image.jpg' },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await MessagesAPI.sendMessage('match-1', 'Check this out', 'image', 'https://example.com/image.jpg');

      expect(mockAxios.post).toHaveBeenCalledWith('/messages/match-1', {
        content: 'Check this out',
        messageType: 'image',
        fileUrl: 'https://example.com/image.jpg',
      });
    });

    it('should add to retry queue on failure', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      await expect(MessagesAPI.sendMessage('match-1', 'Hello!')).rejects.toThrow();
      expect(MessagesAPI.getRetryQueueSize()).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-123',
        readAt: new Date().toISOString(),
      };
      mockAxios.patch.mockResolvedValueOnce({ data: mockResponse });

      const result = await MessagesAPI.markAsRead('msg-123');

      expect(result.success).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockAxios.patch).toHaveBeenCalledWith('/messages/msg-123/read');
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark conversation as read', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true } });

      const result = await MessagesAPI.markConversationAsRead('match-123');

      expect(result.success).toBe(true);
      expect(mockAxios.patch).toHaveBeenCalledWith('/messages/conversation/match-123/read');
    });
  });

  describe('retry queue', () => {
    it('should process retry queue', async () => {
      // First call fails
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      await expect(MessagesAPI.sendMessage('match-1', 'Hello!')).rejects.toThrow();

      expect(MessagesAPI.getRetryQueueSize()).toBe(1);

      // Process queue - next call succeeds
      mockAxios.post.mockResolvedValueOnce({ data: { message: { id: 'msg-123' } } });
      await MessagesAPI.processRetryQueue();

      // Queue should be empty after successful retry
      expect(MessagesAPI.getRetryQueueSize()).toBe(0);
    });

    it('should clear retry queue', () => {
      MessagesAPI.clearRetryQueue();
      expect(MessagesAPI.getRetryQueueSize()).toBe(0);
    });

    it('should get retry queue size', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Error 1'));
      mockAxios.post.mockRejectedValueOnce(new Error('Error 2'));

      await expect(MessagesAPI.sendMessage('match-1', 'Msg 1')).rejects.toThrow();
      await expect(MessagesAPI.sendMessage('match-2', 'Msg 2')).rejects.toThrow();

      expect(MessagesAPI.getRetryQueueSize()).toBe(2);
    });
  });
});
