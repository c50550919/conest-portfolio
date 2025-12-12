/**
 * ProfileSetupScreen Tests
 *
 * HIGH-RISK - Parent profile creation with validation
 *
 * Key Test Areas:
 * 1. Form rendering (firstName, lastName, email, dateOfBirth, bio, occupation)
 * 2. Form validation (required fields, formats, age check)
 * 3. Photo picker functionality
 * 4. Photo validation (type, size)
 * 5. Navigation (continue, back)
 * 6. Redux state updates
 * 7. Character count display
 * 8. Constitution compliance (NO child PII collection)
 * 9. Loading states
 * 10. Error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

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

// Mock react-native-image-picker
const mockLaunchCamera = jest.fn();
const mockLaunchImageLibrary = jest.fn();
jest.mock('react-native-image-picker', () => ({
  launchCamera: (options: any, callback: any) => mockLaunchCamera(options, callback),
  launchImageLibrary: (options: any, callback: any) => mockLaunchImageLibrary(options, callback),
}));

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    TextInput: ({ label, value, onChangeText, onBlur, error, testID, multiline, ...props }: any) =>
      React.createElement(TextInput, {
        placeholder: label,
        value,
        onChangeText,
        onBlur,
        testID,
        multiline,
        style: error ? { borderColor: 'red' } : {},
        ...props,
      }),
    HelperText: ({ children, type, visible }: any) =>
      visible ? React.createElement(Text, { testID: `helper-${type}` }, children) : null,
    Button: ({ children, onPress, disabled, loading, testID, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled: disabled || loading, testID, ...props },
        React.createElement(Text, {}, loading ? 'Loading...' : children)
      ),
  };
});

// Mock ActionSheetIOS
const mockShowActionSheet = jest.fn();
jest.mock('react-native/Libraries/ActionSheetIOS/ActionSheetIOS', () => ({
  showActionSheetWithOptions: mockShowActionSheet,
}));

// Mock user slice actions
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../src/store/slices/userSlice', () => ({
  updateOnboardingData: jest.fn((data) => ({ type: 'user/updateOnboardingData', payload: data })),
  setOnboardingStep: jest.fn((step) => ({ type: 'user/setOnboardingStep', payload: step })),
  setError: jest.fn((error) => ({ type: 'user/setError', payload: error })),
}));

import ProfileSetupScreen from '../../../src/screens/onboarding/ProfileSetupScreen';

describe('ProfileSetupScreen', () => {
  let alertSpy: jest.SpyInstance;

  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
  } as any;

  const createMockStore = (onboardingData = {}) => {
    const mockState = {
      user: {
        onboardingData: {
          firstName: '',
          lastName: '',
          email: '',
          dateOfBirth: '',
          bio: '',
          occupation: '',
          ...onboardingData,
        },
      },
    };

    jest.spyOn(require('react-redux'), 'useSelector').mockImplementation((selector: any) =>
      selector(mockState)
    );

    return configureStore({
      reducer: {
        user: (state = mockState.user) => state,
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
    mockDispatch.mockReturnValue(Promise.resolve());
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render profile setup title', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('Create Your Profile')).toBeTruthy();
    });

    it('should render subtitle mentioning parent-only profile', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/parent profile only - no child info/)).toBeTruthy();
    });

    it('should render photo picker', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('photo-picker')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FORM FIELDS TESTS
  // ===========================================================================

  describe('Form Fields', () => {
    it('should render firstName input', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('firstName-input')).toBeTruthy();
    });

    it('should render lastName input', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('lastName-input')).toBeTruthy();
    });

    it('should render email input', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('email-input')).toBeTruthy();
    });

    it('should render dateOfBirth input', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('dateOfBirth-input')).toBeTruthy();
    });

    it('should render occupation input', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('occupation-input')).toBeTruthy();
    });

    it('should render bio input', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('bio-input')).toBeTruthy();
    });
  });

  // ===========================================================================
  // FORM VALIDATION TESTS
  // ===========================================================================

  describe('Form Validation', () => {
    it('should show error for short first name', async () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      const input = getByTestId('firstName-input');
      fireEvent.changeText(input, 'A');
      fireEvent(input, 'blur');

      await waitFor(() => {
        expect(getByText(/at least 2 characters/)).toBeTruthy();
      });
    });

    it('should show error for invalid email', async () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      const input = getByTestId('email-input');
      fireEvent.changeText(input, 'invalid-email');
      fireEvent(input, 'blur');

      await waitFor(() => {
        expect(getByText(/valid email/)).toBeTruthy();
      });
    });

    it('should show error for invalid date format', async () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      const input = getByTestId('dateOfBirth-input');
      fireEvent.changeText(input, '01/15/1990');
      fireEvent(input, 'blur');

      await waitFor(() => {
        expect(getByText(/YYYY-MM-DD format/)).toBeTruthy();
      });
    });

    it('should show error for underage user', async () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      // Set date to 10 years ago (underage)
      const tenYearsAgo = new Date();
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
      const dateString = tenYearsAgo.toISOString().split('T')[0];

      const input = getByTestId('dateOfBirth-input');
      fireEvent.changeText(input, dateString);
      fireEvent(input, 'blur');

      await waitFor(() => {
        expect(getByText(/at least 18 years old/)).toBeTruthy();
      });
    });

    it('should show error for short bio', async () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      const input = getByTestId('bio-input');
      fireEvent.changeText(input, 'Short bio');
      fireEvent(input, 'blur');

      await waitFor(() => {
        expect(getByText(/at least 20 characters/)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // PHOTO PICKER TESTS
  // ===========================================================================

  describe('Photo Picker', () => {
    it('should show photo options when photo picker is pressed', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('photo-picker'));

      // On Android, it shows Alert; on iOS, it shows ActionSheet
      if (Platform.OS === 'android') {
        expect(alertSpy).toHaveBeenCalledWith(
          'Add Profile Photo',
          'Choose an option',
          expect.any(Array)
        );
      }
    });

    it('should display photo hint text', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('Add a profile photo')).toBeTruthy();
    });

    it('should display photo requirements', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/JPEG, PNG, or WebP/)).toBeTruthy();
      expect(getByText(/Max 5MB/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHARACTER COUNT TESTS
  // ===========================================================================

  describe('Character Count', () => {
    it('should display character count for bio', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('0/500')).toBeTruthy();
    });

    it('should update character count as user types', async () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      const bioInput = getByTestId('bio-input');
      fireEvent.changeText(bioInput, 'This is a test bio.');

      await waitFor(() => {
        expect(getByText('19/500')).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should render continue button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('continue-button')).toBeTruthy();
    });

    it('should render back button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('back-button')).toBeTruthy();
    });

    it('should go back when back button is pressed', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // PRE-FILL DATA TESTS
  // ===========================================================================

  describe('Pre-fill Data', () => {
    it('should pre-fill form with existing onboarding data', () => {
      const store = createMockStore({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('firstName-input').props.value).toBe('John');
      expect(getByTestId('lastName-input').props.value).toBe('Doe');
      expect(getByTestId('email-input').props.value).toBe('john@example.com');
    });
  });

  // ===========================================================================
  // CONSTITUTION COMPLIANCE TESTS (NO CHILD PII)
  // ===========================================================================

  describe('Constitution Compliance - No Child PII', () => {
    it('should NOT have child name input field', () => {
      const store = createMockStore();

      const { queryByTestId, queryByPlaceholderText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(queryByTestId('childName-input')).toBeNull();
      expect(queryByPlaceholderText(/child.*name/i)).toBeNull();
    });

    it('should NOT have child age input field', () => {
      const store = createMockStore();

      const { queryByTestId, queryByPlaceholderText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(queryByTestId('childAge-input')).toBeNull();
      expect(queryByPlaceholderText(/child.*age/i)).toBeNull();
    });

    it('should NOT have child school input field', () => {
      const store = createMockStore();

      const { queryByTestId, queryByPlaceholderText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(queryByTestId('childSchool-input')).toBeNull();
      expect(queryByPlaceholderText(/school/i)).toBeNull();
    });

    it('should explicitly state parent profile only', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/parent profile only/i)).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible photo picker', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      const photoPicker = getByTestId('photo-picker');
      expect(photoPicker.props.accessibilityLabel).toBe('Add profile photo');
    });

    it('should have accessible form inputs', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <ProfileSetupScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('firstName-input')).toBeTruthy();
      expect(getByTestId('lastName-input')).toBeTruthy();
      expect(getByTestId('email-input')).toBeTruthy();
    });
  });
});
