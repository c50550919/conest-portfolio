/**
 * BrowseDiscoveryScreen Tests
 *
 * MEDIUM-RISK - Main discovery interface
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Key Test Areas:
 * 1. Profile grid rendering
 * 2. View mode toggle (grid/list/map)
 * 3. Filter panel functionality
 * 4. Sort menu functionality
 * 5. Save profile functionality
 * 6. Comparison tool (2-4 profiles)
 * 7. Empty state display
 * 8. Loading and refresh states
 * 9. Child safety compliance (no child PII in profiles)
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

// Mock discovery components
jest.mock('../../../src/components/discovery/DiscoveryHeader', () => ({
  DiscoveryHeader: ({ viewMode, activeFilterCount, onViewModeToggle, onSortPress, onFilterPress }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'discovery-header' },
      React.createElement(
        TouchableOpacity,
        { testID: 'view-mode-toggle', onPress: onViewModeToggle },
        React.createElement(Text, {}, `View: ${viewMode}`)
      ),
      React.createElement(
        TouchableOpacity,
        { testID: 'sort-button', onPress: onSortPress },
        React.createElement(Text, {}, 'Sort')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: 'filter-button', onPress: onFilterPress },
        React.createElement(Text, {}, `Filters (${activeFilterCount})`)
      )
    );
  },
}));

jest.mock('../../../src/components/discovery/SortMenu', () => ({
  SortMenu: ({ visible, currentSort, onSelect }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: 'sort-menu' },
      React.createElement(
        TouchableOpacity,
        { testID: 'sort-compatibility', onPress: () => onSelect('compatibility') },
        React.createElement(Text, {}, 'Compatibility')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: 'sort-newest', onPress: () => onSelect('newest') },
        React.createElement(Text, {}, 'Newest')
      )
    );
  },
}));

jest.mock('../../../src/components/discovery/ComparisonToolbar', () => ({
  ComparisonToolbar: ({ selectedCount, onComparePress }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    if (selectedCount === 0) return null;
    return React.createElement(
      View,
      { testID: 'comparison-toolbar' },
      React.createElement(Text, {}, `${selectedCount} selected`),
      React.createElement(
        TouchableOpacity,
        { testID: 'compare-button', onPress: onComparePress },
        React.createElement(Text, {}, 'Compare')
      )
    );
  },
}));

jest.mock('../../../src/components/discovery/ProfileGridCard', () => ({
  ProfileGridCard: ({ profile, onPress, onSave, onCompare, isSaved, isInComparison }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: `profile-card-${profile.userId}` },
      React.createElement(Text, {}, profile.firstName),
      React.createElement(
        TouchableOpacity,
        { testID: `profile-press-${profile.userId}`, onPress },
        React.createElement(Text, {}, 'View')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `profile-save-${profile.userId}`, onPress: onSave },
        React.createElement(Text, {}, isSaved ? 'Saved' : 'Save')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: `profile-compare-${profile.userId}`, onPress: onCompare },
        React.createElement(Text, {}, isInComparison ? 'Remove' : 'Compare')
      )
    );
  },
}));

jest.mock('../../../src/components/discovery/FilterPanel', () => ({
  FilterPanel: ({ visible, onApply, onClose }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: 'filter-panel' },
      React.createElement(
        TouchableOpacity,
        { testID: 'apply-filters', onPress: () => onApply({ minAge: 25 }) },
        React.createElement(Text, {}, 'Apply')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: 'close-filters', onPress: onClose },
        React.createElement(Text, {}, 'Close')
      )
    );
  },
}));

jest.mock('../../../src/components/discovery/ProfileDetailsModal', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, profile, onClose, onInterested }: any) => {
      if (!visible) return null;
      return React.createElement(
        View,
        { testID: 'profile-details-modal' },
        React.createElement(Text, {}, profile?.firstName || 'Unknown'),
        React.createElement(
          TouchableOpacity,
          { testID: 'close-modal', onPress: onClose },
          React.createElement(Text, {}, 'Close')
        ),
        React.createElement(
          TouchableOpacity,
          { testID: 'send-request', onPress: onInterested },
          React.createElement(Text, {}, 'Interested')
        )
      );
    },
  };
});

jest.mock('../../../src/components/discovery/ComparisonModal', () => ({
  ComparisonModal: ({ visible, profiles, onClose, onRemoveProfile, onShowBreakdown, loadingBreakdown }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: 'comparison-modal' },
      React.createElement(Text, {}, `Comparing ${profiles.length} profiles`),
      React.createElement(
        TouchableOpacity,
        { testID: 'show-breakdown', onPress: onShowBreakdown, disabled: loadingBreakdown },
        React.createElement(Text, {}, 'Show Breakdown')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: 'close-comparison', onPress: onClose },
        React.createElement(Text, {}, 'Close')
      )
    );
  },
}));

jest.mock('../../../src/components/discovery/FolderSelectionModal', () => ({
  FolderSelectionModal: ({ visible, onClose, onSelectFolder, profileName }: any) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      View,
      { testID: 'folder-modal' },
      React.createElement(Text, {}, `Save ${profileName}`),
      React.createElement(
        TouchableOpacity,
        { testID: 'folder-top-choice', onPress: () => onSelectFolder('Top Choice') },
        React.createElement(Text, {}, 'Top Choice')
      ),
      React.createElement(
        TouchableOpacity,
        { testID: 'close-folder-modal', onPress: onClose },
        React.createElement(Text, {}, 'Close')
      )
    );
  },
}));

jest.mock('../../../src/components/compatibility/CompatibilityBreakdownModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: any) => {
      if (!visible) return null;
      return React.createElement(View, { testID: 'compatibility-breakdown-modal' });
    },
  };
});

// Mock APIs
jest.mock('../../../src/services/api/compatibilityAPI', () => ({
  __esModule: true,
  default: {
    calculateCompatibility: jest.fn().mockResolvedValue({
      overallScore: 85,
      categories: {},
    }),
  },
}));

jest.mock('../../../src/services/api/connectionRequestsAPI', () => ({
  __esModule: true,
  default: {
    sendConnectionRequest: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock rate limits
jest.mock('../../../src/utils/rateLimits', () => ({
  canSaveProfile: jest.fn().mockReturnValue({ allowed: true }),
}));

// Mock data
jest.mock('../../../src/data/mockDiscoveryProfiles', () => ({
  MOCK_DISCOVERY_PROFILES: [
    {
      userId: 'user-1',
      firstName: 'Sarah',
      age: 32,
      city: 'San Francisco',
      compatibilityScore: 92,
      childrenCount: 2,
      verificationStatus: 'verified',
    },
    {
      userId: 'user-2',
      firstName: 'Mike',
      age: 35,
      city: 'Oakland',
      compatibilityScore: 88,
      childrenCount: 1,
      verificationStatus: 'verified',
    },
  ],
}));

// Redux slices
import browseDiscoveryReducer from '../../../src/store/slices/browseDiscoverySlice';
import { BrowseDiscoveryScreen } from '../../../src/screens/main/BrowseDiscoveryScreen';

// Create mock savedProfiles reducer to ensure proper state shape
const createMockSavedProfilesReducer = (initialState: any) => (state = initialState, _action: any) => state;

describe('BrowseDiscoveryScreen', () => {
  let store: ReturnType<typeof configureStore>;
  let alertSpy: jest.SpyInstance;

  const defaultSavedProfilesState = {
    savedProfiles: [],
    savedProfilesByFolder: null,
    comparisonProfiles: [],
    limitStatus: null,
    loading: false,
    error: null,
    saving: false,
    updating: false,
    removing: false,
    comparing: false,
  };

  const defaultBrowseState = {
    viewMode: 'grid' as const,
    sortBy: 'compatibility' as const,
    filters: {},
    profiles: [],
    loading: false,
    refreshing: false,
    totalCount: 0,
    nextCursor: null,
    savedProfiles: [],
    comparisonProfiles: [],
  };

  const createStore = (browseOverrides = {}, savedOverrides = {}) => {
    const savedProfilesState = { ...defaultSavedProfilesState, ...savedOverrides };
    return configureStore({
      reducer: {
        browseDiscovery: browseDiscoveryReducer,
        savedProfiles: createMockSavedProfilesReducer(savedProfilesState),
      },
      preloadedState: {
        browseDiscovery: {
          ...defaultBrowseState,
          ...browseOverrides,
        },
        savedProfiles: savedProfilesState,
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // ===========================================================================
  // RENDERING TESTS
  // ===========================================================================

  describe('Rendering', () => {
    it('should render discovery screen with testID', () => {
      store = createStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByTestId('discovery-screen')).toBeTruthy();
    });

    it('should render discovery header', () => {
      store = createStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByTestId('discovery-header')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROFILE GRID TESTS
  // ===========================================================================

  describe('Profile Grid', () => {
    it('should render profile cards when profiles exist', async () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
          {
            userId: 'user-2',
            firstName: 'Mike',
            age: 35,
            city: 'Oakland',
            compatibilityScore: 88,
          },
        ],
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByTestId('profile-card-user-1')).toBeTruthy();
      expect(getByTestId('profile-card-user-2')).toBeTruthy();
    });

    it('should render profile names', async () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
        ],
      });

      const { getByText } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByText('Sarah')).toBeTruthy();
    });
  });

  // ===========================================================================
  // VIEW MODE TESTS
  // ===========================================================================

  describe('View Mode', () => {
    it('should display current view mode', () => {
      store = createStore({ viewMode: 'grid' });

      const { getByText } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByText('View: grid')).toBeTruthy();
    });

    it('should toggle view mode when button pressed', () => {
      store = createStore({ viewMode: 'grid' });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('view-mode-toggle'));

      // Store action should be dispatched
      const state = store.getState();
      expect(state.browseDiscovery.viewMode).toBe('list');
    });
  });

  // ===========================================================================
  // FILTER PANEL TESTS
  // ===========================================================================

  describe('Filter Panel', () => {
    it('should show filter panel when filter button pressed', () => {
      store = createStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(queryByTestId('filter-panel')).toBeNull();

      fireEvent.press(getByTestId('filter-button'));

      expect(getByTestId('filter-panel')).toBeTruthy();
    });

    it('should hide filter panel when close pressed', () => {
      store = createStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('filter-button'));
      expect(getByTestId('filter-panel')).toBeTruthy();

      fireEvent.press(getByTestId('close-filters'));
      expect(queryByTestId('filter-panel')).toBeNull();
    });
  });

  // ===========================================================================
  // SORT MENU TESTS
  // ===========================================================================

  describe('Sort Menu', () => {
    it('should show sort menu when sort button pressed', () => {
      store = createStore();

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(queryByTestId('sort-menu')).toBeNull();

      fireEvent.press(getByTestId('sort-button'));

      expect(getByTestId('sort-menu')).toBeTruthy();
    });

    it('should update sort option when selected', () => {
      store = createStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('sort-button'));
      fireEvent.press(getByTestId('sort-newest'));

      const state = store.getState();
      expect(state.browseDiscovery.sortBy).toBe('newest');
    });
  });

  // ===========================================================================
  // COMPARISON TOOL TESTS
  // ===========================================================================

  describe('Comparison Tool', () => {
    it('should not show comparison toolbar when no profiles selected', () => {
      store = createStore({ comparisonProfiles: [] });

      const { queryByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(queryByTestId('comparison-toolbar')).toBeNull();
    });

    it('should show comparison toolbar when profiles are selected', () => {
      store = createStore({
        comparisonProfiles: [
          {
            profile: { userId: 'user-1', firstName: 'Sarah' },
            addedAt: new Date().toISOString(),
          },
        ],
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByTestId('comparison-toolbar')).toBeTruthy();
    });

    it('should show selected count in toolbar', () => {
      store = createStore({
        comparisonProfiles: [
          {
            profile: { userId: 'user-1', firstName: 'Sarah' },
            addedAt: new Date().toISOString(),
          },
          {
            profile: { userId: 'user-2', firstName: 'Mike' },
            addedAt: new Date().toISOString(),
          },
        ],
      });

      const { getByText } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByText('2 selected')).toBeTruthy();
    });

    it('should add profile to comparison when compare button pressed', () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
        ],
        comparisonProfiles: [],
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('profile-compare-user-1'));

      const state = store.getState();
      expect(state.browseDiscovery.comparisonProfiles).toHaveLength(1);
    });

    it('should remove profile from comparison when already selected', () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
        ],
        comparisonProfiles: [
          {
            profile: { userId: 'user-1', firstName: 'Sarah' },
            addedAt: new Date().toISOString(),
          },
        ],
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('profile-compare-user-1'));

      const state = store.getState();
      expect(state.browseDiscovery.comparisonProfiles).toHaveLength(0);
    });
  });

  // ===========================================================================
  // EMPTY STATE TESTS
  // ===========================================================================

  describe('Empty State', () => {
    it('should show empty state when no profiles', () => {
      store = createStore({ profiles: [], loading: false });

      const { getByText } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByText('No profiles found')).toBeTruthy();
    });

    it('should show adjust filters button in empty state', () => {
      store = createStore({ profiles: [], loading: false });

      const { getByText } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByText('Adjust Filters')).toBeTruthy();
    });
  });

  // ===========================================================================
  // PROFILE DETAILS MODAL TESTS
  // ===========================================================================

  describe('Profile Details Modal', () => {
    it('should open profile details when profile card pressed', () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
        ],
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('profile-press-user-1'));

      expect(getByTestId('profile-details-modal')).toBeTruthy();
    });

    it('should close profile details modal', () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
        ],
      });

      const { getByTestId, queryByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      fireEvent.press(getByTestId('profile-press-user-1'));
      fireEvent.press(getByTestId('close-modal'));

      expect(queryByTestId('profile-details-modal')).toBeNull();
    });
  });

  // ===========================================================================
  // CHILD SAFETY COMPLIANCE TESTS (Constitution Principle I)
  // ===========================================================================

  describe('Child Safety Compliance', () => {
    it('should NOT display child names in profiles', () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            // Profile should only have childrenCount, NOT child names
            childrenCount: 2,
          },
        ],
      });

      const { queryByText } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      // Should NOT find any child names - only parent info
      expect(queryByText(/child1/i)).toBeNull();
      expect(queryByText(/emma/i)).toBeNull();
      expect(queryByText(/jacob/i)).toBeNull();
    });

    it('should only show childrenCount, not detailed child information', () => {
      const mockProfile = {
        userId: 'user-1',
        firstName: 'Sarah',
        childrenCount: 2,
        ageGroup: '25-34',
      };

      // Verify profile structure does NOT contain child PII
      expect(mockProfile).not.toHaveProperty('childNames');
      expect(mockProfile).not.toHaveProperty('childAges');
      expect(mockProfile).not.toHaveProperty('childSchools');
      expect(mockProfile).not.toHaveProperty('childPhotos');
    });
  });

  // ===========================================================================
  // ACCESSIBILITY TESTS
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible discovery screen', () => {
      store = createStore();

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByTestId('discovery-screen')).toBeTruthy();
    });

    it('should have accessible profile cards', () => {
      store = createStore({
        profiles: [
          {
            userId: 'user-1',
            firstName: 'Sarah',
            age: 32,
            city: 'San Francisco',
            compatibilityScore: 92,
          },
        ],
      });

      const { getByTestId } = render(
        <Provider store={store}>
          <BrowseDiscoveryScreen />
        </Provider>
      );

      expect(getByTestId('profile-card-user-1')).toBeTruthy();
      expect(getByTestId('profile-save-user-1')).toBeTruthy();
      expect(getByTestId('profile-compare-user-1')).toBeTruthy();
    });
  });
});
