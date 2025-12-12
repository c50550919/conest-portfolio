/**
 * WelcomeScreen Tests
 *
 * LOW-RISK - First screen in onboarding flow
 *
 * Key Test Areas:
 * 1. App branding display
 * 2. Safety features highlight
 * 3. Get Started button navigation
 * 4. Login link for existing users
 * 5. Accessibility
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
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
    Button: ({ children, onPress, mode, testID, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID, ...props },
        React.createElement(Text, {}, children)
      ),
  };
});

import WelcomeScreen from '../../../src/screens/onboarding/WelcomeScreen';

describe('WelcomeScreen', () => {
  const mockNavigation = {
    navigate: mockNavigate,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // BRANDING TESTS
  // ===========================================================================

  describe('Branding', () => {
    it('should display app name', () => {
      const { getByText } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByText('Welcome to CoNest')).toBeTruthy();
    });

    it('should display tagline', () => {
      const { getByText } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByText('Safe, verified housing for single parents')).toBeTruthy();
    });

    it('should display home heart icon', () => {
      const { getByTestId } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByTestId('icon-home-heart')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FEATURES DISPLAY TESTS
  // ===========================================================================

  describe('Features Display', () => {
    it('should display verification feature', () => {
      const { getByText, getByTestId } = render(
        <WelcomeScreen navigation={mockNavigation} />
      );

      expect(getByText('100% Verified')).toBeTruthy();
      expect(getByText(/Background checks and ID verification/)).toBeTruthy();
      expect(getByTestId('icon-shield-check')).toBeTruthy();
    });

    it('should display privacy feature', () => {
      const { getByText, getByTestId } = render(
        <WelcomeScreen navigation={mockNavigation} />
      );

      expect(getByText('Privacy First')).toBeTruthy();
      expect(getByText(/children's information stays private/)).toBeTruthy();
      expect(getByTestId('icon-lock')).toBeTruthy();
    });

    it('should display matching feature', () => {
      const { getByText, getByTestId } = render(
        <WelcomeScreen navigation={mockNavigation} />
      );

      expect(getByText('Perfect Matches')).toBeTruthy();
      expect(getByText(/AI-powered compatibility matching/)).toBeTruthy();
      expect(getByTestId('icon-handshake')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should navigate to PhoneVerification when Get Started is pressed', () => {
      const { getByTestId } = render(<WelcomeScreen navigation={mockNavigation} />);

      fireEvent.press(getByTestId('get-started-button'));

      expect(mockNavigate).toHaveBeenCalledWith('PhoneVerification', {});
    });

    it('should display login link for existing users', () => {
      const { getByText } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByText('Already have an account? Log in')).toBeTruthy();
    });

    it('should have login button with correct testID', () => {
      const { getByTestId } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByTestId('welcome-back-to-login-button')).toBeTruthy();
    });
  });

  // ===========================================================================
  // BUTTON RENDERING TESTS
  // ===========================================================================

  describe('Button Rendering', () => {
    it('should render Get Started button', () => {
      const { getByText } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByText('Get Started')).toBeTruthy();
    });

    it('should have Get Started button with testID', () => {
      const { getByTestId } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByTestId('get-started-button')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILD SAFETY MESSAGING TESTS
  // ===========================================================================

  describe('Child Safety Messaging', () => {
    it('should mention child privacy protection', () => {
      const { getByText } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByText(/children's information stays private/)).toBeTruthy();
    });

    it('should emphasize verification for safety', () => {
      const { getByText } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByText(/Background checks and ID verification/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible feature icons', () => {
      const { getByTestId } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByTestId('icon-shield-check')).toBeTruthy();
      expect(getByTestId('icon-lock')).toBeTruthy();
      expect(getByTestId('icon-handshake')).toBeTruthy();
    });

    it('should have accessible action buttons', () => {
      const { getByTestId } = render(<WelcomeScreen navigation={mockNavigation} />);

      expect(getByTestId('get-started-button')).toBeTruthy();
      expect(getByTestId('welcome-back-to-login-button')).toBeTruthy();
    });
  });
});
