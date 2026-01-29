/**
 * Unit Tests for Enhanced Messages API Client
 * Tests verification-enforced messaging operations
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

import enhancedMessagesAPI from '../../../src/services/api/enhancedMessagesAPI';

const mockAxios = axios.create() as jest.Mocked<ReturnType<typeof axios.create>>;

describe('EnhancedMessagesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerifiedMessage', () => {
    it('should send verified message successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'msg-123',
          conversationId: 'conv-1',
          senderId: 'user-1',
          recipientId: 'user-2',
          content: 'Hello!',
          messageType: 'text',
          read: false,
          sentAt: new Date().toISOString(),
        },
      };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.sendVerifiedMessage({
        conversationId: 'conv-1',
        recipientId: 'user-2',
        content: 'Hello!',
      });

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('Hello!');
    });

    it('should send message with metadata', async () => {
      const mockResponse = { success: true, data: { id: 'msg-123' } };
      mockAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await enhancedMessagesAPI.sendVerifiedMessage({
        conversationId: 'conv-1',
        recipientId: 'user-2',
        content: 'Hello!',
        messageType: 'text',
        metadata: { source: 'mobile' },
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/messages/verified', expect.objectContaining({
        content: 'Hello!',
        metadata: { source: 'mobile' },
      }));
    });

    it('should handle unverified user error', async () => {
      mockAxios.post.mockRejectedValueOnce({ response: { status: 403, data: { error: 'Not verified' } } });
      await expect(enhancedMessagesAPI.sendVerifiedMessage({
        conversationId: 'conv-1',
        recipientId: 'user-2',
        content: 'Hello!',
      })).rejects.toMatchObject({ response: { status: 403 } });
    });
  });

  describe('getConversations', () => {
    it('should get conversations with counts', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'conv-1',
            participantId: 'user-2',
            participantName: 'Jane',
            participantVerified: true,
            lastMessage: 'Hello!',
            unreadCount: 2,
            bothVerified: true,
          },
        ],
        count: 1,
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getConversations();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].participantVerified).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should handle empty conversations', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: [], count: 0 } });

      const result = await enhancedMessagesAPI.getConversations();

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getMessages', () => {
    it('should get messages with pagination', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'msg-1', content: 'Hello', sentAt: new Date().toISOString() },
          { id: 'msg-2', content: 'Hi there', sentAt: new Date().toISOString() },
        ],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getMessages('conv-1', 50);

      expect(result.data).toHaveLength(2);
      expect(mockAxios.get).toHaveBeenCalledWith('/messages/conversations/conv-1/messages', { params: { limit: 50 } });
    });

    it('should support cursor pagination', async () => {
      mockAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } });

      await enhancedMessagesAPI.getMessages('conv-1', 50, 'cursor-123');

      expect(mockAxios.get).toHaveBeenCalledWith('/messages/conversations/conv-1/messages', {
        params: { limit: 50, cursor: 'cursor-123' },
      });
    });
  });

  describe('checkVerificationStatus', () => {
    it('should check user verification status', async () => {
      const mockResponse = {
        success: true,
        data: { isVerified: true, verificationScore: 85, canMessage: true },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.checkVerificationStatus('user-2');

      expect(result.data.isVerified).toBe(true);
      expect(result.data.canMessage).toBe(true);
    });

    it('should return false for unverified user', async () => {
      const mockResponse = {
        success: true,
        data: { isVerified: false, verificationScore: 20, canMessage: false },
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.checkVerificationStatus('user-2');

      expect(result.data.canMessage).toBe(false);
    });
  });

  describe('reportMessage', () => {
    it('should report message successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'Report submitted' } });

      const result = await enhancedMessagesAPI.reportMessage({
        messageId: 'msg-123',
        reportType: 'harassment',
        description: 'Inappropriate behavior',
      });

      expect(result.success).toBe(true);
    });

    it('should report child safety concern', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'Report submitted' } });

      await enhancedMessagesAPI.reportMessage({
        messageId: 'msg-123',
        reportType: 'child_safety_concern',
      });

      expect(mockAxios.post).toHaveBeenCalledWith('/messages/msg-123/report', {
        reportType: 'child_safety_concern',
      });
    });
  });

  describe('blockConversation', () => {
    it('should block conversation', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { success: true, message: 'Blocked' } });

      const result = await enhancedMessagesAPI.blockConversation('conv-1');

      expect(result.success).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith('/messages/conversations/conv-1/block');
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark conversation as read', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true } });

      const result = await enhancedMessagesAPI.markConversationAsRead('conv-1');

      expect(result.success).toBe(true);
      expect(mockAxios.patch).toHaveBeenCalledWith('/messages/conversations/conv-1/read');
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read', async () => {
      mockAxios.patch.mockResolvedValueOnce({ data: { success: true } });

      const result = await enhancedMessagesAPI.markMessageAsRead('msg-123');

      expect(result.success).toBe(true);
      expect(mockAxios.patch).toHaveBeenCalledWith('/messages/msg-123/read');
    });
  });

  // ===========================================================================
  // VERIFICATION GATING TESTS
  // ===========================================================================

  describe('getMessagesGated', () => {
    it('should return locked response for unverified user', async () => {
      const mockResponse = {
        success: true,
        locked: true,
        unreadCount: 3,
        message: 'Complete verification to view your messages',
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getMessagesGated('conv-123');

      expect(result.locked).toBe(true);
      expect(result.unreadCount).toBe(3);
      expect(result.data).toBeUndefined();
      expect(mockAxios.get).toHaveBeenCalledWith('/messages/conversations/conv-123/gated');
    });

    it('should return full messages for verified user', async () => {
      const mockResponse = {
        success: true,
        locked: false,
        data: [{ id: 'msg-1', content: 'Hello', sentAt: new Date().toISOString() }],
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getMessagesGated('conv-123');

      expect(result.locked).toBe(false);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return locked status with unread count', async () => {
      const mockResponse = {
        success: true,
        locked: true,
        unreadCount: 5,
        message: 'Verify to view messages',
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getUnreadCount();

      expect(result.locked).toBe(true);
      expect(result.unreadCount).toBe(5);
      expect(mockAxios.get).toHaveBeenCalledWith('/messages/unread-count');
    });

    it('should return unlocked status for verified user', async () => {
      const mockResponse = {
        success: true,
        locked: false,
        unreadCount: 3,
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getUnreadCount();

      expect(result.locked).toBe(false);
    });
  });

  // ===========================================================================
  // SECURITY TESTS - Verification Gating
  // ===========================================================================

  describe('Security - Verification Gating', () => {
    it('should NOT expose message content in locked response', async () => {
      const mockResponse = {
        success: true,
        locked: true,
        unreadCount: 3,
        message: 'Complete verification',
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getMessagesGated('conv-123');

      // Verify NO sensitive data in locked response
      expect(result.data).toBeUndefined();
      expect(result).not.toHaveProperty('messages');
      expect(result).not.toHaveProperty('content');
      expect(result).not.toHaveProperty('senderInfo');
    });

    it('should NOT expose sender identities in locked response', async () => {
      const mockResponse = {
        success: true,
        locked: true,
        unreadCount: 5,
      };
      mockAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await enhancedMessagesAPI.getMessagesGated('conv-123');

      // Verify no PII leakage
      expect(JSON.stringify(result)).not.toMatch(/senderId/i);
      expect(JSON.stringify(result)).not.toMatch(/senderName/i);
      expect(JSON.stringify(result)).not.toMatch(/email/i);
    });

    it('should handle network errors gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(enhancedMessagesAPI.getMessagesGated('conv-123')).rejects.toThrow('Network Error');
    });

    it('should handle 403 forbidden for unauthorized access', async () => {
      mockAxios.get.mockRejectedValueOnce({ response: { status: 403 } });

      await expect(enhancedMessagesAPI.getMessagesGated('conv-123')).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });
});
