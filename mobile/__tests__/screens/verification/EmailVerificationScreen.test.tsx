/**
 * EmailVerificationScreen Tests
 *
 * MEDIUM-RISK - Account activation requirement
 *
 * Key Test Areas:
 * 1. Initial state (send email button)
 * 2. Link sent state (check inbox)
 * 3. Already verified state (success)
 * 4. Resend functionality with countdown
 * 5. Open email app functionality
 * 6. Refresh status
 * 7. Error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import verificationReducer from '../../../src/store/slices/verificationSlice';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  ...jest.requireActual('@react-navigation/stack'),
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
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ children, onPress, disabled, loading, testID, mode, icon }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled: disabled || loading, testID },
        React.createElement(Text, {}, loading ? 'Loading...' : children)
      ),
  };
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock types
jest.mock('../../../src/types/verification', () => ({
  VerificationStackParamList: {},
}));

import { EmailVerificationScreen } from '../../../src/screens/verification/EmailVerificationScreen';

describe('EmailVerificationScreen', () => {
  let store: ReturnType<typeof configureStore>;
  let alertSpy: jest.SpyInstance;

  const createStore = (overrides = {}, statusOverrides = {}) => {
    return configureStore({
      reducer: {
        verification: verificationReducer,
      },
      preloadedState: {
        verification: {
          status: {
            email_verified: false,
            ...statusOverrides,
          },
          loading: false,
          error: null,
          lastFetched: null,
          idVerification: {
            status: 'not_started',
            sessionId: null,
            sessionUrl: null,
            expiresAt: null,
            attemptCount: 0,
            lastAttempt: null,
          },
          backgroundCheck: {
            status: 'not_started',
            reportId: null,
            reportUrl: null,
            expiresAt: null,
            consentGiven: false,
            consentTimestamp: null,
          },
          phoneVerification: {
            codeSent: false,
            phoneNumber: null,
            codeExpiry: null,
            failedAttempts: 0,
            resendAvailableAt: null,
            cooldownUntil: null,
          },
          emailVerification: {
            linkSent: false,
            email: 'test@example.com',
            linkExpiry: null,
            ...overrides,
          },
          incomeVerification: {
            status: 'not_started',
            documents: [],
            verifiedIncome: null,
            lastVerified: null,
          },
        },
      },
    });
  };

  const renderScreen = (
    emailOverrides = {},
    statusOverrides = {},
    routeParams = { email: 'test@example.com' }
  ) => {
    store = createStore(emailOverrides, statusOverrides);
    const navigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    } as any;
    const route = { params: routeParams } as any;

    return render(
      <Provider store={store}>
        <EmailVerificationScreen navigation={navigation} route={route} />
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // INITIAL STATE TESTS
  // ===========================================================================

  describe('Initial State', () => {
    it('should render email verification title', () => {
      const { getByText } = renderScreen();

      expect(getByText('Verify Your Email')).toBeTruthy();
    });

    it('should display email in subtitle', () => {
      const { getByText } = renderScreen();

      expect(getByText(/test@example.com/)).toBeTruthy();
    });

    it('should show send email button initially', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('send-email-button')).toBeTruthy();
    });

    it('should have back button', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('back-button')).toBeTruthy();
    });

    it('should show email icon', () => {
      const { UNSAFE_getAllByType } = renderScreen();
      const { Text } = require('react-native');

      // Icon is inside accessibility-hidden container, find via UNSAFE query
      const allTextElements = UNSAFE_getAllByType(Text);
      const iconElement = allTextElements.find(
        (el: any) => el.props?.testID === 'icon-email-outline'
      );
      expect(iconElement).toBeTruthy();
    });
  });

  // ===========================================================================
  // LINK SENT STATE TESTS
  // ===========================================================================

  describe('Link Sent State', () => {
    it('should show check inbox message after link is sent', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000, // 24 hours from now
      });

      expect(getByText('Check your inbox')).toBeTruthy();
    });

    it('should show email sent icon', () => {
      const { getByTestId } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByTestId('icon-email-send')).toBeTruthy();
    });

    it('should show tips section', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByText('Tips:')).toBeTruthy();
      expect(getByText(/Check your spam/)).toBeTruthy();
    });

    it('should show resend text', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      // When linkExpiry is set, countdown starts at 60s
      expect(getByText(/Resend email in/)).toBeTruthy();
    });

    it('should show refresh status text', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByText(/Already clicked the link/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // ALREADY VERIFIED STATE TESTS
  // ===========================================================================

  describe('Already Verified State', () => {
    it('should show success message when already verified', () => {
      const { getByText } = renderScreen({}, { email_verified: true });

      expect(getByText('Email Verified!')).toBeTruthy();
    });

    it('should show success description', () => {
      const { getByText } = renderScreen({}, { email_verified: true });

      expect(
        getByText('Your email address has been successfully verified.')
      ).toBeTruthy();
    });

    it('should show email check icon for verified state', () => {
      const { getByTestId } = renderScreen({}, { email_verified: true });

      expect(getByTestId('icon-email-check')).toBeTruthy();
    });

    it('should show Done button when verified', () => {
      const { getByText } = renderScreen({}, { email_verified: true });

      expect(getByText('Done')).toBeTruthy();
    });
  });

  // ===========================================================================
  // OPEN EMAIL APP TESTS
  // ===========================================================================

  describe('Open Email App', () => {
    it('should render Open Email App button when link is sent', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByText('Open Email App')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('should display error message when there is an error', () => {
      store = configureStore({
        reducer: {
          verification: verificationReducer,
        },
        preloadedState: {
          verification: {
            status: { email_verified: false },
            loading: false,
            error: 'Failed to send verification email',
            lastFetched: null,
            idVerification: {
              status: 'not_started',
              sessionId: null,
              sessionUrl: null,
              expiresAt: null,
              attemptCount: 0,
              lastAttempt: null,
            },
            backgroundCheck: {
              status: 'not_started',
              reportId: null,
              reportUrl: null,
              expiresAt: null,
              consentGiven: false,
              consentTimestamp: null,
            },
            phoneVerification: {
              codeSent: false,
              phoneNumber: null,
              codeExpiry: null,
              failedAttempts: 0,
              resendAvailableAt: null,
              cooldownUntil: null,
            },
            emailVerification: {
              linkSent: false,
              email: 'test@example.com',
              linkExpiry: null,
            },
            incomeVerification: {
              status: 'not_started',
              documents: [],
              verifiedIncome: null,
              lastVerified: null,
            },
          },
        },
      });

      const navigation = { navigate: mockNavigate, goBack: mockGoBack } as any;
      const route = { params: { email: 'test@example.com' } } as any;

      const { getByText, getByTestId } = render(
        <Provider store={store}>
          <EmailVerificationScreen navigation={navigation} route={route} />
        </Provider>
      );

      expect(getByText('Failed to send verification email')).toBeTruthy();
      expect(getByTestId('icon-alert-circle')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should go back when back button is pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should go back when Done is pressed on verified screen', () => {
      const { getByText } = renderScreen({}, { email_verified: true });

      fireEvent.press(getByText('Done'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible header', () => {
      const { getByRole } = renderScreen();

      expect(getByRole('header')).toBeTruthy();
    });

    it('should have accessible tips section', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      // Tips should be readable
      expect(getByText(/spam/)).toBeTruthy();
      expect(getByText(/24 hours/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // TIPS CONTENT TESTS
  // ===========================================================================

  describe('Tips Content', () => {
    it('should show spam folder tip', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByText(/spam.*junk/i)).toBeTruthy();
    });

    it('should show email correctness tip', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByText(/email address is correct/i)).toBeTruthy();
    });

    it('should show link expiry tip', () => {
      const { getByText } = renderScreen({
        linkSent: true,
        linkExpiry: Date.now() + 86400000,
      });

      expect(getByText(/expires in 24 hours/i)).toBeTruthy();
    });
  });
});
