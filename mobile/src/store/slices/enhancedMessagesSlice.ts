/**
 * Enhanced Messages Redux Slice
 *
 * Features:
 * - Verification-enforced messaging
 * - Message encryption/decryption
 * - Real-time Socket.io integration
 * - Message reporting
 * - Conversation management
 * - Unread counts and notifications
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import enhancedMessagesAPI from '../../services/api/enhancedMessagesAPI';

// ============ Types ============

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string; // Decrypted content
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string;
  read: boolean;
  readAt?: string;
  sentAt: string;
  moderationStatus?: 'auto_approved' | 'pending' | 'approved' | 'rejected';
  flaggedForReview?: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string;
  participantVerified: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isBlocked: boolean;
  isMuted: boolean;
  bothVerified: boolean;
}

export interface VerificationStatus {
  isVerified: boolean;
  verificationScore: number;
  canMessage: boolean;
}

interface MessagesState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  conversationsLoading: boolean;
  conversationsError: string | null;

  // Messages
  messagesByConversation: Record<string, Message[]>;
  messagesLoading: boolean;
  messagesError: string | null;

  // Sending
  sendingMessage: boolean;
  sendError: string | null;

  // Verification
  verificationStatus: Record<string, VerificationStatus>;
  verificationLoading: boolean;

  // Reporting
  reportingMessage: boolean;
  reportError: string | null;

  // Real-time
  typingUsers: Record<string, boolean>; // conversationId -> isTyping
  onlineUsers: string[]; // Array of user IDs who are online

  // Global state
  totalUnreadCount: number;
}

const initialState: MessagesState = {
  conversations: [],
  activeConversationId: null,
  conversationsLoading: false,
  conversationsError: null,

  messagesByConversation: {},
  messagesLoading: false,
  messagesError: null,

  sendingMessage: false,
  sendError: null,

  verificationStatus: {},
  verificationLoading: false,

  reportingMessage: false,
  reportError: null,

  typingUsers: {},
  onlineUsers: [],

  totalUnreadCount: 0,
};

// ============ Async Thunks ============

/**
 * Fetch all conversations for the current user
 */
export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await enhancedMessagesAPI.getConversations();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

/**
 * Fetch messages for a specific conversation
 */
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      const response = await enhancedMessagesAPI.getMessages(conversationId);
      return {
        conversationId,
        messages: response.data,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

/**
 * Send a verified message
 */
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (
    params: {
      conversationId: string;
      recipientId: string;
      content: string;
      messageType?: 'text' | 'image' | 'file';
      fileUrl?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await enhancedMessagesAPI.sendVerifiedMessage(params);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.requiresVerification) {
        return rejectWithValue({
          message: error.response.data.message,
          requiresVerification: true,
        });
      }
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

/**
 * Check verification status for a user
 */
export const checkVerificationStatus = createAsyncThunk(
  'messages/checkVerificationStatus',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await enhancedMessagesAPI.checkVerificationStatus(userId);
      return {
        userId,
        status: response.data,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check verification');
    }
  }
);

/**
 * Report a message
 */
export const reportMessage = createAsyncThunk(
  'messages/reportMessage',
  async (
    params: {
      messageId: string;
      reportType:
        | 'inappropriate_content'
        | 'harassment'
        | 'spam'
        | 'scam'
        | 'child_safety_concern'
        | 'other';
      description?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await enhancedMessagesAPI.reportMessage(params);
      return params.messageId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to report message');
    }
  }
);

/**
 * Block a conversation
 */
export const blockConversation = createAsyncThunk(
  'messages/blockConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await enhancedMessagesAPI.blockConversation(conversationId);
      return conversationId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to block conversation');
    }
  }
);

// ============ Slice ============

const enhancedMessagesSlice = createSlice({
  name: 'enhancedMessages',
  initialState,
  reducers: {
    // Real-time message received via Socket.io
    messageReceived: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      const { conversationId } = message;

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      state.messagesByConversation[conversationId].push(message);

      // Update conversation last message
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.lastMessage = message.content.substring(0, 100);
        conversation.lastMessageAt = message.sentAt;
        if (!message.read) {
          conversation.unreadCount += 1;
          state.totalUnreadCount += 1;
        }
      }
    },

    // Mark messages as read
    markConversationAsRead: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const messages = state.messagesByConversation[conversationId];

      if (messages) {
        let unreadCount = 0;
        messages.forEach((msg) => {
          if (!msg.read) {
            msg.read = true;
            unreadCount += 1;
          }
        });

        state.totalUnreadCount = Math.max(0, state.totalUnreadCount - unreadCount);
      }

      // Update conversation
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        const previousUnread = conversation.unreadCount;
        conversation.unreadCount = 0;
        state.totalUnreadCount = Math.max(0, state.totalUnreadCount - previousUnread);
      }
    },

    // Set active conversation
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },

    // Typing indicators
    setTypingStatus: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }>,
    ) => {
      const { conversationId, userId, isTyping } = action.payload;
      // Store typing status by userId for more granular control
      const key = `${conversationId}:${userId}`;
      if (isTyping) {
        state.typingUsers[key] = true;
      } else {
        delete state.typingUsers[key];
      }
    },

    // Message delivered status
    messageDelivered: (
      state,
      action: PayloadAction<{
        messageId: string;
        conversationId: string;
        deliveredAt: string;
      }>,
    ) => {
      const { messageId, conversationId } = action.payload;
      const messages = state.messagesByConversation[conversationId];
      if (messages) {
        const message = messages.find((m) => m.id === messageId);
        if (message) {
          // Note: Message interface may need a 'delivered' field
          // For now, just log the delivery
          console.log('Message delivered:', messageId);
        }
      }
    },

    // Message read status
    messageRead: (
      state,
      action: PayloadAction<{
        messageId: string;
        conversationId: string;
        readBy: string;
        readAt: string;
      }>,
    ) => {
      const { messageId, conversationId, readAt } = action.payload;
      const messages = state.messagesByConversation[conversationId];
      if (messages) {
        const message = messages.find((m) => m.id === messageId);
        if (message && !message.read) {
          message.read = true;
          message.readAt = readAt;

          // Update conversation unread count
          const conversation = state.conversations.find((c) => c.id === conversationId);
          if (conversation && conversation.unreadCount > 0) {
            conversation.unreadCount -= 1;
            state.totalUnreadCount = Math.max(0, state.totalUnreadCount - 1);
          }
        }
      }
    },

    // Set online status
    setOnlineStatus: (
      state,
      action: PayloadAction<{
        userId: string;
        isOnline: boolean;
        lastSeen?: string;
      }>,
    ) => {
      const { userId, isOnline } = action.payload;
      if (isOnline) {
        if (!state.onlineUsers.includes(userId)) {
          state.onlineUsers.push(userId);
        }
      } else {
        state.onlineUsers = state.onlineUsers.filter((id) => id !== userId);
      }
    },

    // Update conversation settings
    updateConversation: (
      state,
      action: PayloadAction<{
        conversationId: string;
        updates: {
          isMuted?: boolean;
          isBlocked?: boolean;
          participantVerified?: boolean;
        };
      }>,
    ) => {
      const { conversationId, updates } = action.payload;
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        Object.assign(conversation, updates);
      }
    },

    // Online status (legacy - keeping for compatibility)
    userOnlineStatus: (state, action: PayloadAction<{ userId: string; online: boolean }>) => {
      const { userId, online } = action.payload;
      if (online) {
        if (!state.onlineUsers.includes(userId)) {
          state.onlineUsers.push(userId);
        }
      } else {
        state.onlineUsers = state.onlineUsers.filter((id) => id !== userId);
      }
    },

    // Clear errors
    clearErrors: (state) => {
      state.conversationsError = null;
      state.messagesError = null;
      state.sendError = null;
      state.reportError = null;
    },
  },

  extraReducers: (builder) => {
    // Fetch conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.conversationsLoading = true;
        state.conversationsError = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversationsLoading = false;
        state.conversations = action.payload;
        state.totalUnreadCount = action.payload.reduce((sum, conv) => sum + conv.unreadCount, 0);
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.conversationsLoading = false;
        state.conversationsError = action.payload as string;
      });

    // Fetch messages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.messagesLoading = true;
        state.messagesError = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        const { conversationId, messages } = action.payload;
        state.messagesByConversation[conversationId] = messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = action.payload as string;
      });

    // Send message
    builder
      .addCase(sendMessage.pending, (state) => {
        state.sendingMessage = true;
        state.sendError = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sendingMessage = false;
        const message = action.payload;
        const { conversationId } = message;

        if (!state.messagesByConversation[conversationId]) {
          state.messagesByConversation[conversationId] = [];
        }

        state.messagesByConversation[conversationId].push(message);

        // Update conversation
        const conversation = state.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.lastMessage = message.content.substring(0, 100);
          conversation.lastMessageAt = message.sentAt;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sendingMessage = false;
        state.sendError = (action.payload as any)?.message || 'Failed to send message';
      });

    // Check verification
    builder
      .addCase(checkVerificationStatus.pending, (state) => {
        state.verificationLoading = true;
      })
      .addCase(checkVerificationStatus.fulfilled, (state, action) => {
        state.verificationLoading = false;
        const { userId, status } = action.payload;
        state.verificationStatus[userId] = status;
      })
      .addCase(checkVerificationStatus.rejected, (state) => {
        state.verificationLoading = false;
      });

    // Report message
    builder
      .addCase(reportMessage.pending, (state) => {
        state.reportingMessage = true;
        state.reportError = null;
      })
      .addCase(reportMessage.fulfilled, (state, action) => {
        state.reportingMessage = false;
        const messageId = action.payload;

        // Mark message as flagged in state
        Object.values(state.messagesByConversation).forEach((messages) => {
          const message = messages.find((m) => m.id === messageId);
          if (message) {
            message.flaggedForReview = true;
          }
        });
      })
      .addCase(reportMessage.rejected, (state, action) => {
        state.reportingMessage = false;
        state.reportError = action.payload as string;
      });

    // Block conversation
    builder.addCase(blockConversation.fulfilled, (state, action) => {
      const conversationId = action.payload;
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.isBlocked = true;
      }
    });
  },
});

// ============ Selectors ============

export const selectConversations = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.conversations ?? [];

export const selectConversationsLoading = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.conversationsLoading ?? false;

export const selectConversationsError = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.conversationsError ?? null;

export const selectMessagesByConversation = (
  state: { enhancedMessages?: MessagesState },
  conversationId: string
) => state.enhancedMessages?.messagesByConversation[conversationId] ?? [];

export const selectMessagesLoading = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.messagesLoading ?? false;

export const selectMessagesError = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.messagesError ?? null;

export const selectMessagesSending = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.sendingMessage ?? false;

export const selectTypingUsers = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.typingUsers ?? {};

export const selectOnlineUsers = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.onlineUsers ?? new Set<string>();

export const selectTotalUnreadCount = (state: { enhancedMessages?: MessagesState }) =>
  state.enhancedMessages?.totalUnreadCount ?? 0;

export const selectVerificationStatus = (
  state: { enhancedMessages?: MessagesState },
  userId: string
) => state.enhancedMessages?.verificationStatus[userId];

// ============ Actions ============

export const {
  messageReceived,
  messageDelivered,
  messageRead,
  markConversationAsRead,
  setActiveConversation,
  setTypingStatus,
  setOnlineStatus,
  updateConversation,
  userOnlineStatus,
  clearErrors,
} = enhancedMessagesSlice.actions;

export default enhancedMessagesSlice.reducer;
