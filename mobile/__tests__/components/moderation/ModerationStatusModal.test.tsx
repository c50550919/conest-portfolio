/**
 * Unit Tests for ModerationStatusModal Component
 * Tests modal display for warnings, suspensions, and bans
 *
 * Constitution: Principle I (Child Safety)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ModerationStatusModal } from '../../../src/components/moderation/ModerationStatusModal';
import moderationReducer, {
  ModerationState,
  ModerationStatus,
} from '../../../src/store/slices/moderationSlice';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ModerationStatusModal', () => {
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

  const renderWithStore = (store: ReturnType<typeof createStore>, onLogout?: () => void) => {
    return render(
      <Provider store={store}>
        <ModerationStatusModal onLogout={onLogout} />
      </Provider>
    );
  };

  describe('visibility', () => {
    it('should not render when showStatusModal is false', () => {
      const store = createStore({ showStatusModal: false });
      const { queryByText } = renderWithStore(store);
      expect(queryByText('Account Warning')).toBeNull();
    });

    it('should not render for good_standing status', () => {
      const store = createStore({ showStatusModal: true, status: 'good_standing' });
      const { queryByText } = renderWithStore(store);
      expect(queryByText('Account Warning')).toBeNull();
    });

    it('should render when showStatusModal is true and status is warned', () => {
      const store = createStore({ showStatusModal: true, status: 'warned' });
      const { getByText } = renderWithStore(store);
      expect(getByText('Account Warning')).toBeTruthy();
    });
  });

  describe('warning status', () => {
    it('should display warning content', () => {
      const store = createStore({ showStatusModal: true, status: 'warned' });
      const { getByText } = renderWithStore(store);

      expect(getByText('Account Warning')).toBeTruthy();
      expect(getByText('I Understand')).toBeTruthy();
    });

    it('should display community guidelines reminder', () => {
      const store = createStore({ showStatusModal: true, status: 'warned' });
      const { getByText } = renderWithStore(store);

      expect(getByText(/CoNest is committed to providing a safe environment/)).toBeTruthy();
    });
  });

  describe('suspension status', () => {
    it('should display suspension content', () => {
      const store = createStore({ showStatusModal: true, status: 'suspended' });
      const { getByText } = renderWithStore(store);

      expect(getByText('Account Suspended')).toBeTruthy();
    });

    it('should display suspension end time when provided', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const store = createStore({
        showStatusModal: true,
        status: 'suspended',
        suspensionUntil: futureDate,
      });
      const { getByText } = renderWithStore(store);

      expect(getByText(/Access will be restored on:/)).toBeTruthy();
    });

    it('should display suspension reason when provided', () => {
      const store = createStore({
        showStatusModal: true,
        status: 'suspended',
        suspensionReason: 'Policy violation detected',
      });
      const { getByText } = renderWithStore(store);

      expect(getByText('Reason for this action:')).toBeTruthy();
      expect(getByText('Policy violation detected')).toBeTruthy();
    });
  });

  describe('banned status', () => {
    it('should display ban content', () => {
      const store = createStore({ showStatusModal: true, status: 'banned' });
      const { getByText } = renderWithStore(store);

      expect(getByText('Account Deactivated')).toBeTruthy();
      expect(getByText('Sign Out')).toBeTruthy();
    });

    it('should not display guidelines reminder for banned users', () => {
      const store = createStore({ showStatusModal: true, status: 'banned' });
      const { queryByText } = renderWithStore(store);

      expect(queryByText(/CoNest is committed to providing a safe environment/)).toBeNull();
    });
  });

  describe('interactions', () => {
    it('should dismiss modal on button press for warning', () => {
      const store = createStore({ showStatusModal: true, status: 'warned' });
      const { getByText } = renderWithStore(store);

      fireEvent.press(getByText('I Understand'));

      // Modal should be dismissed (showStatusModal should be false)
      expect(store.getState().moderation.showStatusModal).toBe(false);
    });

    it('should call onLogout for banned users', () => {
      const onLogout = jest.fn();
      const store = createStore({ showStatusModal: true, status: 'banned' });
      const { getByText } = renderWithStore(store, onLogout);

      fireEvent.press(getByText('Sign Out'));

      expect(onLogout).toHaveBeenCalled();
    });

    it('should not call onLogout for warned users', () => {
      const onLogout = jest.fn();
      const store = createStore({ showStatusModal: true, status: 'warned' });
      const { getByText } = renderWithStore(store, onLogout);

      fireEvent.press(getByText('I Understand'));

      expect(onLogout).not.toHaveBeenCalled();
    });
  });
});
