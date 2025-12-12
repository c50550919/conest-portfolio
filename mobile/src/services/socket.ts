/**
 * Socket.io Client Service
 *
 * Purpose: WebSocket connection for real-time events
 * Constitution: Principle IV (Performance - real-time updates)
 *
 * Events:
 * - match_created: Mutual match notification (connection requests accepted)
 * - screenshot_detected: Profile screenshot alert
 * - user_typing: Typing indicators for messages
 * - new_message: Real-time message delivery
 *
 * Note: Browse-based discovery uses connection requests, not swipes
 * Created: 2025-10-06
 * Updated: 2025-10-13 - Removed swipe events
 */

import { io, Socket } from 'socket.io-client';
import tokenStorage from './tokenStorage';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';

export interface MatchCreatedEvent {
  matchId: string;
  matchedUserId: string;
  compatibilityScore: number;
  createdAt: string;
}

// REMOVED: SwipeReceivedEvent - Browse-based discovery uses connection requests

export interface ScreenshotDetectedEvent {
  userId: string;
  timestamp: string;
}

export interface UserTypingEvent {
  userId: string;
  isTyping: boolean;
}

export interface NewMessageEvent {
  messageId: string;
  matchId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image';
  fileUrl?: string;
  timestamp: string;
}

export interface MessageReadEvent {
  messageId: string;
  matchId: string;
  readBy: string;
  readAt: string;
}

export interface TypingEvent {
  matchId: string;
  userId: string;
  isTyping: boolean;
}

export type SocketEventCallback<T> = (data: T) => void;

class SocketService {
  private _socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Get the underlying socket instance for direct event handling
   * Use with caution - prefer using the provided methods when available
   */
  get socket(): Socket | null {
    return this._socket;
  }

  /**
   * Initialize Socket.io connection with JWT authentication
   */
  async connect(): Promise<void> {
    if (this._socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        console.warn('No auth token found, cannot connect to socket');
        return;
      }

      this._socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.setupListeners();
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  /**
   * Setup Socket.io event listeners
   */
  private setupListeners(): void {
    if (!this._socket) {
      return;
    }

    this._socket.on('connect', () => {
      console.log(' Socket connected:', this._socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this._socket.on('disconnect', (reason) => {
      console.log('L Socket disconnected:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Server disconnected - need to manually reconnect
        this._socket?.connect();
      }
    });

    this._socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
        this.disconnect();
      }
    });

    this._socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Disconnect Socket.io connection
   */
  disconnect(): void {
    if (this._socket) {
      this._socket.disconnect();
      this._socket = null;
      this.isConnected = false;
      console.log('Socket disconnected manually');
    }
  }

  /**
   * Check if socket is connected
   */
  connected(): boolean {
    return this.isConnected && this._socket?.connected === true;
  }

  /**
   * Listen for match created events
   * @param callback - Event handler
   */
  onMatchCreated(callback: SocketEventCallback<MatchCreatedEvent>): void {
    this._socket?.on('match_created', callback);
  }

  /**
   * Remove match created listener
   * @param callback - Event handler to remove
   */
  offMatchCreated(callback: SocketEventCallback<MatchCreatedEvent>): void {
    this._socket?.off('match_created', callback);
  }

  // REMOVED: onSwipeReceived() and offSwipeReceived() - Browse-based discovery uses connection requests

  /**
   * Listen for screenshot detected events
   * @param callback - Event handler
   */
  onScreenshotDetected(callback: SocketEventCallback<ScreenshotDetectedEvent>): void {
    this._socket?.on('screenshot_detected', callback);
  }

  /**
   * Remove screenshot detected listener
   * @param callback - Event handler to remove
   */
  offScreenshotDetected(callback: SocketEventCallback<ScreenshotDetectedEvent>): void {
    this._socket?.off('screenshot_detected', callback);
  }

  /**
   * Listen for typing indicator events
   * @param callback - Event handler
   */
  onUserTyping(callback: SocketEventCallback<UserTypingEvent>): void {
    this._socket?.on('user_typing', callback);
  }

  /**
   * Remove typing indicator listener
   * @param callback - Event handler to remove
   */
  offUserTyping(callback: SocketEventCallback<UserTypingEvent>): void {
    this._socket?.off('user_typing', callback);
  }

  /**
   * Emit typing indicator
   * @param recipientId - User ID of recipient
   * @param isTyping - Typing state
   */
  emitTyping(recipientId: string, isTyping: boolean): void {
    this._socket?.emit('typing', { recipientId, isTyping });
  }

  /**
   * Listen for new message events (real-time message delivery)
   * @param callback - Event handler
   */
  onMessageReceived(callback: SocketEventCallback<NewMessageEvent>): void {
    this._socket?.on('message.received', callback);
  }

  /**
   * Remove message received listener
   * @param callback - Event handler to remove
   */
  offMessageReceived(callback: SocketEventCallback<NewMessageEvent>): void {
    this._socket?.off('message.received', callback);
  }

  /**
   * Listen for message read events
   * @param callback - Event handler
   */
  onMessageRead(callback: SocketEventCallback<MessageReadEvent>): void {
    this._socket?.on('message.read', callback);
  }

  /**
   * Remove message read listener
   * @param callback - Event handler to remove
   */
  offMessageRead(callback: SocketEventCallback<MessageReadEvent>): void {
    this._socket?.off('message.read', callback);
  }

  /**
   * Listen for typing start events
   * @param callback - Event handler
   */
  onTypingStart(callback: SocketEventCallback<TypingEvent>): void {
    this._socket?.on('typing:start', callback);
  }

  /**
   * Remove typing start listener
   * @param callback - Event handler to remove
   */
  offTypingStart(callback: SocketEventCallback<TypingEvent>): void {
    this._socket?.off('typing:start', callback);
  }

  /**
   * Listen for typing stop events
   * @param callback - Event handler
   */
  onTypingStop(callback: SocketEventCallback<TypingEvent>): void {
    this._socket?.on('typing:stop', callback);
  }

  /**
   * Remove typing stop listener
   * @param callback - Event handler to remove
   */
  offTypingStop(callback: SocketEventCallback<TypingEvent>): void {
    this._socket?.off('typing:stop', callback);
  }

  /**
   * Emit typing start event
   * @param matchId - UUID of match/conversation
   */
  emitTypingStart(matchId: string): void {
    this._socket?.emit('typing:start', { matchId });
  }

  /**
   * Emit typing stop event
   * @param matchId - UUID of match/conversation
   */
  emitTypingStop(matchId: string): void {
    this._socket?.emit('typing:stop', { matchId });
  }

  /**
   * Join a conversation room for real-time updates
   * @param conversationId - Conversation UUID
   */
  joinConversation(conversationId: string): void {
    this._socket?.emit('join_conversation', { conversationId });
  }

  /**
   * Leave a conversation room
   * @param conversationId - Conversation UUID
   */
  leaveConversation(conversationId: string): void {
    this._socket?.emit('leave_conversation', { conversationId });
  }

  /**
   * Send message via Socket.io (real-time)
   * @param recipientId - Recipient user ID
   * @param content - Message content
   * @param messageType - Message type (text, image, etc.)
   * @param fileUrl - Optional file URL
   */
  sendMessage(
    recipientId: string,
    content: string,
    messageType: string = 'text',
    fileUrl?: string
  ): void {
    this._socket?.emit('send_message', {
      recipientId,
      content,
      messageType,
      fileUrl,
    });
  }

  /**
   * Update presence status
   * @param status - Presence status (online, away, busy)
   */
  updatePresence(status: 'online' | 'away' | 'busy'): void {
    this._socket?.emit('presence_update', { status });
  }
}

export default new SocketService();
