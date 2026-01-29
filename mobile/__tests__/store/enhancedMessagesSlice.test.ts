/**
 * Unit Tests for Enhanced Messages Redux Slice
 * Tests messaging feature state management with async thunks
 */

import { configureStore } from '@reduxjs/toolkit';
import enhancedMessagesReducer, {
  fetchConversations,
  fetchMessages,
  sendMessage,
  checkVerificationStatus,
  reportMessage,
  blockConversation,
  messageReceived,
  markConversationAsRead,
  setActiveConversation,
  setTypingStatus,
  messageDelivered,
  messageRead,
  setOnlineStatus,
  updateConversation,
  userOnlineStatus,
  clearErrors,
  // Verification gating imports
  fetchMessagesGated,
  fetchUnreadCount,
  setUserMessagesLocked,
  clearLockedState,
  selectUserMessagesLocked,
  selectLockedUnreadCount,
  selectLockedConversation,
  selectHasLockedConversations,
  Message,
  Conversation,
  VerificationStatus,
} from '../../src/store/slices/enhancedMessagesSlice';

// Mock the API
jest.mock('../../src/services/api/enhancedMessagesAPI', () => ({
  __esModule: true,
  default: {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    sendVerifiedMessage: jest.fn(),
    checkVerificationStatus: jest.fn(),
    reportMessage: jest.fn(),
    blockConversation: jest.fn(),
    getMessagesGated: jest.fn(),
    getUnreadCount: jest.fn(),
  },
}));

describe('enhancedMessagesSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockConversation: Conversation = {
    id: 'conv-123',
    participantId: 'user-456',
    participantName: 'Jane Doe',
    participantPhoto: 'https://example.com/photo.jpg',
    participantVerified: true,
    lastMessage: 'Hello!',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 2,
    isBlocked: false,
    isMuted: false,
    bothVerified: true,
  };

  const mockMessage: Message = {
    id: 'msg-123',
    conversationId: 'conv-123',
    senderId: 'user-456',
    recipientId: 'user-789',
    content: 'Hello!',
    messageType: 'text',
    read: false,
    sentAt: new Date().toISOString(),
    moderationStatus: 'auto_approved',
    flaggedForReview: false,
  };

  const mockVerificationStatus: VerificationStatus = {
    isVerified: true,
    verificationScore: 85,
    canMessage: true,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        enhancedMessages: enhancedMessagesReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().enhancedMessages;

      expect(state.conversations).toEqual([]);
      expect(state.activeConversationId).toBeNull();
      expect(state.conversationsLoading).toBe(false);
      expect(state.conversationsError).toBeNull();
      expect(state.messagesByConversation).toEqual({});
      expect(state.messagesLoading).toBe(false);
      expect(state.messagesError).toBeNull();
      expect(state.sendingMessage).toBe(false);
      expect(state.sendError).toBeNull();
      expect(state.verificationStatus).toEqual({});
      expect(state.typingUsers).toEqual({});
      expect(state.onlineUsers).toEqual([]);
      expect(state.totalUnreadCount).toBe(0);
    });
  });

  describe('fetchConversations', () => {
    it('should set conversationsLoading to true when pending', () => {
      store.dispatch(fetchConversations.pending('', undefined));

      const state = store.getState().enhancedMessages;
      expect(state.conversationsLoading).toBe(true);
      expect(state.conversationsError).toBeNull();
    });

    it('should update conversations and totalUnreadCount when fulfilled', () => {
      store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));

      const state = store.getState().enhancedMessages;
      expect(state.conversationsLoading).toBe(false);
      expect(state.conversations).toEqual([mockConversation]);
      expect(state.totalUnreadCount).toBe(2);
    });

    it('should set error when rejected', () => {
      store.dispatch(fetchConversations.rejected(null, '', undefined, 'Network error'));

      const state = store.getState().enhancedMessages;
      expect(state.conversationsLoading).toBe(false);
      expect(state.conversationsError).toBe('Network error');
    });
  });

  describe('fetchMessages', () => {
    it('should set messagesLoading to true when pending', () => {
      store.dispatch(fetchMessages.pending('', 'conv-123'));

      const state = store.getState().enhancedMessages;
      expect(state.messagesLoading).toBe(true);
    });

    it('should update messagesByConversation when fulfilled', () => {
      store.dispatch(fetchMessages.fulfilled(
        { conversationId: 'conv-123', messages: [mockMessage] },
        '',
        'conv-123'
      ));

      const state = store.getState().enhancedMessages;
      expect(state.messagesLoading).toBe(false);
      expect(state.messagesByConversation['conv-123']).toEqual([mockMessage]);
    });
  });

  describe('sendMessage', () => {
    const sendParams = {
      conversationId: 'conv-123',
      recipientId: 'user-456',
      content: 'Hi there!',
    };

    it('should set sendingMessage to true when pending', () => {
      store.dispatch(sendMessage.pending('', sendParams));

      const state = store.getState().enhancedMessages;
      expect(state.sendingMessage).toBe(true);
      expect(state.sendError).toBeNull();
    });

    it('should add message to conversation when fulfilled', () => {
      store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));
      const sentMessage = { ...mockMessage, content: 'Hi there!' };
      store.dispatch(sendMessage.fulfilled(sentMessage, '', sendParams));

      const state = store.getState().enhancedMessages;
      expect(state.sendingMessage).toBe(false);
      expect(state.messagesByConversation['conv-123']).toContainEqual(sentMessage);
      expect(state.conversations[0].lastMessage).toBe('Hi there!');
    });

    it('should handle verification required error', () => {
      store.dispatch(sendMessage.rejected(
        null,
        '',
        sendParams,
        { message: 'Verification required', requiresVerification: true }
      ));

      const state = store.getState().enhancedMessages;
      expect(state.sendingMessage).toBe(false);
      expect(state.sendError).toBe('Verification required');
    });
  });

  describe('checkVerificationStatus', () => {
    it('should update verificationStatus when fulfilled', () => {
      store.dispatch(checkVerificationStatus.fulfilled(
        { userId: 'user-456', status: mockVerificationStatus },
        '',
        'user-456'
      ));

      const state = store.getState().enhancedMessages;
      expect(state.verificationStatus['user-456']).toEqual(mockVerificationStatus);
    });
  });

  describe('reportMessage', () => {
    it('should set reportingMessage to true when pending', () => {
      store.dispatch(reportMessage.pending('', { messageId: 'msg-123', reportType: 'harassment' }));

      const state = store.getState().enhancedMessages;
      expect(state.reportingMessage).toBe(true);
    });

    it('should flag message when fulfilled', () => {
      store.dispatch(fetchMessages.fulfilled(
        { conversationId: 'conv-123', messages: [mockMessage] },
        '',
        'conv-123'
      ));
      store.dispatch(reportMessage.fulfilled('msg-123', '', { messageId: 'msg-123', reportType: 'spam' }));

      const state = store.getState().enhancedMessages;
      expect(state.reportingMessage).toBe(false);
      expect(state.messagesByConversation['conv-123'][0].flaggedForReview).toBe(true);
    });
  });

  describe('blockConversation', () => {
    it('should mark conversation as blocked when fulfilled', () => {
      store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));
      store.dispatch(blockConversation.fulfilled('conv-123', '', 'conv-123'));

      const state = store.getState().enhancedMessages;
      expect(state.conversations[0].isBlocked).toBe(true);
    });
  });

  describe('synchronous actions', () => {
    describe('messageReceived', () => {
      it('should add message and update conversation', () => {
        store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));
        const newMessage = { ...mockMessage, id: 'msg-456', content: 'New message!' };
        store.dispatch(messageReceived(newMessage));

        const state = store.getState().enhancedMessages;
        expect(state.messagesByConversation['conv-123']).toContainEqual(newMessage);
        expect(state.conversations[0].lastMessage).toBe('New message!');
        expect(state.conversations[0].unreadCount).toBe(3);
        expect(state.totalUnreadCount).toBe(3);
      });

      it('should create conversation message array if not exists', () => {
        const newMessage = { ...mockMessage, conversationId: 'new-conv' };
        store.dispatch(messageReceived(newMessage));

        const state = store.getState().enhancedMessages;
        expect(state.messagesByConversation['new-conv']).toContainEqual(newMessage);
      });
    });

    describe('markConversationAsRead', () => {
      it('should mark all messages as read and update unread count', () => {
        store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));
        store.dispatch(fetchMessages.fulfilled(
          { conversationId: 'conv-123', messages: [mockMessage] },
          '',
          'conv-123'
        ));
        store.dispatch(markConversationAsRead('conv-123'));

        const state = store.getState().enhancedMessages;
        expect(state.messagesByConversation['conv-123'][0].read).toBe(true);
        expect(state.conversations[0].unreadCount).toBe(0);
      });
    });

    describe('setActiveConversation', () => {
      it('should set active conversation ID', () => {
        store.dispatch(setActiveConversation('conv-123'));

        const state = store.getState().enhancedMessages;
        expect(state.activeConversationId).toBe('conv-123');
      });

      it('should set to null', () => {
        store.dispatch(setActiveConversation('conv-123'));
        store.dispatch(setActiveConversation(null));

        const state = store.getState().enhancedMessages;
        expect(state.activeConversationId).toBeNull();
      });
    });

    describe('setTypingStatus', () => {
      it('should set typing status', () => {
        store.dispatch(setTypingStatus({
          conversationId: 'conv-123',
          userId: 'user-456',
          isTyping: true,
        }));

        const state = store.getState().enhancedMessages;
        expect(state.typingUsers['conv-123:user-456']).toBe(true);
      });

      it('should remove typing status when false', () => {
        store.dispatch(setTypingStatus({
          conversationId: 'conv-123',
          userId: 'user-456',
          isTyping: true,
        }));
        store.dispatch(setTypingStatus({
          conversationId: 'conv-123',
          userId: 'user-456',
          isTyping: false,
        }));

        const state = store.getState().enhancedMessages;
        expect(state.typingUsers['conv-123:user-456']).toBeUndefined();
      });
    });

    describe('messageRead', () => {
      it('should mark specific message as read', () => {
        store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));
        store.dispatch(fetchMessages.fulfilled(
          { conversationId: 'conv-123', messages: [mockMessage] },
          '',
          'conv-123'
        ));
        store.dispatch(messageRead({
          messageId: 'msg-123',
          conversationId: 'conv-123',
          readBy: 'user-789',
          readAt: new Date().toISOString(),
        }));

        const state = store.getState().enhancedMessages;
        expect(state.messagesByConversation['conv-123'][0].read).toBe(true);
        expect(state.messagesByConversation['conv-123'][0].readAt).toBeDefined();
      });
    });

    describe('setOnlineStatus', () => {
      it('should add user to online users', () => {
        store.dispatch(setOnlineStatus({ userId: 'user-456', isOnline: true }));

        const state = store.getState().enhancedMessages;
        expect(state.onlineUsers).toContain('user-456');
      });

      it('should remove user from online users', () => {
        store.dispatch(setOnlineStatus({ userId: 'user-456', isOnline: true }));
        store.dispatch(setOnlineStatus({ userId: 'user-456', isOnline: false }));

        const state = store.getState().enhancedMessages;
        expect(state.onlineUsers).not.toContain('user-456');
      });

      it('should not duplicate online users', () => {
        store.dispatch(setOnlineStatus({ userId: 'user-456', isOnline: true }));
        store.dispatch(setOnlineStatus({ userId: 'user-456', isOnline: true }));

        const state = store.getState().enhancedMessages;
        expect(state.onlineUsers.filter(id => id === 'user-456')).toHaveLength(1);
      });
    });

    describe('userOnlineStatus (legacy)', () => {
      it('should work like setOnlineStatus', () => {
        store.dispatch(userOnlineStatus({ userId: 'user-456', online: true }));

        const state = store.getState().enhancedMessages;
        expect(state.onlineUsers).toContain('user-456');
      });
    });

    describe('updateConversation', () => {
      it('should update conversation settings', () => {
        store.dispatch(fetchConversations.fulfilled([mockConversation], '', undefined));
        store.dispatch(updateConversation({
          conversationId: 'conv-123',
          updates: { isMuted: true },
        }));

        const state = store.getState().enhancedMessages;
        expect(state.conversations[0].isMuted).toBe(true);
      });
    });

    describe('clearErrors', () => {
      it('should clear all errors', () => {
        store.dispatch(fetchConversations.rejected(null, '', undefined, 'Error 1'));
        store.dispatch(fetchMessages.rejected(null, '', 'conv-123', 'Error 2'));
        store.dispatch(clearErrors());

        const state = store.getState().enhancedMessages;
        expect(state.conversationsError).toBeNull();
        expect(state.messagesError).toBeNull();
        expect(state.sendError).toBeNull();
        expect(state.reportError).toBeNull();
      });
    });
  });

  // ===========================================================================
  // VERIFICATION GATING TESTS
  // ===========================================================================

  describe('fetchMessagesGated', () => {
    it('should set messagesLoading to true when pending', () => {
      store.dispatch(fetchMessagesGated.pending('', 'conv-123'));

      const state = store.getState().enhancedMessages;
      expect(state.messagesLoading).toBe(true);
      expect(state.messagesError).toBeNull();
    });

    it('should store locked conversation info when locked=true', () => {
      store.dispatch(fetchMessagesGated.fulfilled(
        {
          conversationId: 'conv-123',
          success: true,
          locked: true,
          unreadCount: 3,
          message: 'Complete verification to view your messages',
        },
        '',
        'conv-123'
      ));

      const state = store.getState().enhancedMessages;
      expect(state.messagesLoading).toBe(false);
      expect(state.lockedConversations['conv-123']).toEqual({
        conversationId: 'conv-123',
        locked: true,
        unreadCount: 3,
        message: 'Complete verification to view your messages',
      });
      expect(state.userMessagesLocked).toBe(true);
    });

    it('should store messages when locked=false', () => {
      const messages = [{ ...mockMessage, id: 'msg-1', content: 'Hello' }];
      store.dispatch(fetchMessagesGated.fulfilled(
        {
          conversationId: 'conv-123',
          success: true,
          locked: false,
          data: messages,
        },
        '',
        'conv-123'
      ));

      const state = store.getState().enhancedMessages;
      expect(state.messagesLoading).toBe(false);
      expect(state.messagesByConversation['conv-123']).toEqual(messages);
      expect(state.lockedConversations['conv-123']).toBeUndefined();
    });

    it('should clear locked state for conversation when verified', () => {
      // First set up locked state
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 2, message: 'Verify' },
        '',
        'conv-123'
      ));

      // Now fetch as verified user
      const messages = [{ ...mockMessage, id: 'msg-1' }];
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: false, data: messages },
        '',
        'conv-123'
      ));

      const state = store.getState().enhancedMessages;
      expect(state.lockedConversations['conv-123']).toBeUndefined();
      expect(state.messagesByConversation['conv-123']).toEqual(messages);
    });

    it('should set error when rejected', () => {
      store.dispatch(fetchMessagesGated.rejected(null, '', 'conv-123', 'Network error'));

      const state = store.getState().enhancedMessages;
      expect(state.messagesLoading).toBe(false);
      expect(state.messagesError).toBe('Network error');
    });
  });

  describe('fetchUnreadCount', () => {
    it('should set locked state when locked=true', () => {
      store.dispatch(fetchUnreadCount.fulfilled(
        { success: true, locked: true, unreadCount: 5, message: 'Verify to view' },
        '',
        undefined
      ));

      const state = store.getState().enhancedMessages;
      expect(state.userMessagesLocked).toBe(true);
      expect(state.lockedUnreadCount).toBe(5);
      expect(state.totalUnreadCount).toBe(5);
    });

    it('should clear locked state when locked=false', () => {
      // First set locked state
      store.dispatch(fetchUnreadCount.fulfilled(
        { success: true, locked: true, unreadCount: 5 },
        '',
        undefined
      ));

      // Then unlock
      store.dispatch(fetchUnreadCount.fulfilled(
        { success: true, locked: false, unreadCount: 3 },
        '',
        undefined
      ));

      const state = store.getState().enhancedMessages;
      expect(state.userMessagesLocked).toBe(false);
      expect(state.lockedUnreadCount).toBe(0);
      expect(state.totalUnreadCount).toBe(3);
    });
  });

  describe('setUserMessagesLocked', () => {
    it('should set userMessagesLocked to true', () => {
      store.dispatch(setUserMessagesLocked(true));

      const state = store.getState().enhancedMessages;
      expect(state.userMessagesLocked).toBe(true);
    });

    it('should set userMessagesLocked to false', () => {
      store.dispatch(setUserMessagesLocked(true));
      store.dispatch(setUserMessagesLocked(false));

      const state = store.getState().enhancedMessages;
      expect(state.userMessagesLocked).toBe(false);
    });
  });

  describe('clearLockedState', () => {
    it('should clear all locked state', () => {
      // Setup locked state
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 3, message: 'Verify' },
        '',
        'conv-123'
      ));
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-456', success: true, locked: true, unreadCount: 2, message: 'Verify' },
        '',
        'conv-456'
      ));

      // Clear it
      store.dispatch(clearLockedState());

      const state = store.getState().enhancedMessages;
      expect(state.userMessagesLocked).toBe(false);
      expect(state.lockedConversations).toEqual({});
      expect(state.lockedUnreadCount).toBe(0);
    });
  });

  describe('verification gating selectors', () => {
    it('selectUserMessagesLocked returns correct value', () => {
      store.dispatch(setUserMessagesLocked(true));
      expect(selectUserMessagesLocked(store.getState())).toBe(true);
    });

    it('selectUserMessagesLocked returns false by default', () => {
      expect(selectUserMessagesLocked(store.getState())).toBe(false);
    });

    it('selectLockedUnreadCount returns correct value', () => {
      store.dispatch(fetchUnreadCount.fulfilled(
        { success: true, locked: true, unreadCount: 7 },
        '',
        undefined
      ));
      expect(selectLockedUnreadCount(store.getState())).toBe(7);
    });

    it('selectLockedConversation returns locked info for conversation', () => {
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 2, message: 'Verify' },
        '',
        'conv-123'
      ));

      const locked = selectLockedConversation(store.getState(), 'conv-123');
      expect(locked?.locked).toBe(true);
      expect(locked?.unreadCount).toBe(2);
    });

    it('selectLockedConversation returns undefined for non-existent conversation', () => {
      const locked = selectLockedConversation(store.getState(), 'non-existent');
      expect(locked).toBeUndefined();
    });

    it('selectHasLockedConversations returns true when locked conversations exist', () => {
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 1, message: 'Verify' },
        '',
        'conv-123'
      ));
      expect(selectHasLockedConversations(store.getState())).toBe(true);
    });

    it('selectHasLockedConversations returns false when no locked conversations', () => {
      expect(selectHasLockedConversations(store.getState())).toBe(false);
    });
  });

  // ===========================================================================
  // SECURITY TESTS - State Management
  // ===========================================================================

  describe('Security - State Management', () => {
    it('should never store message content when locked', () => {
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 3 },
        '',
        'conv-123'
      ));

      const state = store.getState().enhancedMessages;

      // Verify no message content stored for locked conversations
      expect(state.messagesByConversation['conv-123']).toBeUndefined();
      expect(state.lockedConversations['conv-123'].locked).toBe(true);
    });

    it('should clear locked state completely on clearLockedState', () => {
      // Setup locked state with data
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 5, message: 'Verify' },
        '',
        'conv-123'
      ));
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-456', success: true, locked: true, unreadCount: 2, message: 'Verify' },
        '',
        'conv-456'
      ));

      // Clear all locked state
      store.dispatch(clearLockedState());

      const state = store.getState().enhancedMessages;

      // Verify complete cleanup (no residual data)
      expect(Object.keys(state.lockedConversations)).toHaveLength(0);
      expect(state.userMessagesLocked).toBe(false);
      expect(state.lockedUnreadCount).toBe(0);
    });

    it('should not expose locked count for non-existent conversations', () => {
      const locked = selectLockedConversation(store.getState(), 'non-existent');
      expect(locked).toBeUndefined();
    });

    it('should isolate locked state between conversations', () => {
      // Lock conv-123
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 3, message: 'Verify' },
        '',
        'conv-123'
      ));

      // Unlock conv-456 with messages
      const messages = [{ ...mockMessage, conversationId: 'conv-456' }];
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-456', success: true, locked: false, data: messages },
        '',
        'conv-456'
      ));

      const state = store.getState().enhancedMessages;

      // Verify isolation - conv-123 should still be locked
      expect(state.lockedConversations['conv-123']).toBeDefined();
      expect(state.lockedConversations['conv-123'].locked).toBe(true);

      // conv-456 should have messages and not be locked
      expect(state.lockedConversations['conv-456']).toBeUndefined();
      expect(state.messagesByConversation['conv-456']).toEqual(messages);
    });

    it('should handle transition from locked to unlocked correctly', () => {
      // First: user is unverified, conversation locked
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: true, unreadCount: 5, message: 'Verify' },
        '',
        'conv-123'
      ));

      let state = store.getState().enhancedMessages;
      expect(state.lockedConversations['conv-123']).toBeDefined();
      expect(state.messagesByConversation['conv-123']).toBeUndefined();

      // Then: user completes verification, now can see messages
      const messages = [{ ...mockMessage, conversationId: 'conv-123', content: 'Now visible!' }];
      store.dispatch(fetchMessagesGated.fulfilled(
        { conversationId: 'conv-123', success: true, locked: false, data: messages },
        '',
        'conv-123'
      ));

      state = store.getState().enhancedMessages;

      // Locked state should be cleared, messages should be available
      expect(state.lockedConversations['conv-123']).toBeUndefined();
      expect(state.messagesByConversation['conv-123']).toEqual(messages);
      expect(state.messagesByConversation['conv-123'][0].content).toBe('Now visible!');
    });
  });
});
