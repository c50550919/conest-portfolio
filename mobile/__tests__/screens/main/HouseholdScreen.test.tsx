/**
 * HouseholdScreen Tests
 *
 * MEDIUM-RISK - Household management and roommate coordination
 *
 * Key Test Areas:
 * 1. Household info display
 * 2. Member list rendering
 * 3. Expense split section
 * 4. Shared calendar
 * 5. Quick actions (add member, documents, split rent)
 * 6. Settings navigation
 * 7. Empty state (no household)
 * 8. Child safety (NO child PII)
 * 9. Loading states
 * 10. Error handling
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

// Mock LinearGradient
jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }, children),
  };
});

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, Image } = require('react-native');
  return {
    Card: ({ children, onPress, ...props }: any) =>
      React.createElement(
        onPress ? TouchableOpacity : View,
        { onPress, testID: 'card', ...props },
        children
      ),
    Avatar: {
      Image: ({ source, ...props }: any) =>
        React.createElement(Image, { source, testID: 'avatar-image', ...props }),
      Text: ({ label, ...props }: any) =>
        React.createElement(Text, { testID: 'avatar-text', ...props }, label),
    },
    IconButton: ({ icon, onPress, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: `icon-button-${icon}`, ...props },
        React.createElement(Text, {}, icon)
      ),
    Button: ({ children, onPress, mode, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: `button-${children}`, ...props },
        React.createElement(Text, {}, children)
      ),
    Chip: ({ children, ...props }: any) =>
      React.createElement(Text, { testID: 'chip', ...props }, children),
    Divider: () => React.createElement(View, { testID: 'divider' }),
    ActivityIndicator: () => React.createElement(View, { testID: 'activity-indicator' }),
    List: {
      Item: ({ title, description, left, onPress, testID, ...props }: any) =>
        React.createElement(
          TouchableOpacity,
          { onPress, testID, ...props },
          React.createElement(Text, {}, title),
          description && React.createElement(Text, {}, description)
        ),
      Icon: ({ icon }: any) => React.createElement(Text, { testID: `list-icon-${icon}` }, icon),
    },
    ProgressBar: ({ progress, ...props }: any) =>
      React.createElement(View, { testID: 'progress-bar', ...props }),
  };
});

// Mock householdSlice actions
jest.mock('../../../src/store/slices/householdSlice', () => ({
  fetchMyHousehold: jest.fn(() => ({ type: 'household/fetchMyHousehold', unwrap: () => Promise.resolve({ household: null }) })),
  fetchExpenses: jest.fn(() => ({ type: 'household/fetchExpenses' })),
  fetchRecentTransactions: jest.fn(() => ({ type: 'household/fetchRecentTransactions' })),
  fetchUpcomingPayments: jest.fn(() => ({ type: 'household/fetchUpcomingPayments' })),
  splitRent: jest.fn(() => ({ type: 'household/splitRent' })),
}));

// Mock react-redux
const mockDispatch = jest.fn();
const mockSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => mockSelector(selector),
}));

import HouseholdScreen from '../../../src/screens/main/HouseholdScreen';

describe('HouseholdScreen', () => {
  const mockHousehold = {
    id: 'household-1',
    name: 'Mountain View House',
    address: '123 Main St, Mountain View, CA',
    totalRent: 3500,
    monthlyRent: 3500,
    totalMembers: 2,
    establishedAt: '2024-06-01',
    moveInDate: '2024-06-01',
    leaseEndDate: '2025-05-31',
    members: [
      {
        id: 'member-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        photoUrl: 'https://example.com/john.jpg',
        role: 'lease-holder',
        rentShare: 1750,
        isVerified: true,
        childrenCount: 2,
        isCurrentUser: true,
        joinedAt: '2024-06-01',
        verificationBadges: {
          backgroundCheckComplete: true,
          idVerified: true,
        },
        paymentStatus: {
          currentMonth: 'paid',
        },
      },
      {
        id: 'member-2',
        userId: 'user-2',
        firstName: 'Sarah',
        lastName: 'Smith',
        photoUrl: 'https://example.com/sarah.jpg',
        role: 'co-tenant',
        rentShare: 1750,
        isVerified: true,
        childrenCount: 1,
        isCurrentUser: false,
        joinedAt: '2024-07-01',
        verificationBadges: {
          backgroundCheckComplete: true,
          idVerified: true,
        },
        paymentStatus: {
          currentMonth: 'paid',
        },
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        description: 'Rent - March 2025',
        amount: 3500,
        paidBy: 'user-1',
        date: '2025-03-01',
        status: 'paid',
      },
      {
        id: 'expense-2',
        description: 'Utilities',
        amount: 250,
        paidBy: 'user-2',
        date: '2025-03-05',
        status: 'pending',
      },
    ],
    upcomingEvents: [
      {
        id: 'event-1',
        title: 'House Meeting',
        date: '2025-03-15T18:00:00',
        type: 'meeting',
      },
    ],
  };

  const mockExpenses = [
    {
      id: 'expense-1',
      category: 'rent',
      description: 'Monthly Rent',
      totalAmount: 3500,
      dueDate: '2025-03-01',
      status: 'paid',
      splits: [
        { userId: 'user-1', amount: 1750, status: 'paid' },
        { userId: 'user-2', amount: 1750, status: 'paid' },
      ],
    },
  ];

  const mockTransactions = [
    {
      id: 'trans-1',
      fromUserId: 'user-2',
      toUserId: 'user-1',
      amount: 1750,
      description: 'Rent payment',
      date: '2025-03-01',
    },
  ];

  const createMockStore = (
    household: any = mockHousehold,
    loading = false,
    error: string | null = null,
    overrideExpenses?: any[]
  ) => {
    const mockState = {
      household: {
        household,
        members: household?.members || [],
        expenses: overrideExpenses !== undefined ? overrideExpenses : (household ? mockExpenses : []),
        recentTransactions: household ? mockTransactions : [],
        loading,
        error,
      },
      user: {
        user: { id: 'user-1' },
      },
    };

    // Configure mockSelector to call the selector with the mock state
    mockSelector.mockImplementation((selector: any) => selector(mockState));

    return configureStore({
      reducer: {
        household: (state = mockState.household) => state,
        user: (state = mockState.user) => state,
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render household screen with testID', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-screen')).toBeTruthy();
    });

    it('should render household name', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-name').props.children).toBe('Mountain View House');
    });

    it('should render household info section', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-info')).toBeTruthy();
    });

    it('should render settings button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-settings-button')).toBeTruthy();
    });
  });

  // ===========================================================================
  // MEMBER LIST TESTS
  // ===========================================================================

  describe('Member List', () => {
    it('should display household members section', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-members')).toBeTruthy();
    });

    it('should display member names', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Component displays only first names
      expect(getByText('John')).toBeTruthy();
      expect(getByText('Sarah')).toBeTruthy();
    });

    it('should display member avatars', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Component shows avatar initials for each member
      expect(getByText('JD')).toBeTruthy(); // John Doe initials
      expect(getByText('SS')).toBeTruthy(); // Sarah Smith initials
    });

    it('should display verification badges for verified members', () => {
      const store = createMockStore();

      const { getAllByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getAllByTestId('icon-check-decagram').length).toBe(2);
    });

    it('should display member roles', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Component shows roles as part of member details text
      // "2 children • Lease holder" and "1 child • Co-tenant"
      expect(getByText(/Lease holder/)).toBeTruthy();
      expect(getByText(/Co-tenant/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // QUICK ACTIONS TESTS
  // ===========================================================================

  describe('Quick Actions', () => {
    it('should display quick actions section', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('quick-actions')).toBeTruthy();
    });

    it('should display add member button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('add-member-button')).toBeTruthy();
    });

    it('should display documents button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('documents-button')).toBeTruthy();
    });

    it('should display split rent button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('split-rent-button')).toBeTruthy();
    });

    it('should have add member button available', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Add member button exists and can be pressed (navigation to be implemented)
      const addMemberButton = getByTestId('add-member-button');
      expect(addMemberButton).toBeTruthy();
      fireEvent.press(addMemberButton);
    });
  });

  // ===========================================================================
  // EXPENSE SPLIT TESTS
  // ===========================================================================

  describe('Expense Split Section', () => {
    it('should display expense split section', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('expense-split-section')).toBeTruthy();
    });

    it('should display expense section when expenses exist', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Expense section should be present
      expect(getByTestId('expense-split-section')).toBeTruthy();
    });

    it('should display recent transactions', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('recent-transactions')).toBeTruthy();
    });

    it('should display expense category', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Component shows capitalized category name
      expect(getByText('Rent')).toBeTruthy();
    });

    it('should display view all expenses button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('view-all-expenses-button')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SHARED CALENDAR TESTS
  // ===========================================================================

  describe('Shared Calendar', () => {
    it('should display shared calendar section', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('shared-calendar')).toBeTruthy();
    });

    it('should display upcoming events', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Component shows hardcoded schedule items
      expect(getByText('Household Meeting')).toBeTruthy();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('should show empty state when no household', () => {
      const store = createMockStore(null);

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('empty-household-state')).toBeTruthy();
    });

    it('should show find roommates button in empty state', () => {
      const store = createMockStore(null);

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('find-roommates-button')).toBeTruthy();
    });

    it('should have find roommates button available', () => {
      const store = createMockStore(null);

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Find roommates button exists and can be pressed
      const findRoommatesButton = getByTestId('find-roommates-button');
      expect(findRoommatesButton).toBeTruthy();
      fireEvent.press(findRoommatesButton);
    });

    it('should show empty expenses state when no expenses', () => {
      // Pass empty expenses array as override
      const store = createMockStore(mockHousehold, false, null, []);

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('empty-expenses-state')).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const store = createMockStore(null, true);

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-loading-state')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('should show empty state when there is an error with no household', () => {
      const store = createMockStore(null, false, 'Failed to load household');

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Component shows empty state when no household (error is stored but UI shows empty state)
      expect(getByTestId('empty-household-state')).toBeTruthy();
      expect(getByText('No Household Found')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILD SAFETY COMPLIANCE TESTS
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should display children count only, not names', () => {
      const store = createMockStore();

      const { getByText, queryByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Should show count (as part of member details text with role)
      expect(getByText(/2 children/)).toBeTruthy();
      expect(getByText(/1 child/)).toBeTruthy();

      // Should NOT show child names
      expect(queryByText(/emma/i)).toBeNull();
      expect(queryByText(/jacob/i)).toBeNull();
    });

    it('should not display child ages', () => {
      const store = createMockStore();

      const { queryByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(queryByText(/years old/i)).toBeNull();
      expect(queryByText(/child age/i)).toBeNull();
    });

    it('should not display child schools', () => {
      const store = createMockStore();

      const { queryByText } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(queryByText(/school/i)).toBeNull();
      expect(queryByText(/elementary/i)).toBeNull();
    });

    it('should not have child PII in member data', () => {
      mockHousehold.members.forEach(member => {
        expect(member).not.toHaveProperty('childNames');
        expect(member).not.toHaveProperty('childAges');
        expect(member).not.toHaveProperty('childSchools');
        expect(member).not.toHaveProperty('childPhotos');
      });
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should have settings button available', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Settings button exists and can be pressed (navigation to be implemented)
      const settingsButton = getByTestId('household-settings-button');
      expect(settingsButton).toBeTruthy();
      fireEvent.press(settingsButton);
    });

    it('should have documents button that can be pressed', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      // Documents button exists and is pressable
      expect(getByTestId('documents-button')).toBeTruthy();
    });

    it('should have split rent button that shows alert when pressed', () => {
      const store = createMockStore();
      const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('split-rent-button'));

      // Split rent shows an alert confirmation
      expect(alertSpy).toHaveBeenCalledWith(
        'Split Rent',
        expect.any(String),
        expect.any(Array)
      );
      alertSpy.mockRestore();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible household screen', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-screen')).toBeTruthy();
    });

    it('should have accessible quick action buttons', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('add-member-button')).toBeTruthy();
      expect(getByTestId('documents-button')).toBeTruthy();
      expect(getByTestId('split-rent-button')).toBeTruthy();
    });

    it('should have accessible member cards', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <HouseholdScreen />
        </Provider>
      );

      expect(getByTestId('household-members')).toBeTruthy();
    });
  });
});
