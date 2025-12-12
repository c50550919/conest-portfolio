/**
 * Shared Test Utilities for React Native Screens
 *
 * Provides common mocks, factories, and render helpers for screen tests.
 *
 * Constitution Principles:
 * - Principle I: Child safety - mock data reflects count-only child data
 * - Principle II: 85% coverage requirement
 * - Principle V: TDD workflow enforcement
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';

// Import all reducers
import userReducer from '../../src/store/slices/userSlice';
import browseDiscoveryReducer from '../../src/store/slices/browseDiscoverySlice';
import savedProfilesReducer from '../../src/store/slices/savedProfilesSlice';
import connectionRequestsReducer from '../../src/store/slices/connectionRequestsSlice';
import enhancedMessagesReducer from '../../src/store/slices/enhancedMessagesSlice';
import verificationReducer from '../../src/store/slices/verificationSlice';

// ============================================================================
// MOCK SETUP HELPERS
// ============================================================================

/**
 * Setup common mocks for screen tests
 * Call this in beforeAll() or at the top of test files
 */
export const setupCommonMocks = () => {
  // Mock navigation
  jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
      ...actualNav,
      useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        setOptions: jest.fn(),
        addListener: jest.fn(() => jest.fn()),
        removeListener: jest.fn(),
        reset: jest.fn(),
        dispatch: jest.fn(),
        isFocused: jest.fn(() => true),
        canGoBack: jest.fn(() => true),
      }),
      useRoute: () => ({
        params: {},
        name: 'TestScreen',
        key: 'test-key',
      }),
      useFocusEffect: jest.fn((callback) => callback()),
      useIsFocused: jest.fn(() => true),
    };
  });

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

  jest.mock('react-native-vector-icons/Ionicons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return {
      __esModule: true,
      default: ({ name, ...props }: { name: string; [key: string]: unknown }) =>
        React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
    };
  });

  // Mock SVG
  jest.mock('react-native-svg', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
      __esModule: true,
      default: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
        React.createElement(View, { testID: 'svg', ...props }, children),
      Svg: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
        React.createElement(View, { testID: 'svg', ...props }, children),
      Circle: (props: { [key: string]: unknown }) =>
        React.createElement(View, { testID: 'svg-circle', ...props }),
      Path: (props: { [key: string]: unknown }) =>
        React.createElement(View, { testID: 'svg-path', ...props }),
      Rect: (props: { [key: string]: unknown }) =>
        React.createElement(View, { testID: 'svg-rect', ...props }),
      G: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
        React.createElement(View, { testID: 'svg-g', ...props }, children),
    };
  });

  // Mock linear gradient
  jest.mock('react-native-linear-gradient', () => 'LinearGradient');

  // Mock image picker
  jest.mock('react-native-image-picker', () => ({
    launchImageLibrary: jest.fn(),
    launchCamera: jest.fn(),
  }));

  // Mock safe area context
  jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  }));
};

// ============================================================================
// REDUX STORE FACTORY
// ============================================================================

const rootReducer = combineReducers({
  user: userReducer,
  browseDiscovery: browseDiscoveryReducer,
  savedProfiles: savedProfilesReducer,
  connectionRequests: connectionRequestsReducer,
  enhancedMessages: enhancedMessagesReducer,
  verification: verificationReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

/**
 * Create a configured Redux store for testing
 */
export const createMockStore = (preloadedState: Partial<RootState> = {}) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
};

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Create mock user profile
 * Note: No child-specific data per Constitution Principle I
 */
export const createMockUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phone: '+1234567890',
  isVerified: true,
  hasBackgroundCheck: true,
  isPhoneVerified: true,
  isEmailVerified: true,
  profilePhoto: null,
  location: 'San Francisco, CA',
  bio: 'Test bio',
  childrenCount: 2, // Only count, never specific child data
  workSchedule: '9-5 weekdays',
  preferences: {
    maxDistance: 25,
    ageRange: { min: 25, max: 45 },
    scheduleCompatibility: true,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock discovery profile
 */
export const createMockProfile = (overrides: Record<string, unknown> = {}) => ({
  userId: 'profile-123',
  firstName: 'Sarah',
  lastName: 'Johnson',
  age: 32,
  location: 'San Francisco, CA',
  distance: 5.2,
  childrenCount: 2,
  profilePhoto: 'https://example.com/photo.jpg',
  bio: 'Single mom looking for compatible roommate',
  workSchedule: 'Remote worker',
  compatibilityScore: 85,
  isVerified: true,
  hasBackgroundCheck: true,
  isPhoneVerified: true,
  isEmailVerified: true,
  verificationStatus: 'verified',
  householdPreferences: {
    hasPets: false,
    smoking: 'no',
    guestPolicy: 'occasional',
  },
  parentingPhilosophy: {
    discipline: 'balanced',
    screenTime: 'moderate',
    bedtime: 'structured',
  },
  budget: {
    min: 1000,
    max: 1500,
  },
  moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

/**
 * Create mock connection request
 */
export const createMockConnectionRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'request-123',
  senderId: 'sender-123',
  receiverId: 'receiver-456',
  status: 'pending',
  message: 'Hi! I think we would be great roommates.',
  senderProfile: createMockProfile({ userId: 'sender-123', firstName: 'Jane' }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock conversation
 */
export const createMockConversation = (overrides: Record<string, unknown> = {}) => ({
  id: 'conversation-123',
  participantIds: ['user-123', 'user-456'],
  lastMessage: {
    id: 'msg-123',
    content: 'Hey, how are you?',
    senderId: 'user-456',
    createdAt: new Date().toISOString(),
  },
  unreadCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  otherParticipant: createMockProfile({ userId: 'user-456' }),
  ...overrides,
});

/**
 * Create mock message
 */
export const createMockMessage = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg-123',
  conversationId: 'conversation-123',
  senderId: 'user-123',
  content: 'Test message content',
  isEncrypted: true,
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create mock subscription
 */
export const createMockSubscription = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-123',
  userId: 'user-123',
  plan: 'premium',
  status: 'active',
  currentPeriodStart: new Date().toISOString(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  cancelAtPeriodEnd: false,
  ...overrides,
});

/**
 * Create mock verification status
 */
export const createMockVerificationStatus = (overrides: Record<string, unknown> = {}) => ({
  email: { status: 'verified', verifiedAt: new Date().toISOString() },
  phone: { status: 'verified', verifiedAt: new Date().toISOString() },
  identity: { status: 'pending', verifiedAt: null },
  background: { status: 'not_started', verifiedAt: null },
  income: { status: 'not_required', verifiedAt: null },
  ...overrides,
});

// ============================================================================
// INITIAL STATE FACTORIES
// ============================================================================

/**
 * Create authenticated user state
 */
export const createAuthenticatedUserState = (overrides: Record<string, unknown> = {}) => ({
  user: {
    profile: createMockUser(overrides),
    isAuthenticated: true,
    loading: false,
    error: null,
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    },
  },
});

/**
 * Create initial browse discovery state with profiles
 */
export const createBrowseDiscoveryState = (profileCount = 5) => ({
  browseDiscovery: {
    profiles: Array.from({ length: profileCount }, (_, i) =>
      createMockProfile({ userId: `profile-${i}` })
    ),
    currentPage: 1,
    totalPages: 3,
    loading: false,
    error: null,
    filters: {
      distance: 25,
      ageRange: { min: 25, max: 45 },
      hasBackgroundCheck: false,
      isVerified: false,
    },
    sortBy: 'compatibility',
  },
});

/**
 * Create messages state
 */
export const createMessagesState = (conversationCount = 3) => ({
  enhancedMessages: {
    conversations: Array.from({ length: conversationCount }, (_, i) =>
      createMockConversation({ id: `conversation-${i}` })
    ),
    activeConversation: null,
    messages: {},
    loading: false,
    error: null,
    unreadCount: 0,
  },
});

/**
 * Create verification state
 */
export const createVerificationState = (overrides: Record<string, unknown> = {}) => ({
  verification: {
    status: createMockVerificationStatus(overrides),
    loading: false,
    error: null,
    currentStep: 'email',
  },
});

// ============================================================================
// RENDER HELPERS
// ============================================================================

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<RootState>;
  store?: ReturnType<typeof createMockStore>;
  withNavigation?: boolean;
}

/**
 * Render component with Redux Provider
 */
export const renderWithRedux = (
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    withNavigation = false,
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (withNavigation) {
      return (
        <Provider store={store}>
          <NavigationContainer>{children}</NavigationContainer>
        </Provider>
      );
    }
    return <Provider store={store}>{children}</Provider>;
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

/**
 * Render component with full app context (Redux + Navigation)
 */
export const renderWithFullContext = (
  ui: React.ReactElement,
  options: ExtendedRenderOptions = {}
) => {
  return renderWithRedux(ui, { ...options, withNavigation: true });
};

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create mock navigation object for prop injection
 */
export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  getParent: jest.fn(),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
});

/**
 * Create mock route object for prop injection
 */
export const createMockRoute = (params: Record<string, unknown> = {}) => ({
  params,
  name: 'TestScreen',
  key: 'test-key',
});

/**
 * Assert child safety compliance - no child PII
 * Constitution Principle I
 */
export const assertNoChildPII = (container: ReturnType<typeof render>) => {
  const { queryByText } = container;

  // Should NOT find specific child data patterns
  expect(queryByText(/child.*name/i)).toBeNull();
  expect(queryByText(/child.*age/i)).toBeNull();
  expect(queryByText(/child.*school/i)).toBeNull();
  expect(queryByText(/child.*grade/i)).toBeNull();
  expect(queryByText(/years? old/i)).toBeNull();

  // May find generic "children" count references - that's OK
};

/**
 * Mock console methods for cleaner test output
 */
export const mockConsole = () => {
  const originalConsole = { ...console };

  beforeAll(() => {
    global.console = {
      ...console,
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
  });

  afterAll(() => {
    global.console = originalConsole;
  });
};

// ============================================================================
// ASYNC ACTION HELPERS
// ============================================================================

/**
 * Create mock API response
 */
export const createMockApiResponse = <T>(data: T, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
});

/**
 * Create mock API error response
 */
export const createMockApiError = (message: string, status = 400) => ({
  success: false,
  error: {
    message,
    status,
  },
});
