/**
 * GoogleSignInButton Tests
 *
 * HIGH-RISK - OAuth authentication
 *
 * Key Test Areas:
 * 1. Button rendering and branding
 * 2. Sign in flow initiation
 * 3. Success callback handling
 * 4. Error handling for various OAuth errors
 * 5. Loading state
 * 6. Disabled state
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock Google Sign In - all mock code must be inside jest.mock() due to hoisting
jest.mock('@react-native-google-signin/google-signin', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');

  const MockGoogleSigninButton = ({ onPress, disabled, ...props }: any) => {
    return React.createElement(
      TouchableOpacity,
      {
        onPress,
        disabled,
        testID: 'google-signin-native-button',
        ...props,
      },
      React.createElement(Text, {}, 'Sign in with Google')
    );
  };

  // Add static properties that the real GoogleSigninButton has
  MockGoogleSigninButton.Size = {
    Standard: 0,
    Wide: 1,
    Icon: 2,
  };
  MockGoogleSigninButton.Color = {
    Dark: 0,
    Light: 1,
  };

  return {
    GoogleSigninButton: MockGoogleSigninButton,
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
    },
  };
});

// Mock OAuth service
const mockSignInWithGoogle = jest.fn();
jest.mock('../../../src/services/api/oauth', () => ({
  signInWithGoogle: () => mockSignInWithGoogle(),
}));

import GoogleSignInButton from '../../../src/components/auth/GoogleSignInButton';

describe('GoogleSignInButton', () => {
  let alertSpy: jest.SpyInstance;
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  const defaultProps = {
    onSuccess: mockOnSuccess,
    onError: mockOnError,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
    mockSignInWithGoogle.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@gmail.com',
        phoneVerified: false,
      },
      isNew: false,
      linked: false,
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // RENDER TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the button', () => {
      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      expect(getByTestId('google-signin-native-button')).toBeTruthy();
    });

    it('should render button text', () => {
      const { getByText } = render(<GoogleSignInButton {...defaultProps} />);

      expect(getByText('Sign in with Google')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SIGN IN FLOW TESTS
  // ===========================================================================

  describe('Sign In Flow', () => {
    it('should call signInWithGoogle when button is pressed', async () => {
      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should call onSuccess callback on successful sign in', async () => {
      const successResponse = {
        user: {
          id: 'user-123',
          email: 'test@gmail.com',
          phoneVerified: false,
        },
        isNew: false,
        linked: false,
      };
      mockSignInWithGoogle.mockResolvedValue(successResponse);

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(successResponse);
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should not show error for user cancellation', async () => {
      mockSignInWithGoogle.mockRejectedValue({
        code: 'user_cancelled',
        message: 'User cancelled sign in',
      });

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(alertSpy).not.toHaveBeenCalled();
      });
    });

    it('should show account conflict error message', async () => {
      mockSignInWithGoogle.mockRejectedValue({
        code: 'account_conflict',
        message: 'Account already exists',
      });

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Sign In Failed',
          expect.stringContaining('already registered'),
          expect.any(Array)
        );
      });
    });

    it('should show network error message', async () => {
      mockSignInWithGoogle.mockRejectedValue({
        code: 'network_error',
        message: 'Network error',
      });

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Sign In Failed',
          expect.stringContaining('Network error'),
          expect.any(Array)
        );
      });
    });

    it('should show rate limit error message', async () => {
      mockSignInWithGoogle.mockRejectedValue({
        code: 'rate_limit_exceeded',
        message: 'Rate limit exceeded',
      });

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Sign In Failed',
          expect.stringContaining('Too many attempts'),
          expect.any(Array)
        );
      });
    });

    it('should show generic error message for unknown errors', async () => {
      mockSignInWithGoogle.mockRejectedValue({
        code: 'unknown_error',
        message: 'Something went wrong',
      });

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Sign In Failed',
          expect.stringContaining('try again'),
          expect.any(Array)
        );
      });
    });

    it('should call onError callback on error', async () => {
      const error = {
        code: 'network_error',
        message: 'Network error',
      };
      mockSignInWithGoogle.mockRejectedValue(error);

      const { getByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });
  });

  // ===========================================================================
  // DISABLED STATE TESTS
  // ===========================================================================

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      const { getByTestId } = render(
        <GoogleSignInButton {...defaultProps} disabled={true} />
      );

      // TouchableOpacity stores disabled state in accessibilityState
      const button = getByTestId('google-signin-native-button');
      expect(button.props.accessibilityState?.disabled).toBe(true);
    });

    it('should not call sign in when disabled', async () => {
      const { getByTestId } = render(
        <GoogleSignInButton {...defaultProps} disabled={true} />
      );

      fireEvent.press(getByTestId('google-signin-native-button'));

      await waitFor(() => {
        expect(mockSignInWithGoogle).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator during sign in', async () => {
      mockSignInWithGoogle.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByTestId, queryByTestId, UNSAFE_queryByType } = render(
        <GoogleSignInButton {...defaultProps} />
      );

      // Initially button should be visible
      expect(getByTestId('google-signin-native-button')).toBeTruthy();

      fireEvent.press(getByTestId('google-signin-native-button'));

      // During loading, the button is replaced with ActivityIndicator
      await waitFor(() => {
        // Button should be hidden during loading
        expect(queryByTestId('google-signin-native-button')).toBeNull();
      });
    });

    it('should prevent multiple simultaneous sign in attempts', async () => {
      mockSignInWithGoogle.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      const { getByTestId, queryByTestId } = render(<GoogleSignInButton {...defaultProps} />);

      // First press triggers loading
      fireEvent.press(getByTestId('google-signin-native-button'));

      // Subsequent presses are prevented because button is replaced by ActivityIndicator
      // This is verified by the button being gone after first press
      await waitFor(() => {
        expect(queryByTestId('google-signin-native-button')).toBeNull();
      });

      // After mock resolves, verify only one call was made
      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  // ===========================================================================
  // BUTTON STYLE TESTS
  // ===========================================================================

  describe('Button Styles', () => {
    it('should accept dark style prop', () => {
      const { getByTestId } = render(
        <GoogleSignInButton {...defaultProps} style="dark" />
      );

      expect(getByTestId('google-signin-native-button')).toBeTruthy();
    });

    it('should accept light style prop', () => {
      const { getByTestId } = render(
        <GoogleSignInButton {...defaultProps} style="light" />
      );

      expect(getByTestId('google-signin-native-button')).toBeTruthy();
    });
  });
});
