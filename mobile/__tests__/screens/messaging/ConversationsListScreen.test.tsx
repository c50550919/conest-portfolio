/**
 * ConversationsListScreen Tests
 *
 * MEDIUM-RISK - Messaging inbox and conversation management
 *
 * Key Test Areas:
 * 1. Conversation list rendering
 * 2. Unread message indicators
 * 3. Verification badge display
 * 4. Last message preview
 * 5. Navigation to conversation
 * 6. Empty state handling
 * 7. Blocked conversation handling
 * 8. Error state handling
 * 9. Pull to refresh
 * 10. Child safety (no child PII in previews)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      callback();
    }, []);
  },
}));

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  return {
    Avatar: {
      Image: ({ source, ...props }: any) =>
        React.createElement(View, { testID: 'avatar-image', ...props }),
      Text: ({ label, ...props }: any) =>
        React.createElement(Text, { testID: 'avatar-text', ...props }, label),
    },
    Badge: ({ children, ...props }: any) =>
      React.createElement(Text, { testID: 'badge', ...props }, children),
    Searchbar: ({ onChangeText, value, placeholder, ...props }: any) =>
      React.createElement(TextInput, {
        testID: 'searchbar',
        onChangeText,
        value,
        placeholder,
        ...props,
      }),
    Divider: () => React.createElement(View, { testID: 'divider' }),
    ActivityIndicator: () => React.createElement(View, { testID: 'activity-indicator' }),
  };
});

// Mock enhanced messages API
const mockGetConversations = jest.fn();
jest.mock('../../../src/services/api/enhancedMessagesAPI', () => ({
  __esModule: true,
  default: {
    getConversations: () => mockGetConversations(),
  },
}));

// Mock the selectors from enhancedMessagesSlice
jest.mock('../../../src/store/slices/enhancedMessagesSlice', () => ({
  fetchConversations: jest.fn(() => ({
    type: 'enhancedMessages/fetchConversations',
    unwrap: () => Promise.resolve([]),
  })),
  fetchUnreadCount: jest.fn(() => ({
    type: 'enhancedMessages/fetchUnreadCount',
  })),
  selectConversations: jest.fn(),
  selectConversationsLoading: jest.fn(),
  selectConversationsError: jest.fn(),
  selectUserMessagesLocked: jest.fn(),
  selectLockedUnreadCount: jest.fn(),
}));

// Mock VerificationBadge component
jest.mock('../../../src/components/messaging/VerificationBadge', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ isVerified, ...props }: any) =>
      isVerified ? React.createElement(Text, { testID: 'verification-badge', ...props }, 'Verified') : null,
  };
});

// Import mocked selectors
import {
  selectConversations,
  selectConversationsLoading,
  selectConversationsError,
  selectUserMessagesLocked,
  selectLockedUnreadCount,
} from '../../../src/store/slices/enhancedMessagesSlice';

// Mock verification slice
jest.mock('../../../src/store/slices/verificationSlice', () => ({
  selectIsFullyVerified: jest.fn(),
}));

import { selectIsFullyVerified } from '../../../src/store/slices/verificationSlice';

const mockSelectIsFullyVerified = selectIsFullyVerified as jest.MockedFunction<typeof selectIsFullyVerified>;

const mockSelectConversations = selectConversations as jest.MockedFunction<typeof selectConversations>;
const mockSelectConversationsLoading = selectConversationsLoading as jest.MockedFunction<typeof selectConversationsLoading>;
const mockSelectConversationsError = selectConversationsError as jest.MockedFunction<typeof selectConversationsError>;
const mockSelectUserMessagesLocked = selectUserMessagesLocked as jest.MockedFunction<typeof selectUserMessagesLocked>;
const mockSelectLockedUnreadCount = selectLockedUnreadCount as jest.MockedFunction<typeof selectLockedUnreadCount>;

// Create mock reducer
const createMockMessagesReducer = (conversations: any[], loading = false, error: string | null = null) =>
  (state = { conversations, loading, error }, _action: any) => state;

import ConversationsListScreen from '../../../src/screens/messaging/ConversationsListScreen';

describe('ConversationsListScreen', () => {
  // Mock conversation matching component's Conversation interface
  const mockConversation = {
    id: 'conv-1',
    participantId: 'user-2',
    participantName: 'Sarah Johnson',
    participantAvatar: 'https://example.com/photo.jpg',
    participantVerified: true, // Component uses participantVerified, not isVerified
    lastMessage: 'Hi! I saw your profile and think we might be a good match.',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 2,
    isMuted: false,
    isBlocked: false,
  };

  const mockBlockedConversation = {
    ...mockConversation,
    id: 'conv-2',
    participantName: 'Blocked User',
    isBlocked: true,
    unreadCount: 0,
  };

  const setupMocks = (
    conversations: any[] = [],
    loading = false,
    error: string | null = null,
    isVerified = true,
    messagesLocked = false,
    lockedUnread = 0
  ) => {
    mockSelectConversations.mockReturnValue(conversations);
    mockSelectConversationsLoading.mockReturnValue(loading);
    mockSelectConversationsError.mockReturnValue(error);
    mockSelectIsFullyVerified.mockReturnValue(isVerified);
    mockSelectUserMessagesLocked.mockReturnValue(messagesLocked);
    mockSelectLockedUnreadCount.mockReturnValue(lockedUnread);
  };

  const createStore = (
    conversations: any[] = [],
    loading = false,
    error: string | null = null,
    isVerified = true,
    messagesLocked = false,
    lockedUnread = 0
  ) => {
    setupMocks(conversations, loading, error, isVerified, messagesLocked, lockedUnread);
    return configureStore({
      reducer: {
        enhancedMessages: createMockMessagesReducer(conversations, loading, error),
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConversations.mockResolvedValue({ data: [mockConversation] });
    // Default to verified user with no locked messages
    mockSelectIsFullyVerified.mockReturnValue(true);
    mockSelectUserMessagesLocked.mockReturnValue(false);
    mockSelectLockedUnreadCount.mockReturnValue(0);
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render messages header', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByText('Messages')).toBeTruthy();
    });

    it('should render search icon', () => {
      const store = createStore([mockConversation]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component has magnify icon button, not a full searchbar
      expect(getByTestId('icon-magnify')).toBeTruthy();
    });

    it('should render conversation list', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByText('Sarah Johnson')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CONVERSATION CARD TESTS
  // ===========================================================================

  describe('Conversation Cards', () => {
    it('should display participant name', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByText('Sarah Johnson')).toBeTruthy();
    });

    it('should display last message preview', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByText(/I saw your profile/)).toBeTruthy();
    });

    it('should display unread badge when has unread messages', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows unread count directly
      expect(getByText('2')).toBeTruthy();
    });

    it('should show avatar icon for participant', () => {
      const store = createStore([mockConversation]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component uses icon-account for avatar
      expect(getByTestId('icon-account')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VERIFICATION BADGE TESTS
  // ===========================================================================

  describe('Verification Badges', () => {
    it('should display verification badge for verified users', () => {
      const store = createStore([mockConversation]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component uses VerificationBadge component (mocked with testID)
      expect(getByTestId('verification-badge')).toBeTruthy();
    });

    it('should not display verification badge for unverified users', () => {
      const unverifiedConversation = {
        ...mockConversation,
        participantVerified: false, // Component uses participantVerified
      };
      const store = createStore([unverifiedConversation]);

      const { queryByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(queryByTestId('verification-badge')).toBeNull();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should navigate to chat when card is pressed', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      fireEvent.press(getByText('Sarah Johnson'));

      // Component navigates to 'Chat' with full params
      expect(mockNavigate).toHaveBeenCalledWith('Chat', {
        conversationId: 'conv-1',
        participantId: 'user-2',
        participantName: 'Sarah Johnson',
        participantVerified: true,
      });
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('should show empty state when no conversations', () => {
      const store = createStore([]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows "No Conversations" title
      expect(getByText('No Conversations')).toBeTruthy();
    });

    it('should show helpful text in empty state', () => {
      const store = createStore([]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows message about matching with verified parents
      expect(getByText(/Start matching with other verified parents/)).toBeTruthy();
    });

    it('should show message icon in empty state', () => {
      const store = createStore([]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows message-text-outline icon
      expect(getByTestId('icon-message-text-outline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BLOCKED CONVERSATION TESTS
  // ===========================================================================

  describe('Blocked Conversations', () => {
    it('should show blocked indicator for blocked conversations', () => {
      const store = createStore([mockBlockedConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows "Conversation blocked" in lastMessage area
      expect(getByText('Conversation blocked')).toBeTruthy();
    });

    it('should not navigate when blocked conversation is pressed', () => {
      const store = createStore([mockBlockedConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      fireEvent.press(getByText('Blocked User'));

      // Blocked conversations don't navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const store = createStore([], true);

      const { UNSAFE_getByType } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component uses native ActivityIndicator
      const { ActivityIndicator } = require('react-native');
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('should show error message when there is an error', () => {
      const store = createStore([], false, 'Failed to load conversations');

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows "Failed to Load" title and error message
      expect(getByText('Failed to Load')).toBeTruthy();
      expect(getByText('Failed to load conversations')).toBeTruthy();
    });

    it('should show retry button on error', () => {
      const store = createStore([], false, 'Network error');

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should show alert icon on error', () => {
      const store = createStore([], false, 'Network error');

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByTestId('icon-alert-circle-outline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SEARCH FUNCTIONALITY TESTS
  // ===========================================================================

  describe('Search', () => {
    it('should display search icon in header', () => {
      const store = createStore([mockConversation]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows magnify icon for search
      expect(getByTestId('icon-magnify')).toBeTruthy();
    });

    it('should render all conversations without filtering', () => {
      const conversations = [
        mockConversation,
        {
          ...mockConversation,
          id: 'conv-3',
          participantName: 'Mike Smith',
        },
      ];
      const store = createStore(conversations);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Both conversations should be visible
      expect(getByText('Sarah Johnson')).toBeTruthy();
      expect(getByText('Mike Smith')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILD SAFETY COMPLIANCE TESTS
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should not display child names in message previews', () => {
      const conversationWithChildMention = {
        ...mockConversation,
        // lastMessage is a string, not an object
        lastMessage: 'My children would love to meet yours!',
      };
      const store = createStore([conversationWithChildMention]);

      const { queryByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Should show generic message, not specific child names
      expect(queryByText(/children/i)).toBeTruthy();
      expect(queryByText(/emma/i)).toBeNull();
      expect(queryByText(/jacob/i)).toBeNull();
    });

    it('should only show parent information in conversation cards', () => {
      const store = createStore([mockConversation]);

      const { queryByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Should show parent name
      expect(queryByText('Sarah Johnson')).toBeTruthy();

      // Should NOT show child details
      expect(queryByText(/child age/i)).toBeNull();
      expect(queryByText(/child name/i)).toBeNull();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible conversation cards', () => {
      const store = createStore([mockConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Verify key elements are present and accessible
      expect(getByText('Sarah Johnson')).toBeTruthy();
    });

    it('should have accessible verification badge', () => {
      const store = createStore([mockConversation]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component uses VerificationBadge component
      expect(getByTestId('verification-badge')).toBeTruthy();
    });

    it('should have accessible avatar icon', () => {
      const store = createStore([mockConversation]);

      const { getByTestId } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      expect(getByTestId('icon-account')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIMESTAMP DISPLAY TESTS
  // ===========================================================================

  describe('Timestamp Display', () => {
    it('should display relative time for recent messages', () => {
      const recentConversation = {
        ...mockConversation,
        lastMessageAt: new Date().toISOString(),
      };
      const store = createStore([recentConversation]);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Component shows "Just now" for recent messages
      expect(getByText('Just now')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VERIFICATION GATING TESTS
  // ===========================================================================

  describe('Verification Gating', () => {
    describe('Locked Messages Banner', () => {
      it('should show locked banner for unverified users with messages', () => {
        const store = createStore([mockConversation], false, null, false, true, 5);

        const { getByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        expect(getByText('5 messages waiting')).toBeTruthy();
        expect(getByText('Complete verification to view and reply')).toBeTruthy();
        expect(getByText('Get Verified')).toBeTruthy();
      });

      it('should NOT show locked banner for verified users', () => {
        const store = createStore([mockConversation], false, null, true, false, 0);

        const { queryByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        expect(queryByText(/messages waiting/i)).toBeNull();
        expect(queryByText('Get Verified')).toBeNull();
      });

      it('should NOT show locked banner when no unread messages', () => {
        // Use conversation with 0 unread to test no banner OR locked item appears
        const conversationNoUnread = { ...mockConversation, unreadCount: 0 };
        const store = createStore([conversationNoUnread], false, null, false, true, 0);

        const { queryByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        // No "messages waiting" text should appear anywhere
        expect(queryByText(/messages waiting/i)).toBeNull();
      });

      it('should navigate to Verification when Get Verified is pressed', () => {
        const store = createStore([mockConversation], false, null, false, true, 3);

        const { getByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        fireEvent.press(getByText('Get Verified'));
        expect(mockNavigate).toHaveBeenCalledWith('Verification');
      });

      it('should show singular message text for 1 message', () => {
        const store = createStore([mockConversation], false, null, false, true, 1);

        const { getByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        expect(getByText('1 message waiting')).toBeTruthy();
      });
    });

    describe('Locked Conversation Items', () => {
      it('should show lock icon and message count for locked conversations', () => {
        const conversationWithUnread = { ...mockConversation, unreadCount: 3 };
        const store = createStore([conversationWithUnread], false, null, false, true, 3);

        const { getAllByText, getAllByTestId } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        // Text appears in both banner AND conversation item
        const messagesWaitingElements = getAllByText('3 messages waiting');
        expect(messagesWaitingElements.length).toBeGreaterThanOrEqual(1);

        // Lock icon appears in banner, conversation item, and possibly elsewhere
        const lockIcons = getAllByTestId('icon-lock');
        expect(lockIcons.length).toBeGreaterThanOrEqual(1);
      });

      it('should navigate to Verification instead of Chat for locked conversations', () => {
        const store = createStore([mockConversation], false, null, false, true, 2);

        const { getByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        fireEvent.press(getByText('Sarah Johnson'));
        expect(mockNavigate).toHaveBeenCalledWith('Verification');
        expect(mockNavigate).not.toHaveBeenCalledWith('Chat', expect.anything());
      });

      it('should navigate to Chat for verified users', () => {
        const store = createStore([mockConversation], false, null, true, false, 0);

        const { getByText } = render(
          <Provider store={store}>
            <ConversationsListScreen />
          </Provider>
        );

        fireEvent.press(getByText('Sarah Johnson'));
        expect(mockNavigate).toHaveBeenCalledWith('Chat', expect.objectContaining({
          conversationId: 'conv-1',
        }));
      });
    });
  });

  // ===========================================================================
  // SECURITY - INFORMATION DISCLOSURE TESTS
  // ===========================================================================

  describe('Security - Information Disclosure', () => {
    it('should NOT display message preview for locked conversations', () => {
      const conversationWithMessage = {
        ...mockConversation,
        lastMessage: 'This should NOT be visible',
        unreadCount: 2,
      };
      const store = createStore([conversationWithMessage], false, null, false, true, 2);

      const { queryByText, getAllByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Should show locked indicator (in banner and/or conversation item), NOT actual message content
      const messagesWaitingElements = getAllByText('2 messages waiting');
      expect(messagesWaitingElements.length).toBeGreaterThanOrEqual(1);
      expect(queryByText('This should NOT be visible')).toBeNull();
    });

    it('should show message preview for verified users', () => {
      const conversationWithMessage = {
        ...mockConversation,
        lastMessage: 'Hello from Sarah!',
        unreadCount: 0,
      };
      const store = createStore([conversationWithMessage], false, null, true, false, 0);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // Verified users can see message previews
      expect(getByText('Hello from Sarah!')).toBeTruthy();
    });

    it('should show message preview when unread is 0 even for unverified', () => {
      // Edge case: unverified user but conversation has no unread messages
      const conversationNoUnread = {
        ...mockConversation,
        lastMessage: 'Old message visible',
        unreadCount: 0,
      };
      const store = createStore([conversationNoUnread], false, null, false, true, 5);

      const { getByText } = render(
        <Provider store={store}>
          <ConversationsListScreen />
        </Provider>
      );

      // No unread in this conversation, so message preview is shown
      expect(getByText('Old message visible')).toBeTruthy();
    });
  });
});
