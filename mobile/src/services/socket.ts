/**
 * Socket.io Client Service
 *
 * Purpose: WebSocket connection for real-time events
 * Constitution: Principle IV (Performance - real-time updates)
 *
 * Events:
 * - match_created: Mutual match notification
 * - swipe_received: Someone swiped right (premium feature)
 * - screenshot_detected: Profile screenshot alert
 * - user_typing: Typing indicators for messages
 * - new_message: Real-time message delivery
 *
 * Created: 2025-10-06
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

export interface MatchCreatedEvent {
  matchId: string;
  matchedUserId: string;
  compatibilityScore: number;
  createdAt: string;
}

export interface SwipeReceivedEvent {
  swiperId: string;
  timestamp: string;
}

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
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export type SocketEventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Initialize Socket.io connection with JWT authentication
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.warn('No auth token found, cannot connect to socket');
        return;
      }

      this.socket = io(SOCKET_URL, {
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
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(' Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('L Socket disconnected:', reason);
      this.isConnected = false;

      if (reason === 'io server disconnect') {
        // Server disconnected - need to manually reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnect attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Disconnect Socket.io connection
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected manually');
    }
  }

  /**
   * Check if socket is connected
   */
  connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Listen for match created events
   * @param callback - Event handler
   */
  onMatchCreated(callback: SocketEventCallback<MatchCreatedEvent>): void {
    this.socket?.on('match_created', callback);
  }

  /**
   * Remove match created listener
   * @param callback - Event handler to remove
   */
  offMatchCreated(callback: SocketEventCallback<MatchCreatedEvent>): void {
    this.socket?.off('match_created', callback);
  }

  /**
   * Listen for swipe received events (premium feature)
   * @param callback - Event handler
   */
  onSwipeReceived(callback: SocketEventCallback<SwipeReceivedEvent>): void {
    this.socket?.on('swipe_received', callback);
  }

  /**
   * Remove swipe received listener
   * @param callback - Event handler to remove
   */
  offSwipeReceived(callback: SocketEventCallback<SwipeReceivedEvent>): void {
    this.socket?.off('swipe_received', callback);
  }

  /**
   * Listen for screenshot detected events
   * @param callback - Event handler
   */
  onScreenshotDetected(
    callback: SocketEventCallback<ScreenshotDetectedEvent>
  ): void {
    this.socket?.on('screenshot_detected', callback);
  }

  /**
   * Remove screenshot detected listener
   * @param callback - Event handler to remove
   */
  offScreenshotDetected(
    callback: SocketEventCallback<ScreenshotDetectedEvent>
  ): void {
    this.socket?.off('screenshot_detected', callback);
  }

  /**
   * Listen for typing indicator events
   * @param callback - Event handler
   */
  onUserTyping(callback: SocketEventCallback<UserTypingEvent>): void {
    this.socket?.on('user_typing', callback);
  }

  /**
   * Remove typing indicator listener
   * @param callback - Event handler to remove
   */
  offUserTyping(callback: SocketEventCallback<UserTypingEvent>): void {
    this.socket?.off('user_typing', callback);
  }

  /**
   * Emit typing indicator
   * @param recipientId - User ID of recipient
   * @param isTyping - Typing state
   */
  emitTyping(recipientId: string, isTyping: boolean): void {
    this.socket?.emit('typing', { recipientId, isTyping });
  }

  /**
   * Join a conversation room for real-time updates
   * @param conversationId - Conversation UUID
   */
  joinConversation(conversationId: string): void {
    this.socket?.emit('join_conversation', { conversationId });
  }

  /**
   * Leave a conversation room
   * @param conversationId - Conversation UUID
   */
  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave_conversation', { conversationId });
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
    this.socket?.emit('send_message', {
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
    this.socket?.emit('presence_update', { status });
  }
}

export default new SocketService();
