/**
 * Socket Service Tests
 * Tests WebSocket connection and event handling
 */

import { Socket } from 'socket.io-client';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  id: 'mock-socket-id',
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock tokenStorage
jest.mock('../../src/services/tokenStorage', () => ({
  __esModule: true,
  default: {
    getAccessToken: jest.fn(),
  },
}));

import socketService from '../../src/services/socket';
import tokenStorage from '../../src/services/tokenStorage';
import { io } from 'socket.io-client';

const mockTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const mockIo = io as jest.MockedFunction<typeof io>;

describe('SocketService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
  });

  describe('connect', () => {
    it('should connect with valid token', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue('valid-token');

      await socketService.connect();

      expect(mockIo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'valid-token' },
          transports: ['websocket'],
          reconnection: true,
        })
      );
    });

    it('should not connect without token', async () => {
      mockTokenStorage.getAccessToken.mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await socketService.connect();

      expect(consoleSpy).toHaveBeenCalledWith(
        'No auth token found, cannot connect to socket'
      );
      consoleSpy.mockRestore();
    });

    it('should not reconnect if already connected', async () => {
      mockSocket.connected = true;
      mockTokenStorage.getAccessToken.mockResolvedValue('valid-token');

      // Reset mock to simulate already connected state
      const originalSocket = (socketService as any)._socket;
      (socketService as any)._socket = { connected: true };

      await socketService.connect();

      // Should not create new connection
      expect(mockIo).not.toHaveBeenCalled();

      // Restore
      (socketService as any)._socket = originalSocket;
    });

    it('should handle connection errors', async () => {
      mockTokenStorage.getAccessToken.mockRejectedValue(new Error('Token error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await socketService.connect();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Socket connection error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should disconnect and clean up socket', () => {
      // Simulate connected state
      (socketService as any)._socket = mockSocket;
      (socketService as any).isConnected = true;

      socketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect((socketService as any)._socket).toBeNull();
      expect((socketService as any).isConnected).toBe(false);
    });

    it('should handle disconnect when not connected', () => {
      (socketService as any)._socket = null;

      // Should not throw
      expect(() => socketService.disconnect()).not.toThrow();
    });
  });

  describe('connected', () => {
    it('should return true when connected', () => {
      (socketService as any)._socket = { connected: true };
      (socketService as any).isConnected = true;

      expect(socketService.connected()).toBe(true);
    });

    it('should return false when not connected', () => {
      (socketService as any)._socket = null;
      (socketService as any).isConnected = false;

      expect(socketService.connected()).toBe(false);
    });

    it('should return false when socket exists but not connected', () => {
      (socketService as any)._socket = { connected: false };
      (socketService as any).isConnected = true;

      expect(socketService.connected()).toBe(false);
    });
  });

  describe('Match Events', () => {
    beforeEach(() => {
      (socketService as any)._socket = mockSocket;
    });

    it('should register match created listener', () => {
      const callback = jest.fn();
      socketService.onMatchCreated(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('match_created', callback);
    });

    it('should remove match created listener', () => {
      const callback = jest.fn();
      socketService.offMatchCreated(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('match_created', callback);
    });
  });

  describe('Screenshot Events', () => {
    beforeEach(() => {
      (socketService as any)._socket = mockSocket;
    });

    it('should register screenshot detected listener', () => {
      const callback = jest.fn();
      socketService.onScreenshotDetected(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('screenshot_detected', callback);
    });

    it('should remove screenshot detected listener', () => {
      const callback = jest.fn();
      socketService.offScreenshotDetected(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('screenshot_detected', callback);
    });
  });

  describe('Typing Events', () => {
    beforeEach(() => {
      (socketService as any)._socket = mockSocket;
    });

    it('should register user typing listener', () => {
      const callback = jest.fn();
      socketService.onUserTyping(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('user_typing', callback);
    });

    it('should remove user typing listener', () => {
      const callback = jest.fn();
      socketService.offUserTyping(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('user_typing', callback);
    });

    it('should emit typing indicator', () => {
      socketService.emitTyping('recipient-123', true);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        recipientId: 'recipient-123',
        isTyping: true,
      });
    });

    it('should register typing start listener', () => {
      const callback = jest.fn();
      socketService.onTypingStart(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('typing:start', callback);
    });

    it('should remove typing start listener', () => {
      const callback = jest.fn();
      socketService.offTypingStart(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('typing:start', callback);
    });

    it('should register typing stop listener', () => {
      const callback = jest.fn();
      socketService.onTypingStop(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('typing:stop', callback);
    });

    it('should remove typing stop listener', () => {
      const callback = jest.fn();
      socketService.offTypingStop(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('typing:stop', callback);
    });

    it('should emit typing start event', () => {
      socketService.emitTypingStart('match-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('typing:start', {
        matchId: 'match-123',
      });
    });

    it('should emit typing stop event', () => {
      socketService.emitTypingStop('match-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('typing:stop', {
        matchId: 'match-123',
      });
    });
  });

  describe('Message Events', () => {
    beforeEach(() => {
      (socketService as any)._socket = mockSocket;
    });

    it('should register message received listener', () => {
      const callback = jest.fn();
      socketService.onMessageReceived(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('message.received', callback);
    });

    it('should remove message received listener', () => {
      const callback = jest.fn();
      socketService.offMessageReceived(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('message.received', callback);
    });

    it('should register message read listener', () => {
      const callback = jest.fn();
      socketService.onMessageRead(callback);

      expect(mockSocket.on).toHaveBeenCalledWith('message.read', callback);
    });

    it('should remove message read listener', () => {
      const callback = jest.fn();
      socketService.offMessageRead(callback);

      expect(mockSocket.off).toHaveBeenCalledWith('message.read', callback);
    });

    it('should send message via socket', () => {
      socketService.sendMessage('recipient-123', 'Hello!', 'text');

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        recipientId: 'recipient-123',
        content: 'Hello!',
        messageType: 'text',
        fileUrl: undefined,
      });
    });

    it('should send message with file', () => {
      socketService.sendMessage('recipient-123', 'Image', 'image', 'https://example.com/image.jpg');

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        recipientId: 'recipient-123',
        content: 'Image',
        messageType: 'image',
        fileUrl: 'https://example.com/image.jpg',
      });
    });
  });

  describe('Conversation Room', () => {
    beforeEach(() => {
      (socketService as any)._socket = mockSocket;
    });

    it('should join conversation room', () => {
      socketService.joinConversation('conv-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', {
        conversationId: 'conv-123',
      });
    });

    it('should leave conversation room', () => {
      socketService.leaveConversation('conv-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_conversation', {
        conversationId: 'conv-123',
      });
    });
  });

  describe('Presence', () => {
    beforeEach(() => {
      (socketService as any)._socket = mockSocket;
    });

    it('should update presence to online', () => {
      socketService.updatePresence('online');

      expect(mockSocket.emit).toHaveBeenCalledWith('presence_update', {
        status: 'online',
      });
    });

    it('should update presence to away', () => {
      socketService.updatePresence('away');

      expect(mockSocket.emit).toHaveBeenCalledWith('presence_update', {
        status: 'away',
      });
    });

    it('should update presence to busy', () => {
      socketService.updatePresence('busy');

      expect(mockSocket.emit).toHaveBeenCalledWith('presence_update', {
        status: 'busy',
      });
    });
  });

  describe('Socket Getter', () => {
    it('should return socket instance', () => {
      (socketService as any)._socket = mockSocket;

      expect(socketService.socket).toBe(mockSocket);
    });

    it('should return null when not connected', () => {
      (socketService as any)._socket = null;

      expect(socketService.socket).toBeNull();
    });
  });

  describe('Null Socket Handling', () => {
    beforeEach(() => {
      (socketService as any)._socket = null;
    });

    it('should not throw when registering listener without socket', () => {
      const callback = jest.fn();
      expect(() => socketService.onMatchCreated(callback)).not.toThrow();
    });

    it('should not throw when emitting without socket', () => {
      expect(() => socketService.emitTyping('recipient', true)).not.toThrow();
    });

    it('should not throw when sending message without socket', () => {
      expect(() => socketService.sendMessage('recipient', 'message')).not.toThrow();
    });
  });
});
