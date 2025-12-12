/**
 * HomeScreen Tests
 *
 * MEDIUM-RISK - Dashboard and navigation hub
 *
 * Key Test Areas:
 * 1. Loading state when no user data
 * 2. User greeting and name display
 * 3. Quick stats display (connections, messages, compatibility)
 * 4. Navigation to other screens
 * 5. Household status section
 * 6. Quick actions grid
 * 7. Recent activity section
 * 8. Safety tips display
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock navigation - note: base mocks are in jest-setup.ts
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (callback: () => void) => {
      // Use useEffect to defer callback execution to avoid infinite render loop
      React.useEffect(() => {
        callback();
      }, []);
    },
  };
});

// Note: react-native-vector-icons and react-native-linear-gradient are mocked in jest-setup.ts

// Mock APIs
const mockGetStatistics = jest.fn();
const mockGetConversations = jest.fn();

jest.mock('../../../src/services/api/connectionRequestsAPI', () => ({
  __esModule: true,
  default: {
    getStatistics: () => mockGetStatistics(),
  },
}));

jest.mock('../../../src/services/api/enhancedMessagesAPI', () => ({
  __esModule: true,
  default: {
    getConversations: () => mockGetConversations(),
  },
}));

// Mock store reducer
const createMockAuthReducer = (user: any) => (state = { user }, _action: any) => state;

import HomeScreen from '../../../src/screens/main/HomeScreen';

describe('HomeScreen', () => {
  const createStore = (user: any = null) => {
    return configureStore({
      reducer: {
        auth: createMockAuthReducer(user),
      },
    });
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatistics.mockResolvedValue({
      received: { pending: 3 },
      sent: { pending: 1 },
    });
    mockGetConversations.mockResolvedValue({
      data: [
        { id: '1', unreadCount: 2 },
        { id: '2', unreadCount: 1 },
      ],
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator when no user data', () => {
      const store = createStore(null);

      const { getByText, queryByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Loading your dashboard...')).toBeTruthy();
      expect(queryByTestId('home-screen')).toBeNull();
    });
  });

  // ===========================================================================
  // USER GREETING TESTS
  // ===========================================================================

  describe('User Greeting', () => {
    it('should display welcome message', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('welcome-message')).toBeTruthy();
    });

    it('should display user full name', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('user-name').props.children).toBe('John Doe');
    });

    it('should display email when name not available', () => {
      const store = createStore({ email: 'test@example.com' });

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('user-name').props.children).toBe('test@example.com');
    });

    it('should display "User" as fallback', () => {
      const store = createStore({});

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('user-name').props.children).toBe('User');
    });
  });

  // ===========================================================================
  // QUICK STATS TESTS
  // ===========================================================================

  describe('Quick Stats', () => {
    it('should render pending connections stat card', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('stat-new-connections')).toBeTruthy();
    });

    it('should render messages stat card', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('stat-messages')).toBeTruthy();
    });

    it('should render discover stat card', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('stat-compatibility')).toBeTruthy();
    });

    it('should display pending connections count after loading', async () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      await waitFor(() => {
        expect(getByText('3')).toBeTruthy();
      });
    });

    it('should display unread messages count after loading', async () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      await waitFor(() => {
        // 2 + 1 = 3 unread messages from mock
        expect(getByText('3')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should navigate to ConnectionRequests when stat card pressed', async () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('stat-new-connections'));

      expect(mockNavigate).toHaveBeenCalledWith('ConnectionRequests');
    });

    it('should navigate to Messages when messages stat pressed', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('stat-messages'));

      expect(mockNavigate).toHaveBeenCalledWith('Messages');
    });

    it('should navigate to Discover when discover stat pressed', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('stat-compatibility'));

      expect(mockNavigate).toHaveBeenCalledWith('Discover');
    });

    it('should navigate to Household when schedule button pressed', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('household-schedule-button'));

      expect(mockNavigate).toHaveBeenCalledWith('Household');
    });

    it('should navigate to Household when expenses button pressed', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('household-expenses-button'));

      expect(mockNavigate).toHaveBeenCalledWith('Household');
    });
  });

  // ===========================================================================
  // HOUSEHOLD STATUS TESTS
  // ===========================================================================

  describe('Household Status', () => {
    it('should display household section title', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Household Status')).toBeTruthy();
    });

    it('should display household name', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Mountain View House')).toBeTruthy();
    });

    it('should display verified badge', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Verified')).toBeTruthy();
    });
  });

  // ===========================================================================
  // QUICK ACTIONS TESTS
  // ===========================================================================

  describe('Quick Actions', () => {
    it('should display quick actions section', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Quick Actions')).toBeTruthy();
    });

    it('should display Find Roommates action', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Find Roommates')).toBeTruthy();
    });

    it('should display Messages action', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Messages')).toBeTruthy();
    });

    it('should display Manage Home action', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Manage Home')).toBeTruthy();
    });

    it('should display Documents action', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Documents')).toBeTruthy();
    });
  });

  // ===========================================================================
  // RECENT ACTIVITY TESTS
  // ===========================================================================

  describe('Recent Activity', () => {
    it('should display recent activity section', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Recent Activity')).toBeTruthy();
    });

    it('should display See All link', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('See All')).toBeTruthy();
    });

    it('should display activity items', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('New Connection!')).toBeTruthy();
      expect(getByText('Rent Payment Received')).toBeTruthy();
      expect(getByText('Background Check Complete')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SAFETY TIPS TESTS
  // ===========================================================================

  describe('Safety Tips', () => {
    it('should display safety tips section', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByText('Safety First')).toBeTruthy();
    });

    it('should display safety advice', () => {
      const store = createStore(mockUser);

      const { getByText } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(
        getByText(/meet potential roommates in public places/)
      ).toBeTruthy();
    });

    it('should show shield icon', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('icon-shield-check')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle API errors gracefully for connection stats', async () => {
      mockGetStatistics.mockRejectedValue(new Error('Network error'));
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      // Screen should still render
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });

    it('should handle API errors gracefully for messages', async () => {
      mockGetConversations.mockRejectedValue(new Error('Network error'));
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      // Screen should still render
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should render home screen with testID', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('home-screen')).toBeTruthy();
    });

    it('should have accessible stat cards', () => {
      const store = createStore(mockUser);

      const { getByTestId } = render(
        <Provider store={store}>
          <HomeScreen />
        </Provider>
      );

      expect(getByTestId('stat-new-connections')).toBeTruthy();
      expect(getByTestId('stat-messages')).toBeTruthy();
      expect(getByTestId('stat-compatibility')).toBeTruthy();
    });
  });
});
