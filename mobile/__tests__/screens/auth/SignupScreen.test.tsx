/**
 * SignupScreen Tests
 *
 * HIGH-RISK - User acquisition bottleneck
 *
 * Key Test Areas:
 * 1. Form validation (name, email, phone, password)
 * 2. Password strength validation
 * 3. Signup submission and API integration
 * 4. Error handling and display
 * 5. Navigation to Login and Phone Verification
 * 6. CRITICAL: Child safety - NO child data inputs
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../src/store/slices/authSlice';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

// Mock theme
jest.mock('@theme', () => ({
  theme: {
    colors: {
      primary: '#FF6B6B',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      onPrimary: '#FFFFFF',
      onSurface: '#000000',
      onSurfaceVariant: '#666666',
      outline: '#CCCCCC',
      error: '#D32F2F',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
  },
}));

// Mock auth API
const mockRegister = jest.fn();
jest.mock('@services/api/auth', () => ({
  __esModule: true,
  default: {
    register: (params: any) => mockRegister(params),
  },
}));

import SignupScreen from '../../../src/screens/auth/SignupScreen';

describe('SignupScreen', () => {
  let store: ReturnType<typeof configureStore>;
  let alertSpy: jest.SpyInstance;

  const createStore = () => {
    return configureStore({
      reducer: {
        auth: authReducer,
      },
    });
  };

  const renderScreen = () => {
    store = createStore();
    return render(
      <Provider store={store}>
        <SignupScreen />
      </Provider>
    );
  };

  const fillValidForm = (getByTestId: any) => {
    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('phone-input'), '5551234567');
    fireEvent.changeText(getByTestId('password-input'), 'ValidPass123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'ValidPass123');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
    mockRegister.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profileComplete: false,
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // CRITICAL: CHILD SAFETY COMPLIANCE TESTS (Constitution Principle I)
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should NOT have any input for child names', () => {
      const { queryByTestId, queryByText } = renderScreen();

      expect(queryByTestId('child-name-input')).toBeNull();
      expect(queryByText(/child.*name/i)).toBeNull();
    });

    it('should NOT have any input for child ages', () => {
      const { queryByTestId, queryByText } = renderScreen();

      expect(queryByTestId('child-age-input')).toBeNull();
      expect(queryByText(/child.*age/i)).toBeNull();
    });

    it('should NOT have any input for child photos', () => {
      const { queryByTestId, queryByText } = renderScreen();

      expect(queryByTestId('child-photo-input')).toBeNull();
      expect(queryByText(/child.*photo/i)).toBeNull();
    });

    it('should NOT have any input for child school info', () => {
      const { queryByTestId, queryByText } = renderScreen();

      expect(queryByTestId('child-school-input')).toBeNull();
      expect(queryByText(/school/i)).toBeNull();
    });

    it('should NOT have any input for children count on signup', () => {
      // Children count is collected during onboarding, NOT signup
      const { queryByTestId, queryByText } = renderScreen();

      expect(queryByTestId('children-count-input')).toBeNull();
      expect(queryByText(/children/i)).toBeNull();
    });
  });

  // ===========================================================================
  // RENDER TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render the signup screen', () => {
      const { getByText } = renderScreen();

      expect(getByText('CoNest')).toBeTruthy();
      expect(getByText('Create your account')).toBeTruthy();
    });

    it('should render all required input fields', () => {
      const { getByTestId, getByText } = renderScreen();

      expect(getByTestId('first-name-input')).toBeTruthy();
      expect(getByTestId('last-name-input')).toBeTruthy();
      expect(getByTestId('email-input')).toBeTruthy();
      expect(getByTestId('phone-input')).toBeTruthy();
      expect(getByTestId('password-input')).toBeTruthy();
      expect(getByTestId('confirm-password-input')).toBeTruthy();
    });

    it('should render signup button', () => {
      const { getByTestId, getByText } = renderScreen();

      expect(getByTestId('signup-button')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
    });

    it('should render login link', () => {
      const { getByTestId, getByText } = renderScreen();

      expect(getByTestId('login-link')).toBeTruthy();
      expect(getByText('Already have an account?')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Form Validation', () => {
    it('should show error for empty first name', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText('First name is required')).toBeTruthy();
      });
    });

    it('should show error for short first name', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.changeText(getByTestId('first-name-input'), 'A');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText('First name must be at least 2 characters')).toBeTruthy();
      });
    });

    it('should show error for invalid email', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.changeText(getByTestId('first-name-input'), 'John');
      fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
      fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText('Invalid email format')).toBeTruthy();
      });
    });

    it('should show error for invalid phone number', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.changeText(getByTestId('first-name-input'), 'John');
      fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
      fireEvent.changeText(getByTestId('phone-input'), '123');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText('Invalid phone number (10 digits required)')).toBeTruthy();
      });
    });

    it('should show error for weak password', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.changeText(getByTestId('first-name-input'), 'John');
      fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
      fireEvent.changeText(getByTestId('phone-input'), '5551234567');
      fireEvent.changeText(getByTestId('password-input'), 'weak');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(
          getByText('Password must be at least 8 characters with uppercase, lowercase, and number')
        ).toBeTruthy();
      });
    });

    it('should show error when passwords do not match', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.changeText(getByTestId('first-name-input'), 'John');
      fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
      fireEvent.changeText(getByTestId('phone-input'), '5551234567');
      fireEvent.changeText(getByTestId('password-input'), 'ValidPass123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'DifferentPass123');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText('Passwords do not match')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PASSWORD STRENGTH TESTS
  // ===========================================================================

  describe('Password Strength', () => {
    it('should accept password with uppercase, lowercase, and number', async () => {
      const { getByTestId, queryByText } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(queryByText(/password must be/i)).toBeNull();
      });
    });

    it('should reject password without uppercase', async () => {
      const { getByTestId, getByText } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.changeText(getByTestId('password-input'), 'validpass123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'validpass123');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText(/password must be/i)).toBeTruthy();
      });
    });

    it('should reject password without lowercase', async () => {
      const { getByTestId, getByText } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.changeText(getByTestId('password-input'), 'VALIDPASS123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'VALIDPASS123');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText(/password must be/i)).toBeTruthy();
      });
    });

    it('should reject password without number', async () => {
      const { getByTestId, getByText } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.changeText(getByTestId('password-input'), 'ValidPassNoNum');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'ValidPassNoNum');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText(/password must be/i)).toBeTruthy();
      });
    });

    it('should reject password shorter than 8 characters', async () => {
      const { getByTestId, getByText } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.changeText(getByTestId('password-input'), 'Abc123');
      fireEvent.changeText(getByTestId('confirm-password-input'), 'Abc123');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(getByText(/password must be/i)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // SIGNUP SUBMISSION TESTS
  // ===========================================================================

  describe('Signup Submission', () => {
    it('should call register API with correct data', async () => {
      const { getByTestId } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '5551234567',
          password: 'ValidPass123',
        });
      });
    });

    it('should strip non-digits from phone number', async () => {
      const { getByTestId } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.changeText(getByTestId('phone-input'), '(555) 123-4567');
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            phone: '5551234567',
          })
        );
      });
    });

    it('should navigate to PhoneVerification on success', async () => {
      const { getByTestId } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PhoneVerification', {
          phone: '5551234567',
        });
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show alert on signup failure', async () => {
      mockRegister.mockRejectedValue({
        response: { data: { message: 'Email already exists' } },
      });

      const { getByTestId } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Signup Error', 'Email already exists');
      });
    });

    it('should show generic error on unknown error', async () => {
      mockRegister.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderScreen();

      fillValidForm(getByTestId);
      fireEvent.press(getByTestId('signup-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Signup Error', 'Signup failed. Please try again.');
      });
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should navigate to Login when login link is pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId('login-link'));

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  // ===========================================================================
  // INPUT FIELD TESTS
  // ===========================================================================

  describe('Input Fields', () => {
    it('should have secure text entry for password fields', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('password-input').props.secureTextEntry).toBe(true);
      expect(getByTestId('confirm-password-input').props.secureTextEntry).toBe(true);
    });

    it('should have phone-pad keyboard for phone input', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('phone-input').props.keyboardType).toBe('phone-pad');
    });

    it('should have email-address keyboard for email input', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('email-input').props.keyboardType).toBe('email-address');
    });

    it('should have autoCapitalize words for name inputs', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId('first-name-input').props.autoCapitalize).toBe('words');
      expect(getByTestId('last-name-input').props.autoCapitalize).toBe('words');
    });
  });
});
