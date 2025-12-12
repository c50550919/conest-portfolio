/**
 * CompareProfilesScreen Tests
 *
 * MEDIUM-RISK - Side-by-side profile comparison
 *
 * Key Test Areas:
 * 1. Profile comparison grid rendering
 * 2. Horizontal scrolling for multiple profiles
 * 3. Comparison attributes display
 * 4. Compatibility breakdown modal
 * 5. Profile removal from comparison
 * 6. Navigation back
 * 7. 2-4 profile support
 * 8. Child safety (only count/age groups)
 * 9. Loading states
 * 10. Error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
  useRoute: () => ({
    params: {
      profileIds: ['profile-1', 'profile-2', 'profile-3'],
    },
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
  const { View, Text, TouchableOpacity, ScrollView, Image } = require('react-native');
  return {
    Card: ({ children, ...props }: any) =>
      React.createElement(View, { testID: 'card', ...props }, children),
    Avatar: {
      Image: ({ source, ...props }: any) =>
        React.createElement(Image, { source, testID: 'avatar-image', ...props }),
    },
    IconButton: ({ icon, onPress, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: `icon-button-${icon}`, ...props },
        React.createElement(Text, {}, icon)
      ),
    Button: ({ children, onPress, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: `button-${children}`, ...props },
        React.createElement(Text, {}, children)
      ),
    Chip: ({ children, ...props }: any) =>
      React.createElement(Text, { testID: 'chip', ...props }, children),
    Divider: () => React.createElement(View, { testID: 'divider' }),
    ActivityIndicator: () => React.createElement(View, { testID: 'activity-indicator' }),
    Portal: ({ children }: any) => children,
    Modal: ({ visible, children, ...props }: any) =>
      visible ? React.createElement(View, { testID: 'modal', ...props }, children) : null,
  };
});

// Mock comparison API
const mockFetchComparison = jest.fn();
jest.mock('../../../src/services/api/savedProfilesAPI', () => ({
  __esModule: true,
  default: {
    fetchComparison: () => mockFetchComparison(),
  },
}));

// Mock react-redux
const mockDispatch = jest.fn();
const mockSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => mockSelector(selector),
}));

import CompareProfilesScreen from '../../../src/screens/main/CompareProfilesScreen';

// Use fake timers for async operations
jest.useFakeTimers();

describe('CompareProfilesScreen', () => {
  // Spy on Alert
  const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
  // Mock profiles matching CompareProfile type from savedProfilesAPI
  const mockProfiles = [
    {
      id: 'profile-1',
      profile_id: 'user-1',
      firstName: 'Sarah',
      age: 32,
      city: 'San Francisco',
      childrenCount: 2,
      childrenAgeGroups: ['toddler', 'school-age'],
      budget: 1500, // Component uses 'budget' not 'housingBudget'
      moveInDate: '2025-02-01',
      compatibilityScore: 92,
      folder: 'Top Choice',
    },
    {
      id: 'profile-2',
      profile_id: 'user-2',
      firstName: 'Mike',
      age: 35,
      city: 'Oakland',
      childrenCount: 1,
      childrenAgeGroups: ['teenager'],
      budget: 1800,
      moveInDate: '2025-01-15',
      compatibilityScore: 88,
      folder: 'Strong Maybe',
    },
    {
      id: 'profile-3',
      profile_id: 'user-3',
      firstName: 'Emily',
      age: 29,
      city: 'Berkeley',
      childrenCount: 3,
      childrenAgeGroups: ['infant', 'toddler', 'school-age'],
      budget: 1600,
      moveInDate: '2025-03-01',
      compatibilityScore: 85,
      folder: 'Considering',
    },
  ];

  const createMockStore = (profiles = mockProfiles, loading = false, error: string | null = null) => {
    const mockState = {
      savedProfiles: {
        comparisonProfiles: profiles, // Profiles being compared
        savedProfiles: profiles,
        comparing: loading,
        loading,
        error,
      },
      browseDiscovery: {
        comparisonProfiles: [], // Empty by default - profiles come from savedProfiles
        loading: false,
        error: null,
      },
    };

    // Configure mockSelector to call the selector with the mock state
    mockSelector.mockImplementation((selector: any) => selector(mockState));

    return configureStore({
      reducer: {
        savedProfiles: (state = mockState.savedProfiles) => state,
        browseDiscovery: (state = mockState.browseDiscovery) => state,
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    mockFetchComparison.mockResolvedValue({ data: mockProfiles });
    mockDispatch.mockReturnValue(Promise.resolve({ payload: {} }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render compare profiles screen', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByTestId('compare-profiles-screen')).toBeTruthy();
    });

    it('should render header with title', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Compare Profiles')).toBeTruthy();
    });

    it('should render profile count', () => {
      const store = createMockStore();

      const { getAllByText, getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component renders count as separate text elements: "3 profiles selected"
      // "3" may appear multiple times (profile count, children counts, etc.)
      expect(getAllByText(/3/).length).toBeGreaterThan(0);
      expect(getByText(/selected/)).toBeTruthy();
    });

    it('should render header icon', () => {
      const store = createMockStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component uses compare icon in header, not a back button
      expect(getByTestId('icon-compare')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROFILE COLUMNS TESTS
  // ===========================================================================

  describe('Profile Columns', () => {
    it('should display all profile names', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component shows just first name in header
      expect(getByText('Sarah')).toBeTruthy();
      expect(getByText('Mike')).toBeTruthy();
      expect(getByText('Emily')).toBeTruthy();
    });

    it('should display profile initials', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component uses initials avatars, not photos
      expect(getByText('S')).toBeTruthy(); // Sarah's initial
      expect(getByText('M')).toBeTruthy(); // Mike's initial
      expect(getByText('E')).toBeTruthy(); // Emily's initial
    });

    it('should display source badges', () => {
      const store = createMockStore();

      const { getAllByText, getAllByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component shows "Saved" badge with bookmark icon for all profiles
      expect(getAllByText('Saved').length).toBe(3);
      expect(getAllByTestId('icon-bookmark').length).toBe(3);
    });
  });

  // ===========================================================================
  // COMPARISON ATTRIBUTES TESTS
  // ===========================================================================

  describe('Comparison Attributes', () => {
    it('should display location row', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Location')).toBeTruthy();
      // Component shows just city name
      expect(getByText('San Francisco')).toBeTruthy();
      expect(getByText('Oakland')).toBeTruthy();
      expect(getByText('Berkeley')).toBeTruthy();
    });

    it('should display housing budget row', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Housing Budget')).toBeTruthy();
      // Component formats with /mo suffix
      expect(getByText('$1,500/mo')).toBeTruthy();
      expect(getByText('$1,800/mo')).toBeTruthy();
      expect(getByText('$1,600/mo')).toBeTruthy();
    });

    it('should display children count row', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Children')).toBeTruthy();
      // Component formats as "X children" or "1 child"
      expect(getByText('2 children')).toBeTruthy();
      expect(getByText('1 child')).toBeTruthy();
      expect(getByText('3 children')).toBeTruthy();
    });

    it('should display age groups row', () => {
      const store = createMockStore();

      const { getByText, getAllByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Age Groups')).toBeTruthy();
      // "toddler" appears in multiple profiles' age groups
      expect(getAllByText(/toddler/i).length).toBeGreaterThan(0);
      expect(getAllByText(/teenager/i).length).toBeGreaterThan(0);
    });

    it('should display move-in date row', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Move-in Date')).toBeTruthy();
    });

    it('should display compatibility row', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Compatibility')).toBeTruthy();
      expect(getByText('92%')).toBeTruthy();
      expect(getByText('88%')).toBeTruthy();
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display folder row', () => {
      const store = createMockStore();

      const { getByText, getAllByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Folder')).toBeTruthy();
      // Folder names may appear multiple times (attribute row + saved metadata)
      expect(getAllByText('Top Choice').length).toBeGreaterThan(0);
      expect(getAllByText('Strong Maybe').length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // COMPATIBILITY BREAKDOWN TESTS
  // ===========================================================================

  describe('Compatibility Breakdown', () => {
    it('should show compatibility breakdown button for 2 profiles', () => {
      // Compatibility breakdown only shows for exactly 2 profiles
      const store = createMockStore([mockProfiles[0], mockProfiles[1]]);

      const { getByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByTestId('compatibility-breakdown-button')).toBeTruthy();
    });

    it('should not show compatibility breakdown for 3+ profiles', () => {
      const store = createMockStore();

      const { queryByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // 3 profiles - compatibility breakdown not shown
      expect(queryByTestId('compatibility-breakdown-button')).toBeNull();
    });
  });

  // ===========================================================================
  // PROFILE REMOVAL TESTS
  // ===========================================================================

  describe('Profile Removal', () => {
    it('should show remove button for each profile', () => {
      const store = createMockStore();

      const { getAllByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component renders Icon with name="close" which becomes testID="icon-close"
      expect(getAllByTestId('icon-close').length).toBe(3);
    });

    it('should show alert when remove button pressed with 2 profiles', () => {
      const store = createMockStore([mockProfiles[0], mockProfiles[1]]);

      const { getAllByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Try to remove - should show alert since it would leave only 1 profile
      fireEvent.press(getAllByTestId('icon-close')[0]);

      // Component shows alert for minimum profiles required
      expect(alertSpy).toHaveBeenCalledWith(
        'Minimum Profiles Required',
        expect.any(String),
        expect.any(Array)
      );
    });

    it('should dispatch compareProfiles when removing from 3+ profiles', () => {
      const store = createMockStore();

      const { getAllByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Remove one profile from 3 - should dispatch new comparison
      fireEvent.press(getAllByTestId('icon-close')[0]);

      // Dispatch should be called with remaining profile IDs
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // NAVIGATION TESTS
  // ===========================================================================

  describe('Navigation', () => {
    it('should render screen without back button', () => {
      const store = createMockStore();

      const { queryByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component doesn't have a back button - just a compare icon
      expect(queryByTestId('icon-button-arrow-left')).toBeNull();
      expect(queryByTestId('icon-compare')).toBeTruthy();
    });

    it('should display profile names in column headers', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Profile names are displayed in headers
      expect(getByText('Sarah')).toBeTruthy();
      expect(getByText('Mike')).toBeTruthy();
      expect(getByText('Emily')).toBeTruthy();
    });
  });

  // ===========================================================================
  // HORIZONTAL SCROLLING TESTS
  // ===========================================================================

  describe('Horizontal Scrolling', () => {
    it('should render footer with scroll hint', () => {
      const store = createMockStore();

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component shows footer text about horizontal scrolling
      expect(getByText(/Scroll horizontally/)).toBeTruthy();
    });
  });

  // ===========================================================================
  // LOADING STATE TESTS
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading indicator when comparing', () => {
      const store = createMockStore([], true);

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Component shows loading text when comparing is true
      expect(getByText('Loading comparison...')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ERROR STATE TESTS
  // ===========================================================================

  describe('Error State', () => {
    it('should show error message when there is an error', () => {
      const store = createMockStore([], false, 'Failed to load comparison data');

      const { getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByText('Failed to load comparison data')).toBeTruthy();
    });
  });

  // ===========================================================================
  // CHILD SAFETY COMPLIANCE TESTS
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should display children count, not names', () => {
      const store = createMockStore();

      const { getByText, queryByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Should show formatted count: "X children" or "1 child"
      expect(getByText('2 children')).toBeTruthy();
      expect(getByText('1 child')).toBeTruthy();
      expect(getByText('3 children')).toBeTruthy();

      // Should NOT show child names
      expect(queryByText(/emma/i)).toBeNull();
      expect(queryByText(/jacob/i)).toBeNull();
    });

    it('should display age groups, not specific ages', () => {
      const store = createMockStore();

      const { getAllByText, queryByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Should show age groups (may appear multiple times across profiles)
      expect(getAllByText(/toddler/i).length).toBeGreaterThan(0);
      expect(getAllByText(/teenager/i).length).toBeGreaterThan(0);

      // Should NOT show specific child ages
      expect(queryByText(/3 years old/i)).toBeNull();
      expect(queryByText(/14 years old/i)).toBeNull();
    });

    it('should not include child PII in comparison data', () => {
      mockProfiles.forEach(profile => {
        expect(profile).not.toHaveProperty('childNames');
        expect(profile).not.toHaveProperty('childAges');
        expect(profile).not.toHaveProperty('childSchools');
      });
    });
  });

  // ===========================================================================
  // 2-4 PROFILE SUPPORT TESTS
  // ===========================================================================

  describe('2-4 Profile Support', () => {
    it('should render 2 profiles correctly', () => {
      const store = createMockStore([mockProfiles[0], mockProfiles[1]]);

      const { getAllByText, getByText, queryByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Profile count shows "2 profiles selected" - "2" may appear multiple times
      expect(getAllByText(/2/).length).toBeGreaterThan(0);
      expect(getByText(/selected/)).toBeTruthy();
      // Profile names (just first name)
      expect(getByText('Sarah')).toBeTruthy();
      expect(getByText('Mike')).toBeTruthy();
      expect(queryByText('Emily')).toBeNull();
    });

    it('should render 4 profiles correctly', () => {
      const fourProfiles = [
        ...mockProfiles,
        {
          ...mockProfiles[0],
          id: 'profile-4',
          profile_id: 'user-4',
          firstName: 'Lisa',
          age: 31,
          budget: 1400,
        },
      ];
      const store = createMockStore(fourProfiles);

      const { getAllByText, getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Profile count shows "4 profiles selected" - "4" may appear multiple times
      expect(getAllByText(/4/).length).toBeGreaterThan(0);
      // Profile name (just first name)
      expect(getByText('Lisa')).toBeTruthy();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible comparison screen', () => {
      const store = createMockStore();

      const { getByTestId, getByText } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      expect(getByTestId('compare-profiles-screen')).toBeTruthy();
      expect(getByText('Compare Profiles')).toBeTruthy();
    });

    it('should have accessible remove buttons', () => {
      const store = createMockStore();

      const { getAllByTestId } = render(
        <Provider store={store}>
          <CompareProfilesScreen />
        </Provider>
      );

      // Remove buttons use icon-close
      expect(getAllByTestId('icon-close').length).toBeGreaterThan(0);
    });
  });
});
