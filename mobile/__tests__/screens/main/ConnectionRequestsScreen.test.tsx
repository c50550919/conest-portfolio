/**
 * ConnectionRequestsScreen Tests
 *
 * MEDIUM-RISK - Connection request management
 *
 * Key Test Areas:
 * 1. Tab navigation (Received/Sent)
 * 2. Request list rendering
 * 3. Accept/Decline functionality
 * 4. Cancel request functionality
 * 5. Rate limit status display
 * 6. Statistics display
 * 7. Message viewing modals
 * 8. Empty states
 * 9. Loading states
 * 10. Error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

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

// Create mock slice for connection requests
const initialState = {
  receivedRequests: [],
  sentRequests: [],
  rateLimitStatus: null,
  statistics: null,
  loading: false,
  error: null,
  accepting: false,
  declining: false,
  cancelling: false,
};

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

// Mock slice actions
jest.mock('../../../src/store/slices/connectionRequestsSlice', () => ({
  fetchReceivedRequests: jest.fn(() => ({ type: 'connectionRequests/fetchReceived' })),
  fetchSentRequests: jest.fn(() => ({ type: 'connectionRequests/fetchSent' })),
  acceptConnectionRequest: jest.fn((data) => ({
    type: 'connectionRequests/accept',
    payload: data,
  })),
  declineConnectionRequest: jest.fn((data) => ({
    type: 'connectionRequests/decline',
    payload: data,
  })),
  cancelConnectionRequest: jest.fn((id) => ({
    type: 'connectionRequests/cancel',
    payload: id,
  })),
  fetchRateLimitStatus: jest.fn(() => ({ type: 'connectionRequests/fetchRateLimit' })),
  fetchStatistics: jest.fn(() => ({ type: 'connectionRequests/fetchStats' })),
  getMessage: jest.fn((id) => ({
    type: 'connectionRequests/getMessage',
    payload: { message: 'Hello!' },
  })),
  getResponseMessage: jest.fn((id) => ({
    type: 'connectionRequests/getResponseMessage',
    payload: { responseMessage: 'Thanks!' },
  })),
  clearError: jest.fn(() => ({ type: 'connectionRequests/clearError' })),
}));

import { ConnectionRequestsScreen } from '../../../src/screens/main/ConnectionRequestsScreen';

describe('ConnectionRequestsScreen', () => {
  let alertSpy: jest.SpyInstance;

  const mockReceivedRequest = {
    id: 'req-1',
    sender_id: 'user-1',
    recipient_id: 'user-2',
    status: 'pending' as const,
    sent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    senderProfile: {
      firstName: 'Sarah',
      age: 32,
      city: 'San Francisco',
      compatibilityScore: 92,
      childrenCount: 2,
    },
  };

  const mockSentRequest = {
    id: 'req-2',
    sender_id: 'user-2',
    recipient_id: 'user-3',
    status: 'pending' as const,
    sent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    recipientProfile: {
      firstName: 'Mike',
      age: 35,
      city: 'Oakland',
      compatibilityScore: 88,
      childrenCount: 1,
    },
  };

  const createMockStore = (overrides = {}) => {
    const mockState = {
      connectionRequests: {
        ...initialState,
        receivedRequests: [mockReceivedRequest],
        sentRequests: [mockSentRequest],
        rateLimitStatus: { daily: 3, weekly: 10 },
        statistics: {
          received: { pending: 1, accepted: 5, declined: 2, expired: 0 },
          sent: { pending: 2, accepted: 3, declined: 1, expired: 1 },
        },
        ...overrides,
      },
    };

    // Re-mock useSelector to use our state
    jest.spyOn(require('react-redux'), 'useSelector').mockImplementation((selector: any) =>
      selector(mockState)
    );

    return mockState;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
    mockDispatch.mockReturnValue(Promise.resolve({ payload: {} }));
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render header title', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Connection Requests')).toBeTruthy();
    });

    it('should render rate limit badge', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('3/5 today • 10/15 week')).toBeTruthy();
    });

    it('should render tabs', () => {
      createMockStore();

      const { getAllByText } = render(<ConnectionRequestsScreen />);

      // Multiple elements contain "Received" and "Sent" text
      expect(getAllByText(/Received/).length).toBeGreaterThan(0);
      expect(getAllByText(/Sent/).length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // TAB NAVIGATION TESTS
  // ===========================================================================

  describe('Tab Navigation', () => {
    it('should show received requests by default', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      // Should show received request sender name
      expect(getByText('Sarah, 32')).toBeTruthy();
    });

    it('should switch to sent tab when pressed', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      // Press sent tab
      fireEvent.press(getByText(/Sent/));

      // Should show sent request recipient name
      expect(getByText('Mike, 35')).toBeTruthy();
    });

    it('should show request counts in tabs', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Received (1)')).toBeTruthy();
      expect(getByText('Sent (1)')).toBeTruthy();
    });
  });

  // ===========================================================================
  // STATISTICS DISPLAY TESTS
  // ===========================================================================

  describe('Statistics Display', () => {
    it('should display pending count', () => {
      createMockStore();

      const { getAllByText } = render(<ConnectionRequestsScreen />);

      // Multiple "Pending" labels appear on screen (stats + badges)
      expect(getAllByText('Pending').length).toBeGreaterThan(0);
    });

    it('should display accepted count', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Accepted')).toBeTruthy();
    });

    it('should display declined count', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Declined')).toBeTruthy();
    });
  });

  // ===========================================================================
  // REQUEST CARD TESTS
  // ===========================================================================

  describe('Request Cards', () => {
    it('should display sender info in received requests', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Sarah, 32')).toBeTruthy();
      expect(getByText('San Francisco')).toBeTruthy();
    });

    it('should display compatibility score', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('92% Match')).toBeTruthy();
    });

    it('should display children count', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('2 children')).toBeTruthy();
    });

    it('should display pending status badge', () => {
      createMockStore();

      const { getAllByText } = render(<ConnectionRequestsScreen />);

      // Multiple "Pending" elements appear on screen
      expect(getAllByText('Pending').length).toBeGreaterThan(0);
    });

    it('should show accept and decline buttons for pending requests', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Accept')).toBeTruthy();
      expect(getByText('Decline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCEPT/DECLINE TESTS
  // ===========================================================================

  describe('Accept/Decline Functionality', () => {
    it('should open response modal when accept pressed', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      fireEvent.press(getByText('Accept'));

      expect(getByText('Accept Request')).toBeTruthy();
    });

    it('should open response modal when decline pressed', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      fireEvent.press(getByText('Decline'));

      expect(getByText('Decline Request')).toBeTruthy();
    });

    it('should show optional message input in modal', () => {
      createMockStore();

      const { getByText, getByPlaceholderText } = render(<ConnectionRequestsScreen />);

      fireEvent.press(getByText('Accept'));

      expect(getByPlaceholderText("Thanks! I'd love to connect...")).toBeTruthy();
    });

    it('should show character count', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      fireEvent.press(getByText('Accept'));

      expect(getByText('0/500')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CANCEL REQUEST TESTS
  // ===========================================================================

  describe('Cancel Request', () => {
    it('should show cancel button for sent pending requests', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      // Switch to sent tab
      fireEvent.press(getByText(/Sent/));

      expect(getByText('Cancel Request')).toBeTruthy();
    });

    it('should show confirmation alert when cancel pressed', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      // Switch to sent tab
      fireEvent.press(getByText(/Sent/));
      fireEvent.press(getByText('Cancel Request'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Cancel Request',
        expect.stringContaining('Are you sure'),
        expect.any(Array)
      );
    });
  });

  // ===========================================================================
  // MESSAGE VIEWING TESTS
  // ===========================================================================

  describe('Message Viewing', () => {
    it('should show tap to read message button', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Tap to read message')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty States', () => {
    it('should show empty state for received when no requests', () => {
      createMockStore({ receivedRequests: [] });

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('No received requests')).toBeTruthy();
    });

    it('should show empty state for sent when no requests', () => {
      createMockStore({ sentRequests: [] });

      const { getByText } = render(<ConnectionRequestsScreen />);

      // Switch to sent tab
      fireEvent.press(getByText(/Sent/));

      expect(getByText('No sent requests')).toBeTruthy();
    });

    it('should show helpful text in empty state', () => {
      createMockStore({ receivedRequests: [] });

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Connection requests you receive will appear here')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading States', () => {
    it('should show loading indicator when loading', () => {
      createMockStore({ loading: true, receivedRequests: [] });

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Loading requests...')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show alert when error occurs', () => {
      createMockStore({ error: 'Failed to load requests' });

      render(<ConnectionRequestsScreen />);

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to load requests');
    });
  });

  // ===========================================================================
  // STATUS DISPLAY TESTS
  // ===========================================================================

  describe('Status Display', () => {
    it('should show accepted status badge for accepted requests', () => {
      createMockStore({
        receivedRequests: [
          {
            ...mockReceivedRequest,
            status: 'accepted',
          },
        ],
      });

      const { getAllByText } = render(<ConnectionRequestsScreen />);

      // There may be multiple "Accepted" texts (badge and stats)
      expect(getAllByText('Accepted').length).toBeGreaterThan(0);
    });

    it('should show declined status badge for declined requests', () => {
      createMockStore({
        receivedRequests: [
          {
            ...mockReceivedRequest,
            status: 'declined',
          },
        ],
      });

      const { getAllByText } = render(<ConnectionRequestsScreen />);

      expect(getAllByText('Declined').length).toBeGreaterThan(0);
    });

    it('should show expired status for expired requests', () => {
      createMockStore({
        receivedRequests: [
          {
            ...mockReceivedRequest,
            status: 'pending',
            expires_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          },
        ],
      });

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText(/Expired/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILD SAFETY COMPLIANCE TESTS
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should only show childrenCount, not child names', () => {
      createMockStore();

      const { queryByText } = render(<ConnectionRequestsScreen />);

      // Should show count
      expect(queryByText('2 children')).toBeTruthy();

      // Should NOT show child names
      expect(queryByText(/emma/i)).toBeNull();
      expect(queryByText(/jacob/i)).toBeNull();
    });

    it('should not have child PII in request data', () => {
      // Verify mock data structure
      expect(mockReceivedRequest.senderProfile).not.toHaveProperty('childNames');
      expect(mockReceivedRequest.senderProfile).not.toHaveProperty('childAges');
      expect(mockReceivedRequest.senderProfile).not.toHaveProperty('childSchools');
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible icons', () => {
      createMockStore();

      const { getByTestId } = render(<ConnectionRequestsScreen />);

      expect(getByTestId('icon-inbox')).toBeTruthy();
      expect(getByTestId('icon-send')).toBeTruthy();
    });

    it('should have accessible action buttons', () => {
      createMockStore();

      const { getByText } = render(<ConnectionRequestsScreen />);

      expect(getByText('Accept')).toBeTruthy();
      expect(getByText('Decline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // DISPATCH TESTS
  // ===========================================================================

  describe('Data Loading', () => {
    it('should dispatch fetch actions on mount', () => {
      createMockStore();

      render(<ConnectionRequestsScreen />);

      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
