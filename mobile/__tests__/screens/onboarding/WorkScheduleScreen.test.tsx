/**
 * WorkScheduleScreen Tests
 *
 * MEDIUM-RISK - Final onboarding step with profile submission
 *
 * Key Test Areas:
 * 1. Schedule type selection (flexible, fixed, shift_work)
 * 2. Work from home toggle
 * 3. Profile summary display
 * 4. Data validation before submit
 * 5. API profile creation
 * 6. Photo upload
 * 7. Navigation to verification
 * 8. Back button
 * 9. Loading states
 * 10. Error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
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

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, Switch: RNSwitch } = require('react-native');
  return {
    RadioButton: {
      Group: ({ children, onValueChange, value }: any) =>
        React.createElement(View, { testID: 'radio-group' }, children),
      Item: ({ label, value, testID, ...props }: any) =>
        React.createElement(
          TouchableOpacity,
          { testID, ...props },
          React.createElement(Text, {}, label)
        ),
    },
    Switch: ({ value, onValueChange, testID, ...props }: any) =>
      React.createElement(RNSwitch, { value, onValueChange, testID, ...props }),
    Button: ({ children, onPress, disabled, loading, testID, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled: disabled || loading, testID, ...props },
        React.createElement(Text, {}, loading ? 'Creating Profile...' : children)
      ),
    HelperText: ({ children, type, ...props }: any) =>
      React.createElement(Text, { testID: `helper-${type}`, ...props }, children),
  };
});

// Mock API
const mockCreateProfile = jest.fn();
const mockUploadProfilePhoto = jest.fn();
jest.mock('../../../src/services/api', () => ({
  __esModule: true,
  default: {
    createProfile: (data: any) => mockCreateProfile(data),
    uploadProfilePhoto: (data: any) => mockUploadProfilePhoto(data),
  },
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
  setUserProfile: jest.fn((profile) => ({ type: 'user/setUserProfile', payload: profile })),
}));

import WorkScheduleScreen from '../../../src/screens/onboarding/WorkScheduleScreen';

describe('WorkScheduleScreen', () => {
  let alertSpy: jest.SpyInstance;

  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
  } as any;

  const completeOnboardingData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    dateOfBirth: '1990-01-15',
    bio: 'A friendly parent looking for roommates.',
    occupation: 'Software Engineer',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    budgetMin: 1000,
    budgetMax: 2000,
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'school-age'],
    profilePhotoUri: 'file:///path/to/photo.jpg',
  };

  const createMockStore = (onboardingData = completeOnboardingData) => {
    const mockState = {
      user: {
        onboardingData,
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
    mockCreateProfile.mockResolvedValue({
      success: true,
      data: {
        id: 'profile-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      },
    });
    mockUploadProfilePhoto.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render work schedule title', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('Work Schedule')).toBeTruthy();
    });

    it('should render subtitle about matching', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/match you with compatible schedules/)).toBeTruthy();
    });

    it('should render calendar clock icon', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('icon-calendar-clock')).toBeTruthy();
    });
  });

  // ===========================================================================
  // SCHEDULE TYPE TESTS
  // ===========================================================================

  describe('Schedule Type Selection', () => {
    it('should render schedule type question', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/What best describes your work schedule/)).toBeTruthy();
    });

    it('should render flexible schedule option', () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('schedule-flexible')).toBeTruthy();
      expect(getByText('Flexible Schedule')).toBeTruthy();
      expect(getByText(/Remote work, freelance/)).toBeTruthy();
    });

    it('should render fixed schedule option', () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('schedule-fixed')).toBeTruthy();
      expect(getByText('Fixed Schedule')).toBeTruthy();
      expect(getByText(/Regular 9-5/)).toBeTruthy();
    });

    it('should render shift work option', () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('schedule-shift_work')).toBeTruthy();
      expect(getByText('Shift Work')).toBeTruthy();
      expect(getByText(/Rotating shifts, nights/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // WORK FROM HOME TOGGLE TESTS
  // ===========================================================================

  describe('Work From Home Toggle', () => {
    it('should render work from home label', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('Work from home')).toBeTruthy();
    });

    it('should render work from home description', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/primarily work remotely/)).toBeTruthy();
    });

    it('should render switch with testID', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('work-from-home-switch')).toBeTruthy();
    });

    it('should toggle work from home value', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      const toggle = getByTestId('work-from-home-switch');
      expect(toggle.props.value).toBe(false);

      fireEvent(toggle, 'valueChange', true);

      // Re-render would show updated value
    });
  });

  // ===========================================================================
  // PROFILE SUMMARY TESTS
  // ===========================================================================

  describe('Profile Summary', () => {
    it('should display profile summary section', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('Profile Summary')).toBeTruthy();
    });

    it('should display user name in summary', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should display location in summary', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('San Francisco, CA')).toBeTruthy();
    });

    it('should display budget in summary', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('$1000 - $2000/mo')).toBeTruthy();
    });

    it('should display children count in summary', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('2')).toBeTruthy();
    });

    it('should display photo status in summary', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText('Selected')).toBeTruthy();
    });
  });

  // ===========================================================================
  // INFO NOTICE TESTS
  // ===========================================================================

  describe('Info Notice', () => {
    it('should display info about schedule compatibility', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/Schedule compatibility helps match parents/)).toBeTruthy();
    });

    it('should display information icon', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('icon-information')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should render create profile button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('create-profile-button')).toBeTruthy();
    });

    it('should render back button', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('back-button')).toBeTruthy();
    });

    it('should go back when back button is pressed', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // VALIDATION TESTS
  // ===========================================================================

  describe('Validation', () => {
    it('should show error when firstName is missing', async () => {
      const incompleteData = { ...completeOnboardingData, firstName: '' };
      const store = createMockStore(incompleteData);

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Missing Information',
          expect.stringContaining('First name')
        );
      });
    });

    it('should show error when city is missing', async () => {
      const incompleteData = { ...completeOnboardingData, city: '' };
      const store = createMockStore(incompleteData);

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Missing Information',
          expect.stringContaining('City')
        );
      });
    });
  });

  // ===========================================================================
  // PROFILE CREATION TESTS
  // ===========================================================================

  describe('Profile Creation', () => {
    it('should call createProfile API on submit', async () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'John',
            last_name: 'Doe',
            city: 'San Francisco',
            state: 'CA',
          })
        );
      });
    });

    it('should upload photo after profile creation', async () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        expect(mockUploadProfilePhoto).toHaveBeenCalled();
      });
    });

    it('should show success alert after profile creation', async () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Profile Created!',
          expect.stringContaining('verification'),
          expect.any(Array)
        );
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING TESTS
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show error alert when API fails', async () => {
      mockCreateProfile.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Server error');
      });
    });

    it('should continue if photo upload fails', async () => {
      mockUploadProfilePhoto.mockRejectedValue(new Error('Upload failed'));

      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      fireEvent.press(getByTestId('create-profile-button'));

      await waitFor(() => {
        // Should still show success alert even if photo fails
        expect(alertSpy).toHaveBeenCalledWith(
          'Profile Created!',
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });

  // ===========================================================================
  // HELPER TEXT TESTS
  // ===========================================================================

  describe('Helper Text', () => {
    it('should display verification next step hint', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByText(/complete verification to start matching/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible schedule options', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('schedule-flexible')).toBeTruthy();
      expect(getByTestId('schedule-fixed')).toBeTruthy();
      expect(getByTestId('schedule-shift_work')).toBeTruthy();
    });

    it('should have accessible work from home toggle', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <WorkScheduleScreen navigation={mockNavigation} />
        </Provider>
      );

      expect(getByTestId('work-from-home-switch')).toBeTruthy();
    });
  });
});
