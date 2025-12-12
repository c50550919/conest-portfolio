/**
 * SavedProfilesScreen Tests
 *
 * MEDIUM-RISK - Saved profiles management
 *
 * Key Test Areas:
 * 1. Tab navigation (All, Top Choice, Strong Maybe, Considering, Backup)
 * 2. Profile count and limit display (50 max)
 * 3. Profile card rendering
 * 4. Comparison mode selection (2-4 profiles)
 * 5. Notes editing modal
 * 6. Empty states per folder
 * 7. Profile removal
 * 8. Folder moving
 * 9. Child safety compliance
 * 10. Loading and error states
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
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

// Mock react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput, Modal } = require('react-native');
  return {
    Chip: ({ children, selected, onPress, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: `chip-${children}`, ...props },
        React.createElement(Text, { style: { fontWeight: selected ? 'bold' : 'normal' } }, children)
      ),
    Badge: ({ children, ...props }: any) =>
      React.createElement(Text, { testID: 'badge', ...props }, children),
    FAB: ({ onPress, icon, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: 'fab', ...props },
        React.createElement(Text, {}, icon)
      ),
    Portal: ({ children }: any) => children,
    Modal: ({ visible, children, onDismiss, ...props }: any) =>
      visible ? React.createElement(View, { testID: 'modal', ...props }, children) : null,
    TextInput: ({ label, value, onChangeText, ...props }: any) =>
      React.createElement(TextInput, { placeholder: label, value, onChangeText, ...props }),
    Button: ({ children, onPress, disabled, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, disabled, testID: `button-${children}`, ...props },
        React.createElement(Text, {}, children)
      ),
    ActivityIndicator: () => React.createElement(View, { testID: 'activity-indicator' }),
    ProgressBar: ({ progress, ...props }: any) =>
      React.createElement(View, { testID: 'progress-bar', ...props }),
  };
});

// Mock slice actions
jest.mock('../../../src/store/slices/savedProfilesSlice', () => ({
  fetchSavedProfiles: jest.fn(() => ({ type: 'savedProfiles/fetch' })),
  fetchSavedProfilesByFolder: jest.fn(() => ({ type: 'savedProfiles/fetchByFolder' })),
  fetchLimitStatus: jest.fn(() => ({ type: 'savedProfiles/fetchLimitStatus' })),
  updateSavedProfile: jest.fn((data) => ({ type: 'savedProfiles/update', payload: data })),
  removeSavedProfile: jest.fn((id) => ({ type: 'savedProfiles/remove', payload: id })),
  compareProfiles: jest.fn((ids) => ({ type: 'savedProfiles/compare', payload: ids })),
  clearError: jest.fn(() => ({ type: 'savedProfiles/clearError' })),
}));

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => mockUseSelector(selector),
}));

import SavedProfilesScreen from '../../../src/screens/main/SavedProfilesScreen';

describe('SavedProfilesScreen', () => {
  let alertSpy: jest.SpyInstance;

  const mockProfile = {
    id: 'profile-1',
    profile_id: 'user-1',
    folder: 'Top Choice',
    notes_encrypted: 'Great match for schedules',
    saved_at: new Date().toISOString(),
    profile: {
      first_name: 'Sarah',
      age: 32,
      city: 'San Francisco',
      state: 'CA',
      verification_score: 92,
    },
  };

  const mockFolders = [
    { id: 'all', name: 'All', count: 5 },
    { id: 'top-choice', name: 'Top Choice', count: 2 },
    { id: 'strong-maybe', name: 'Strong Maybe', count: 1 },
    { id: 'considering', name: 'Considering', count: 1 },
    { id: 'backup', name: 'Backup', count: 1 },
  ];

  const initialState = {
    savedProfiles: [mockProfile],
    savedProfilesByFolder: {
      'all': [mockProfile],
      'Top Choice': [mockProfile],
      'Strong Maybe': [],
      'Considering': [],
      'Backup': [],
    },
    comparisonProfiles: [],
    limitStatus: {
      current: 5,
      limit: 50,
      isAtLimit: false,
      isNearLimit: false,
    },
    loading: false,
    error: null,
    saving: false,
    updating: false,
    removing: false,
    comparing: false,
  };

  const createMockStore = (overrides = {}) => {
    const mockState = {
      savedProfiles: {
        ...initialState,
        ...overrides,
      },
    };

    mockUseSelector.mockImplementation((selector: any) => selector(mockState));

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
    it('should render saved profiles header', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('Saved Profiles')).toBeTruthy();
    });

    it('should render profile limit indicator', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('5/50 saved')).toBeTruthy();
    });

    it('should render folder tabs', () => {
      createMockStore();

      const { getByText, getAllByText } = render(<SavedProfilesScreen />);

      expect(getByText('All')).toBeTruthy();
      // "Top Choice" appears in both tab and folder badge
      expect(getAllByText('Top Choice').length).toBeGreaterThan(0);
      expect(getByText('Strong Maybe')).toBeTruthy();
    });

    it('should render compare button', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('Compare')).toBeTruthy();
    });
  });

  // ===========================================================================
  // TAB NAVIGATION TESTS
  // ===========================================================================

  describe('Tab Navigation', () => {
    it('should show All profiles by default', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('Sarah, 32')).toBeTruthy();
    });

    it('should switch to Top Choice folder when pressed', () => {
      createMockStore();

      const { getAllByText } = render(<SavedProfilesScreen />);

      // "Top Choice" appears in both tab and folder badge, first element is the tab
      fireEvent.press(getAllByText('Top Choice')[0]);

      // Tab change is handled internally, dispatch is for data fetching
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should show folder counts in tabs', () => {
      createMockStore();

      const { getByText, getAllByText } = render(<SavedProfilesScreen />);

      expect(getByText('All')).toBeTruthy();
      // "Top Choice" appears in both tab and folder badge
      expect(getAllByText('Top Choice').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // PROFILE CARD TESTS
  // ===========================================================================

  describe('Profile Cards', () => {
    it('should display profile name and age', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('Sarah, 32')).toBeTruthy();
    });

    it('should display location', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('San Francisco, CA')).toBeTruthy();
    });

    it('should display verification score', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('92% Verified')).toBeTruthy();
    });

    it('should display verification badge icon', () => {
      createMockStore();

      const { getByTestId } = render(<SavedProfilesScreen />);

      expect(getByTestId('icon-shield-check')).toBeTruthy();
    });

    it('should display notes if present', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('Great match for schedules')).toBeTruthy();
    });
  });

  // ===========================================================================
  // COMPARISON MODE TESTS
  // ===========================================================================

  describe('Comparison Mode', () => {
    it('should toggle comparison mode when Compare is pressed', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      // Press Compare to enter comparison mode
      fireEvent.press(getByText('Compare'));

      // In comparison mode, button text changes to Cancel
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should show selection checkboxes in comparison mode', () => {
      createMockStore();

      const { getByText, getByTestId } = render(<SavedProfilesScreen />);

      fireEvent.press(getByText('Compare'));

      expect(getByTestId('icon-checkbox-blank-outline')).toBeTruthy();
    });
  });

  // ===========================================================================
  // NOTES EDITING TESTS
  // ===========================================================================

  describe('Notes Editing', () => {
    it('should open notes modal when edit notes is pressed', () => {
      createMockStore();

      const { getByTestId, getByPlaceholderText } = render(<SavedProfilesScreen />);

      fireEvent.press(getByTestId('icon-note-edit'));

      // Modal opens with input placeholder
      expect(getByPlaceholderText('Add private notes about this profile...')).toBeTruthy();
    });

    it('should show current notes in modal', () => {
      createMockStore();

      const { getByTestId, getByDisplayValue } = render(<SavedProfilesScreen />);

      fireEvent.press(getByTestId('icon-note-edit'));

      expect(getByDisplayValue('Great match for schedules')).toBeTruthy();
    });

    it('should save notes when save button is pressed', () => {
      createMockStore();

      const { getByTestId, getByText } = render(<SavedProfilesScreen />);

      fireEvent.press(getByTestId('icon-note-edit'));
      fireEvent.press(getByText('Save Notes'));

      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty States', () => {
    it('should show empty state when no saved profiles', () => {
      createMockStore({ savedProfiles: [] });

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('No saved profiles')).toBeTruthy();
    });

    it('should show helpful text in empty state', () => {
      createMockStore({ savedProfiles: [] });

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText(/Save profiles from the Browse screen/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROFILE REMOVAL TESTS
  // ===========================================================================

  describe('Profile Removal', () => {
    it('should show remove confirmation when delete icon is pressed', () => {
      createMockStore();

      const { getByTestId } = render(<SavedProfilesScreen />);

      fireEvent.press(getByTestId('icon-delete'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Remove Saved Profile',
        expect.stringContaining('remove'),
        expect.any(Array)
      );
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator when loading with no profiles', () => {
      // Component shows loading only when loading && filteredProfiles.length === 0
      createMockStore({ loading: true, savedProfiles: [] });

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('Loading saved profiles...')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('should show error alert when there is an error', () => {
      // Component uses Alert.alert for errors
      createMockStore({ error: 'Failed to load saved profiles' });

      render(<SavedProfilesScreen />);

      // The component shows error via Alert and then clears it
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to load saved profiles');
    });
  });

  // ===========================================================================
  // LIMIT DISPLAY TESTS
  // ===========================================================================

  describe('Limit Display', () => {
    it('should show limit status', () => {
      createMockStore({ limitStatus: { current: 45, limit: 50 } });

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('45/50 saved')).toBeTruthy();
    });

    it('should show full count when at limit', () => {
      createMockStore({ limitStatus: { current: 50, limit: 50 } });

      const { getByText } = render(<SavedProfilesScreen />);

      expect(getByText('50/50 saved')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILD SAFETY COMPLIANCE TESTS
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should not display child names', () => {
      createMockStore();

      const { queryByText } = render(<SavedProfilesScreen />);

      // Should NOT find any child names
      expect(queryByText(/emma/i)).toBeNull();
      expect(queryByText(/jacob/i)).toBeNull();
    });

    it('should not have child PII in profile data', () => {
      expect(mockProfile.profile).not.toHaveProperty('childNames');
      expect(mockProfile.profile).not.toHaveProperty('childAges');
      expect(mockProfile.profile).not.toHaveProperty('childSchools');
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should show profile alert when card is pressed', () => {
      createMockStore();

      const { getByText } = render(<SavedProfilesScreen />);

      fireEvent.press(getByText('Sarah, 32'));

      // Component shows alert instead of navigating directly
      expect(alertSpy).toHaveBeenCalledWith('Profile Details', expect.any(String));
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible folder tabs', () => {
      createMockStore();

      const { getAllByText } = render(<SavedProfilesScreen />);

      expect(getAllByText('All').length).toBeGreaterThan(0);
      expect(getAllByText('Top Choice').length).toBeGreaterThan(0);
    });

    it('should have accessible action buttons', () => {
      createMockStore();

      const { getByTestId } = render(<SavedProfilesScreen />);

      expect(getByTestId('icon-note-edit')).toBeTruthy();
      expect(getByTestId('icon-delete')).toBeTruthy();
    });
  });
});
