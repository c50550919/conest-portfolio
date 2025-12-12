/**
 * Messaging Socket Integration
 * Connects Socket.io real-time events to Redux store
 * Handles message delivery, read receipts, typing indicators, and online status
 */

import socketService from '../socket';
import { store } from '../../store';
import {
  messageReceived,
  messageDelivered,
  messageRead,
  setTypingStatus,
  setOnlineStatus,
  updateConversation,
} from '../../store/slices/enhancedMessagesSlice';
import type { NewMessageEvent, MessageReadEvent, TypingEvent } from '../socket';

/**
 * Enhanced message received event with encryption metadata
 */
interface EnhancedMessageReceivedEvent extends NewMessageEvent {
  conversationId: string;
  encryptionIv?: string;
  encryptionSalt?: string;
  encryptionVersion?: string;
  moderationStatus?: string;
  flaggedForReview?: boolean;
}

/**
 * Message delivered event
 */
interface MessageDeliveredEvent {
  messageId: string;
  conversationId: string;
  deliveredAt: string;
}

/**
 * User online status event
 */
interface OnlineStatusEvent {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

/**
 * Conversation updated event (e.g., muted, blocked)
 */
interface ConversationUpdatedEvent {
  conversationId: string;
  updates: {
    isMuted?: boolean;
    isBlocked?: boolean;
    participantVerified?: boolean;
  };
}

class MessagingSocketIntegration {
  private initialized = false;
  private currentConversationId: string | null = null;

  /**
   * Initialize messaging socket event listeners
   */
  initialize(): void {
    if (this.initialized) {
      console.log('Messaging socket integration already initialized');
      return;
    }

    console.log('Initializing messaging socket integration...');

    // Enhanced message received event
    socketService.socket?.on('message:new', this.handleMessageReceived);

    // Message delivered event
    socketService.socket?.on('message:delivered', this.handleMessageDelivered);

    // Message read event
    socketService.socket?.on('message:read', this.handleMessageRead);

    // Typing indicators
    socketService.socket?.on('typing:start', this.handleTypingStart);
    socketService.socket?.on('typing:stop', this.handleTypingStop);

    // Online status
    socketService.socket?.on('user:online', this.handleUserOnline);
    socketService.socket?.on('user:offline', this.handleUserOffline);

    // Conversation updates
    socketService.socket?.on('conversation:updated', this.handleConversationUpdated);

    // Verification status updates
    socketService.socket?.on('user:verified', this.handleUserVerified);

    this.initialized = true;
    console.log('Messaging socket integration initialized successfully');
  }

  /**
   * Clean up socket event listeners
   */
  cleanup(): void {
    if (!this.initialized) {
      return;
    }

    console.log('Cleaning up messaging socket integration...');

    socketService.socket?.off('message:new', this.handleMessageReceived);
    socketService.socket?.off('message:delivered', this.handleMessageDelivered);
    socketService.socket?.off('message:read', this.handleMessageRead);
    socketService.socket?.off('typing:start', this.handleTypingStart);
    socketService.socket?.off('typing:stop', this.handleTypingStop);
    socketService.socket?.off('user:online', this.handleUserOnline);
    socketService.socket?.off('user:offline', this.handleUserOffline);
    socketService.socket?.off('conversation:updated', this.handleConversationUpdated);
    socketService.socket?.off('user:verified', this.handleUserVerified);

    this.initialized = false;
    console.log('Messaging socket integration cleaned up');
  }

  /**
   * Join a conversation room for real-time updates
   */
  joinConversation(conversationId: string): void {
    if (this.currentConversationId === conversationId) {
      return;
    }

    // Leave previous conversation if any
    if (this.currentConversationId) {
      this.leaveConversation(this.currentConversationId);
    }

    console.log('Joining conversation:', conversationId);
    socketService.joinConversation(conversationId);
    this.currentConversationId = conversationId;
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    console.log('Leaving conversation:', conversationId);
    socketService.leaveConversation(conversationId);

    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }

  /**
   * Emit typing start event
   */
  emitTypingStart(conversationId: string): void {
    socketService.emitTypingStart(conversationId);
  }

  /**
   * Emit typing stop event
   */
  emitTypingStop(conversationId: string): void {
    socketService.emitTypingStop(conversationId);
  }

  /**
   * Handle new message received event
   */
  private handleMessageReceived = (event: EnhancedMessageReceivedEvent): void => {
    console.log('Message received:', event);

    store.dispatch(
      messageReceived({
        id: event.messageId,
        conversationId: event.conversationId,
        senderId: event.senderId,
        recipientId: '', // Will be populated by reducer
        content: event.content,
        messageType: event.messageType,
        fileUrl: event.fileUrl,
        sentAt: event.timestamp,
        read: false,
        moderationStatus: event.moderationStatus as
          | 'auto_approved'
          | 'pending'
          | 'approved'
          | 'rejected'
          | undefined,
        flaggedForReview: event.flaggedForReview || false,
      })
    );
  };

  /**
   * Handle message delivered event
   */
  private handleMessageDelivered = (event: MessageDeliveredEvent): void => {
    console.log('Message delivered:', event);

    store.dispatch(
      messageDelivered({
        messageId: event.messageId,
        conversationId: event.conversationId,
        deliveredAt: event.deliveredAt,
      })
    );
  };

  /**
   * Handle message read event
   */
  private handleMessageRead = (event: MessageReadEvent): void => {
    console.log('Message read:', event);

    store.dispatch(
      messageRead({
        messageId: event.messageId,
        conversationId: event.matchId, // matchId is conversationId in this context
        readBy: event.readBy,
        readAt: event.readAt,
      })
    );
  };

  /**
   * Handle typing start event
   */
  private handleTypingStart = (event: TypingEvent): void => {
    console.log('Typing start:', event);

    store.dispatch(
      setTypingStatus({
        conversationId: event.matchId, // matchId is conversationId
        userId: event.userId,
        isTyping: true,
      })
    );
  };

  /**
   * Handle typing stop event
   */
  private handleTypingStop = (event: TypingEvent): void => {
    console.log('Typing stop:', event);

    store.dispatch(
      setTypingStatus({
        conversationId: event.matchId, // matchId is conversationId
        userId: event.userId,
        isTyping: false,
      })
    );
  };

  /**
   * Handle user online event
   */
  private handleUserOnline = (event: OnlineStatusEvent): void => {
    console.log('User online:', event);

    store.dispatch(
      setOnlineStatus({
        userId: event.userId,
        isOnline: true,
        lastSeen: event.lastSeen,
      })
    );
  };

  /**
   * Handle user offline event
   */
  private handleUserOffline = (event: OnlineStatusEvent): void => {
    console.log('User offline:', event);

    store.dispatch(
      setOnlineStatus({
        userId: event.userId,
        isOnline: false,
        lastSeen: event.lastSeen || new Date().toISOString(),
      })
    );
  };

  /**
   * Handle conversation updated event
   */
  private handleConversationUpdated = (event: ConversationUpdatedEvent): void => {
    console.log('Conversation updated:', event);

    store.dispatch(
      updateConversation({
        conversationId: event.conversationId,
        updates: event.updates,
      })
    );
  };

  /**
   * Handle user verification status updated
   */
  private handleUserVerified = (event: { userId: string; isVerified: boolean }): void => {
    console.log('User verification updated:', event);

    // Update all conversations with this user to reflect new verification status
    const state = store.getState();
    const conversations = state.enhancedMessages.conversations;

    conversations.forEach((conversation) => {
      if (conversation.participantId === event.userId) {
        store.dispatch(
          updateConversation({
            conversationId: conversation.id,
            updates: {
              participantVerified: event.isVerified,
            },
          })
        );
      }
    });
  };
}

// Export singleton instance
const messagingSocketIntegration = new MessagingSocketIntegration();

/**
 * Initialize messaging socket integration
 * Call this when the app starts or user logs in
 */
export const initializeMessagingSocket = (): void => {
  messagingSocketIntegration.initialize();
};

/**
 * Cleanup messaging socket integration
 * Call this when user logs out
 */
export const cleanupMessagingSocket = (): void => {
  messagingSocketIntegration.cleanup();
};

/**
 * Join a conversation room
 */
export const joinConversation = (conversationId: string): void => {
  messagingSocketIntegration.joinConversation(conversationId);
};

/**
 * Leave a conversation room
 */
export const leaveConversation = (conversationId: string): void => {
  messagingSocketIntegration.leaveConversation(conversationId);
};

/**
 * Emit typing start event
 */
export const emitTypingStart = (conversationId: string): void => {
  messagingSocketIntegration.emitTypingStart(conversationId);
};

/**
 * Emit typing stop event
 */
export const emitTypingStop = (conversationId: string): void => {
  messagingSocketIntegration.emitTypingStop(conversationId);
};

export default messagingSocketIntegration;
