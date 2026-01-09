/**
 * Unit Tests for MessageBlockedToast Component
 * Tests animated toast notification for blocked messages
 *
 * Constitution: Principle I (Child Safety)
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MessageBlockedToast } from '../../../src/components/moderation/MessageBlockedToast';
import moderationReducer, {
  ModerationState,
  setMessageBlocked,
  clearMessageBlocked,
} from '../../../src/store/slices/moderationSlice';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock Animated to avoid timing issues in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock Linking - use specific module path to avoid TurboModule errors
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
}));

import Linking from 'react-native/Libraries/Linking/Linking';

describe('MessageBlockedToast', () => {
  const createStore = (moderationState: Partial<ModerationState> = {}) => {
    const defaultState: ModerationState = {
      status: 'good_standing',
      strikeCount: 0,
      suspensionUntil: null,
      suspensionReason: null,
      notifications: [],
      lastMessageBlocked: false,
      lastBlockedReason: null,
      loading: false,
      error: null,
      showStatusModal: false,
    };

    return configureStore({
      reducer: {
        moderation: moderationReducer,
      },
      preloadedState: {
        moderation: { ...defaultState, ...moderationState },
      },
    });
  };

  const renderWithStore = (store: ReturnType<typeof createStore>) => {
    return render(
      <Provider store={store}>
        <MessageBlockedToast />
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('visibility', () => {
    it('should not render when no message is blocked', () => {
      const store = createStore({ lastMessageBlocked: false });
      const { queryByText } = renderWithStore(store);
      expect(queryByText('Message Not Sent')).toBeNull();
    });

    it('should render when message is blocked', () => {
      const store = createStore({ lastMessageBlocked: true });
      const { getByText } = renderWithStore(store);
      expect(getByText('Message Not Sent')).toBeTruthy();
    });
  });

  describe('content', () => {
    it('should display guidance message when blocked', () => {
      const store = createStore({
        lastMessageBlocked: true,
        lastBlockedReason: null,
      });
      const { getByText } = renderWithStore(store);

      // Component shows generic guidance, not specific reason (privacy-preserving design)
      expect(getByText(/may not align with our community guidelines/)).toBeTruthy();
    });

    it('should display same guidance message regardless of reason', () => {
      const store = createStore({
        lastMessageBlocked: true,
        lastBlockedReason: 'Content violates community guidelines',
      });
      const { getByText } = renderWithStore(store);

      // Component intentionally doesn't expose detection details to users
      expect(getByText(/may not align with our community guidelines/)).toBeTruthy();
    });

    it('should display View Community Guidelines link', () => {
      const store = createStore({ lastMessageBlocked: true });
      const { getByText } = renderWithStore(store);

      expect(getByText('View Community Guidelines')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should render close icon for dismissing toast', () => {
      const store = createStore({ lastMessageBlocked: true });
      const { UNSAFE_getAllByType } = renderWithStore(store);

      // Verify the component renders (close icon is rendered via Icon component)
      const icons = UNSAFE_getAllByType('Icon' as any);
      // Should have at least 3 icons: message-alert, close, and chevron-right
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });

    it('should auto-hide after 5 seconds', async () => {
      const store = createStore({ lastMessageBlocked: true });
      renderWithStore(store);

      // Fast-forward 5 seconds plus animation duration
      act(() => {
        jest.advanceTimersByTime(5300);
      });

      // The state should be cleared after auto-hide completes
      await waitFor(() => {
        expect(store.getState().moderation.lastMessageBlocked).toBe(false);
      });
    });
  });

  describe('community guidelines link', () => {
    it('should render community guidelines link as touchable', () => {
      const store = createStore({ lastMessageBlocked: true });
      const { getByText } = renderWithStore(store);

      // Verify the link is present and touchable
      const link = getByText('View Community Guidelines');
      expect(link).toBeTruthy();

      // Verify the link can be pressed (no error thrown)
      fireEvent.press(link);
    });
  });

  describe('state management', () => {
    it('should show toast when setMessageBlocked is dispatched', () => {
      const store = createStore();
      const { queryByText, rerender } = renderWithStore(store);

      expect(queryByText('Message Not Sent')).toBeNull();

      // Dispatch action to block message
      store.dispatch(setMessageBlocked({ reason: 'Test reason' }));

      // Re-render to pick up state change
      rerender(
        <Provider store={store}>
          <MessageBlockedToast />
        </Provider>
      );

      expect(queryByText('Message Not Sent')).toBeTruthy();
    });

    it('should hide toast when clearMessageBlocked is dispatched', () => {
      const store = createStore({ lastMessageBlocked: true });
      const { queryByText, rerender } = renderWithStore(store);

      expect(queryByText('Message Not Sent')).toBeTruthy();

      // Dispatch action to clear
      store.dispatch(clearMessageBlocked());

      // Re-render to pick up state change
      rerender(
        <Provider store={store}>
          <MessageBlockedToast />
        </Provider>
      );

      expect(queryByText('Message Not Sent')).toBeNull();
    });
  });
});
