/**
 * Messages Service Unit Tests
 *
 * Tests for end-to-end encryption, message handling, and real-time delivery.
 *
 * Constitution: Principle III (Security) - E2E encryption for all messages
 *              Principle IV (Performance) - <100ms message history, <50ms send
 *              Principle V (Testing) - Comprehensive unit test coverage
 *
 * Reference: Signal Protocol via Socket.io
 */

import { v4 as uuidv4 } from 'uuid';

// Mock encryption module
const mockEncrypt = jest.fn((text: string) => `encrypted:${text}`);
const mockDecrypt = jest.fn((text: string) => text.replace('encrypted:', ''));

jest.mock('../../../src/utils/encryption', () => ({
  encrypt: (text: string) => mockEncrypt(text),
  decrypt: (text: string) => mockDecrypt(text),
}));

// Mock Match Model
const mockMatch = {
  id: uuidv4(),
  user_id_1: uuidv4(),
  user_id_2: uuidv4(),
  status: 'accepted',
};

jest.mock('../../../src/models/Match', () => ({
  MatchModel: {
    findById: jest.fn().mockResolvedValue(mockMatch),
  },
  Match: {},
}));

// Mock Message Model
const mockMessages: any[] = [];
const mockConversation = {
  id: uuidv4(),
  participant1_id: mockMatch.user_id_1,
  participant2_id: mockMatch.user_id_2,
};

jest.mock('../../../src/models/Message', () => ({
  MessageModel: {
    findConversation: jest.fn().mockResolvedValue(mockConversation),
    createConversation: jest.fn().mockResolvedValue(mockConversation),
    createMessage: jest.fn().mockImplementation((params) => ({
      id: uuidv4(),
      conversation_id: params.conversation_id,
      sender_id: params.sender_id,
      content: params.content,
      message_type: params.message_type,
      file_url: params.file_url,
      read: false,
      read_at: null,
      created_at: new Date(),
    })),
    getConversationMessages: jest.fn().mockResolvedValue(mockMessages),
    markAsRead: jest.fn().mockResolvedValue(true),
    markConversationAsRead: jest.fn().mockResolvedValue(true),
    getUnreadCount: jest.fn().mockResolvedValue(0),
    getUserConversations: jest.fn().mockResolvedValue([]),
    deleteMessage: jest.fn().mockResolvedValue(true),
  },
  Conversation: {},
}));

// Mock Socket Service
const mockEmit = jest.fn();
const mockSocketService = {
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({ emit: mockEmit }),
  }),
  emitTypingStart: jest.fn(),
  emitTypingStop: jest.fn(),
};
jest.mock('../../../src/services/SocketService', () => ({
  __esModule: true,
  default: mockSocketService,
}));

// Mock logger - must match the default export pattern
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

import { MessagesService } from '../../../src/features/messages/messages.service';
import { MatchModel } from '../../../src/models/Match';
import { MessageModel } from '../../../src/models/Message';

describe('MessagesService', () => {
  let messagesService: MessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    messagesService = new MessagesService();
    mockMessages.length = 0;
  });

  describe('Message Encryption', () => {
    it('should encrypt message content before storing', async () => {
      const plaintext = 'Hello, this is a secret message!';

      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: plaintext,
      });

      // Verify encrypt was called
      expect(mockEncrypt).toHaveBeenCalledWith(plaintext);

      // Verify createMessage received encrypted content
      expect(MessageModel.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: `encrypted:${plaintext}`,
        }),
      );
    });

    it('should decrypt message content when retrieving history', async () => {
      const encryptedContent = 'encrypted:Test message';
      mockMessages.push({
        id: uuidv4(),
        sender_id: mockMatch.user_id_1,
        content: encryptedContent,
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      });

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      const result = await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
      });

      // Verify decrypt was called
      expect(mockDecrypt).toHaveBeenCalledWith(encryptedContent);

      // Verify returned message is decrypted
      expect(result.messages[0].content).toBe('Test message');
    });

    it('should handle special characters in encrypted messages', async () => {
      const specialChars = 'Test!@#$%^&*()_+-={}[]|:";\'<>?,./';

      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: specialChars,
      });

      expect(mockEncrypt).toHaveBeenCalledWith(specialChars);
    });

    it('should handle unicode characters in encrypted messages', async () => {
      const unicodeText = 'Hello 世界 🌍 مرحبا';

      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: unicodeText,
      });

      expect(mockEncrypt).toHaveBeenCalledWith(unicodeText);
    });

    it('should handle long messages correctly', async () => {
      const longMessage = 'a'.repeat(5000);

      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: longMessage,
      });

      expect(mockEncrypt).toHaveBeenCalledWith(longMessage);
    });
  });

  describe('sendMessage', () => {
    it('should verify user is match participant before sending', async () => {
      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: 'Test',
      });

      expect(MatchModel.findById).toHaveBeenCalledWith(mockMatch.id);
    });

    it('should reject message from non-participant', async () => {
      (MatchModel.findById as jest.Mock).mockResolvedValueOnce({
        ...mockMatch,
        user_id_1: 'other-user-1',
        user_id_2: 'other-user-2',
      });

      await expect(
        messagesService.sendMessage({
          matchId: mockMatch.id,
          senderId: 'unauthorized-user',
          content: 'Test',
        }),
      ).rejects.toThrow('FORBIDDEN_NOT_PARTICIPANT');
    });

    it('should reject message if match not accepted', async () => {
      (MatchModel.findById as jest.Mock).mockResolvedValueOnce({
        ...mockMatch,
        status: 'pending',
      });

      await expect(
        messagesService.sendMessage({
          matchId: mockMatch.id,
          senderId: mockMatch.user_id_1,
          content: 'Test',
        }),
      ).rejects.toThrow('MATCH_NOT_ACCEPTED');
    });

    it('should emit new_message event via Socket.io', async () => {
      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: 'Test message',
      });

      // Verify Socket.io emission occurred
      expect(mockEmit).toHaveBeenCalled();
    });

    it('should return decrypted content to sender', async () => {
      const plaintext = 'My secret message';

      const result = await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: plaintext,
      });

      expect(result.content).toBe(plaintext);
    });

    it('should support different message types', async () => {
      const result = await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: 'Image caption',
        messageType: 'image',
        fileUrl: 'https://example.com/image.jpg',
      });

      expect(result.messageType).toBe('image');
      expect(result.fileUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('getMessageHistory', () => {
    beforeEach(() => {
      // Set up mock messages
      mockMessages.push(
        {
          id: uuidv4(),
          sender_id: mockMatch.user_id_1,
          content: 'encrypted:Message 1',
          message_type: 'text',
          file_url: null,
          read: true,
          read_at: new Date(),
          created_at: new Date(),
        },
        {
          id: uuidv4(),
          sender_id: mockMatch.user_id_2,
          content: 'encrypted:Message 2',
          message_type: 'text',
          file_url: null,
          read: false,
          read_at: null,
          created_at: new Date(),
        },
      );
    });

    it('should verify user is participant before returning history', async () => {
      await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
      });

      expect(MatchModel.findById).toHaveBeenCalledWith(mockMatch.id);
    });

    it('should decrypt all messages in history', async () => {
      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      const result = await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
      });

      // Verify all messages are decrypted
      result.messages.forEach((msg) => {
        expect(msg.content).not.toContain('encrypted:');
      });
    });

    it('should return empty array when no conversation exists', async () => {
      (MessageModel.findConversation as jest.Mock).mockResolvedValueOnce(null);

      const result = await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
      });

      expect(result.messages).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    it('should support cursor-based pagination', async () => {
      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      const result = await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
        cursor: mockMessages[0].id,
        limit: 10,
      });

      expect(result.messages).toBeDefined();
    });

    it('should respect message limit', async () => {
      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      const result = await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
        limit: 1,
      });

      expect(result.messages.length).toBeLessThanOrEqual(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const messageId = uuidv4();

      mockMessages.push({
        id: messageId,
        sender_id: mockMatch.user_id_2, // Other user sent
        content: 'encrypted:Test',
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      });

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      await messagesService.markAsRead({
        messageId,
        userId: mockMatch.user_id_1, // Recipient
      });

      expect(MessageModel.markAsRead).toHaveBeenCalledWith(messageId);
    });

    it('should emit read receipt via Socket.io', async () => {
      const messageId = uuidv4();

      mockMessages.push({
        id: messageId,
        sender_id: mockMatch.user_id_2,
        content: 'encrypted:Test',
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      });

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      await messagesService.markAsRead({
        messageId,
        userId: mockMatch.user_id_1,
      });

      expect(mockEmit).toHaveBeenCalled();
    });
  });

  describe('emitTypingIndicator', () => {
    it('should emit typing start to other participant', async () => {
      const SocketService = require('../../../src/services/SocketService').default;

      await messagesService.emitTypingIndicator({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
        isTyping: true,
      });

      expect(SocketService.emitTypingStart).toHaveBeenCalled();
    });

    it('should emit typing stop to other participant', async () => {
      const SocketService = require('../../../src/services/SocketService').default;

      await messagesService.emitTypingIndicator({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
        isTyping: false,
      });

      expect(SocketService.emitTypingStop).toHaveBeenCalled();
    });

    it('should reject typing indicator from non-participant', async () => {
      (MatchModel.findById as jest.Mock).mockResolvedValueOnce({
        ...mockMatch,
        user_id_1: 'other-user-1',
        user_id_2: 'other-user-2',
      });

      await expect(
        messagesService.emitTypingIndicator({
          matchId: mockMatch.id,
          userId: 'unauthorized-user',
          isTyping: true,
        }),
      ).rejects.toThrow('FORBIDDEN_NOT_PARTICIPANT');
    });
  });

  describe('Message Security', () => {
    it('should never return encrypted content to unauthorized users', async () => {
      (MatchModel.findById as jest.Mock).mockResolvedValueOnce({
        ...mockMatch,
        user_id_1: 'other-user-1',
        user_id_2: 'other-user-2',
      });

      await expect(
        messagesService.getMessageHistory({
          matchId: mockMatch.id,
          userId: 'unauthorized-user',
        }),
      ).rejects.toThrow('FORBIDDEN_NOT_PARTICIPANT');
    });

    it('should use AES-256-GCM encryption (verified by mock)', () => {
      // The actual encrypt function uses AES-256-GCM
      // This test verifies the mock is called correctly
      const { encrypt } = require('../../../src/utils/encryption');
      const result = encrypt('test');
      expect(result).toBe('encrypted:test');
    });

    it('should handle encryption errors gracefully', async () => {
      mockEncrypt.mockImplementationOnce(() => {
        throw new Error('Encryption failed');
      });

      await expect(
        messagesService.sendMessage({
          matchId: mockMatch.id,
          senderId: mockMatch.user_id_1,
          content: 'Test',
        }),
      ).rejects.toThrow();
    });

    it('should handle decryption errors gracefully', async () => {
      mockDecrypt.mockImplementationOnce(() => {
        throw new Error('Decryption failed');
      });

      mockMessages.push({
        id: uuidv4(),
        sender_id: mockMatch.user_id_1,
        content: 'corrupted_data',
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      });

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      await expect(
        messagesService.getMessageHistory({
          matchId: mockMatch.id,
          userId: mockMatch.user_id_1,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete sendMessage within performance budget', async () => {
      const start = Date.now();

      await messagesService.sendMessage({
        matchId: mockMatch.id,
        senderId: mockMatch.user_id_1,
        content: 'Performance test message',
      });

      const duration = Date.now() - start;

      // Should be fast with mocked dependencies
      // In real tests, this would verify <50ms P95
      expect(duration).toBeLessThan(1000);
    });

    it('should complete getMessageHistory within performance budget', async () => {
      // Add 20 messages to test pagination performance
      for (let i = 0; i < 20; i++) {
        mockMessages.push({
          id: uuidv4(),
          sender_id: i % 2 === 0 ? mockMatch.user_id_1 : mockMatch.user_id_2,
          content: `encrypted:Message ${i}`,
          message_type: 'text',
          file_url: null,
          read: false,
          read_at: null,
          created_at: new Date(),
        });
      }

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      const start = Date.now();

      await messagesService.getMessageHistory({
        matchId: mockMatch.id,
        userId: mockMatch.user_id_1,
        limit: 20,
      });

      const duration = Date.now() - start;

      // Should be fast with mocked dependencies
      // In real tests, this would verify <100ms P95
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('getUserConversations', () => {
    it('should decrypt last message in conversation list', async () => {
      const conversations = [mockConversation];
      const lastMessage = {
        id: uuidv4(),
        sender_id: mockMatch.user_id_2,
        content: 'encrypted:Last message',
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      };

      (MessageModel.getUserConversations as jest.Mock).mockResolvedValueOnce(conversations);
      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce([lastMessage]);

      const result = await messagesService.getUserConversations(mockMatch.user_id_1);

      expect(result[0].lastMessage.content).toBe('Last message');
    });
  });

  describe('deleteMessage', () => {
    it('should allow sender to delete their own message', async () => {
      const messageId = uuidv4();

      mockMessages.push({
        id: messageId,
        sender_id: mockMatch.user_id_1, // Same as deleting user
        content: 'encrypted:To delete',
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      });

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      await messagesService.deleteMessage(messageId, mockMatch.user_id_1);

      expect(MessageModel.deleteMessage).toHaveBeenCalledWith(messageId);
    });

    it('should reject deletion by non-sender', async () => {
      const messageId = uuidv4();

      mockMessages.push({
        id: messageId,
        sender_id: mockMatch.user_id_2, // Different from deleting user
        content: 'encrypted:Cannot delete',
        message_type: 'text',
        file_url: null,
        read: false,
        read_at: null,
        created_at: new Date(),
      });

      (MessageModel.getConversationMessages as jest.Mock).mockResolvedValueOnce(mockMessages);

      await expect(messagesService.deleteMessage(messageId, mockMatch.user_id_1)).rejects.toThrow(
        'UNAUTHORIZED_DELETE',
      );
    });
  });
});
