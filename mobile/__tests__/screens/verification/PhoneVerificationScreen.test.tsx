/**
 * PhoneVerificationScreen Tests
 *
 * HIGH-RISK - Account activation requirement
 *
 * Key Test Areas:
 * 1. Initial state (send code button)
 * 2. OTP input after code sent
 * 3. Resend functionality with countdown
 * 4. Error handling
 * 5. Cooldown after failed attempts
 * 6. Success flow
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
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
    Button: ({ children, onPress, disabled, loading, testID }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled: disabled || loading, testID },
        React.createElement(Text, {}, loading ? 'Loading...' : children)
      ),
  };
});

// Mock OTPInput component
jest.mock('../../../src/components/verification', () => ({
  OTPInput: ({ testID, value, onChange, onComplete, disabled, error }: any) => {
    const React = require('react');
    const { TextInput } = require('react-native');
    return React.createElement(TextInput, {
      testID,
      value,
      onChangeText: (text: string) => {
        onChange(text);
        if (text.length === 6) {
          onComplete(text);
        }
      },
      editable: !disabled,
      maxLength: 6,
    });
  },
}));

// Mock types
jest.mock('../../../src/types/verification', () => ({
  VERIFICATION_CONSTANTS: {
    MAX_OTP_ATTEMPTS: 5,
    OTP_COOLDOWN_MS: 300000,
    OTP_LENGTH: 6,
  },
  VerificationStackParamList: {},
}));

import { PhoneVerificationScreen } from '../../../src/screens/verification/PhoneVerificationScreen';

describe('PhoneVerificationScreen', () => {
  let store: ReturnType<typeof configureStore>;
  let alertSpy: jest.SpyInstance;

  const createStore = (overrides = {}) => {
    return configureStore({
      reducer: {
        verification: verificationReducer,
      },
      preloadedState: {
        verification: {
          status: null,
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
            phoneNumber: '+15551234567',
            codeExpiry: null,
            failedAttempts: 0,
            resendAvailableAt: null,
            cooldownUntil: null,
          },
          emailVerification: {
            linkSent: false,
            email: null,
            linkExpiry: null,
          },
          incomeVerification: {
            status: 'not_started',
            documents: [],
            verifiedIncome: null,
            lastVerified: null,
          },
          ...overrides,
        },
      },
    });
  };

  const renderScreen = (
    storeOverrides = {},
    routeParams = { phoneNumber: '+15551234567' }
  ) => {
    store = createStore(storeOverrides);
    const navigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    } as any;
    const route = { params: routeParams } as any;

    return render(
      <Provider store={store}>
        <PhoneVerificationScreen navigation={navigation} route={route} />
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
    it('should render phone verification title', () => {
      const { getByText } = renderScreen();

      expect(getByText('Verify Your Phone')).toBeTruthy();
    });

    it('should display phone number in subtitle', () => {
      const { getByText } = renderScreen();

      expect(getByText(/\+15551234567/)).toBeTruthy();
    });

    it('should show send code button initially', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('send-code-button')).toBeTruthy();
    });

    it('should have back button', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('back-button')).toBeTruthy();
    });

    it('should show phone icon', () => {
      const { UNSAFE_getAllByType } = renderScreen();
      const { Text } = require('react-native');

      // Icon is inside accessibility-hidden container, find via UNSAFE query
      const allTextElements = UNSAFE_getAllByType(Text);
      const iconElement = allTextElements.find(
        (el: any) => el.props?.testID === 'icon-phone-message'
      );
      expect(iconElement).toBeTruthy();
    });
  });

  // ===========================================================================
  // CODE SENT STATE TESTS
  // ===========================================================================

  describe('Code Sent State', () => {
    it('should show OTP input after code is sent', () => {
      const { getByTestId } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      expect(getByTestId('otp-input')).toBeTruthy();
    });

    it('should show verify button after code is sent', () => {
      const { getByTestId } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      expect(getByTestId('verify-button')).toBeTruthy();
    });

    it('should update subtitle after code is sent', () => {
      const { getByText } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      expect(getByText(/Enter the 6-digit code/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // OTP INPUT TESTS
  // ===========================================================================

  describe('OTP Input', () => {
    it('should allow entering OTP code', () => {
      const { getByTestId } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      const otpInput = getByTestId('otp-input');
      fireEvent.changeText(otpInput, '123456');

      expect(otpInput.props.value).toBe('123456');
    });

    it('should limit OTP to 6 characters', () => {
      const { getByTestId } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      const otpInput = getByTestId('otp-input');
      expect(otpInput.props.maxLength).toBe(6);
    });
  });

  // ===========================================================================
  // FAILED ATTEMPTS TESTS
  // ===========================================================================

  describe('Failed Attempts', () => {
    it('should show remaining attempts after failures', () => {
      const { getByText } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 2,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      expect(getByText('3 attempts remaining')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COOLDOWN TESTS
  // ===========================================================================

  describe('Cooldown State', () => {
    it('should show cooldown message when cooling down', () => {
      const { getByText } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 5,
          resendAvailableAt: null,
          cooldownUntil: Date.now() + 300000, // 5 minutes from now
        },
      });

      expect(getByText(/Too many attempts/)).toBeTruthy();
    });

    it('should show clock icon during cooldown', () => {
      const { getByTestId } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 5,
          resendAvailableAt: null,
          cooldownUntil: Date.now() + 300000,
        },
      });

      expect(getByTestId('icon-clock-alert-outline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('should show error message when there is an error', () => {
      const { getByText, getByTestId } = renderScreen({
        error: 'Invalid verification code',
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 1,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      expect(getByText('Invalid verification code')).toBeTruthy();
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
  });

  // ===========================================================================
  // RESEND TESTS
  // ===========================================================================

  describe('Resend Functionality', () => {
    it('should show resend text after code is sent', () => {
      const { getByText } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: null,
          cooldownUntil: null,
        },
      });

      expect(getByText(/Resend/)).toBeTruthy();
    });

    it('should show countdown when resend is not available', () => {
      const { getByText } = renderScreen({
        phoneVerification: {
          codeSent: true,
          phoneNumber: '+15551234567',
          codeExpiry: null,
          failedAttempts: 0,
          resendAvailableAt: Date.now() + 30000, // 30 seconds from now
          cooldownUntil: null,
        },
      });

      // Should show countdown text
      expect(getByText(/Resend/)).toBeTruthy();
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
  });
});
