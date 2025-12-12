/**
 * Unit Tests for Browse Discovery Redux Slice
 * Tests browse-based discovery interface state management
 */

import { configureStore } from '@reduxjs/toolkit';
import browseDiscoveryReducer, {
  setViewMode,
  setSortBy,
  setFilters,
  updateFilters,
  resetFilters,
  setProfiles,
  appendProfiles,
  updateProfile,
  removeProfile,
  setLoading,
  setRefreshing,
  setError,
  toggleProfileSelection,
  setSelectedProfiles,
  clearSelection,
  addSavedProfile,
  updateSavedProfile,
  removeSavedProfile,
  moveSavedProfile,
  incrementProfileViewCount,
  addToComparison,
  removeFromComparison,
  clearComparison,
  saveComparisonSet,
  deleteComparisonSet,
  loadComparisonSet,
  addSentRequest,
  updateSentRequest,
  addReceivedRequest,
  updateReceivedRequest,
  removeExpiredRequests,
  resetBrowseDiscovery,
} from '../../src/store/slices/browseDiscoverySlice';
import {
  BrowseState,
  ExtendedProfileCard,
  SavedProfile,
  ComparisonProfile,
  ComparisonSet,
  ConnectionRequest,
} from '../../src/types/discovery';

// Mock the config
jest.mock('../../src/config/discoveryConfig', () => ({
  DEFAULT_FILTERS: {
    locationRadius: 25,
    minCompatibility: 0,
    verifiedOnly: false,
    hasPhotos: true,
  },
  DEFAULT_SORT: 'compatibility_desc',
  DEFAULT_VIEW_MODE: 'grid',
  COMPARISON_LIMITS: {
    maxProfiles: 4,
    maxSavedComparisons: 10,
  },
}));

describe('browseDiscoverySlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockProfile: ExtendedProfileCard = {
    userId: 'user-1',
    firstName: 'Jane',
    lastName: 'D',
    age: 35,
    occupation: 'Teacher',
    city: 'San Francisco',
    state: 'CA',
    profilePhoto: 'https://example.com/photo.jpg',
    verificationBadges: ['id_verified', 'background_check'],
    compatibilityScore: 85,
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'elementary'],
    bio: 'Looking for a compatible roommate',
    lastActive: new Date().toISOString(),
  };

  const mockSavedProfile: SavedProfile = {
    profileId: 'user-1',
    folder: 'top-choice',
    notes: 'Great match!',
    savedAt: new Date().toISOString(),
    viewCount: 3,
    lastViewedAt: new Date().toISOString(),
    profile: mockProfile,
  };

  const mockComparisonProfile: ComparisonProfile = {
    profile: mockProfile,
    addedAt: new Date().toISOString(),
  };

  const mockConnectionRequest: ConnectionRequest = {
    id: 'req-1',
    senderId: 'user-123',
    recipientId: 'user-1',
    status: 'pending',
    message: 'Hi, would love to connect!',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        browseDiscovery: browseDiscoveryReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().browseDiscovery as BrowseState;

      expect(state.viewMode).toBe('grid');
      expect(state.sortBy).toBe('compatibility_desc');
      expect(state.profiles).toEqual([]);
      expect(state.totalCount).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.selectedProfileIds).toEqual([]);
      expect(state.savedProfiles).toEqual([]);
      expect(state.comparisonProfiles).toEqual([]);
      expect(state.sentRequests).toEqual([]);
      expect(state.receivedRequests).toEqual([]);
    });
  });

  describe('view configuration', () => {
    it('should set view mode', () => {
      store.dispatch(setViewMode('list'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.viewMode).toBe('list');
    });

    it('should set sort and reset profiles', () => {
      store.dispatch(setProfiles({ profiles: [mockProfile], totalCount: 1, nextCursor: 'abc' }));
      store.dispatch(setSortBy('newest'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.sortBy).toBe('newest');
      expect(state.profiles).toEqual([]);
      expect(state.nextCursor).toBeNull();
    });

    it('should set filters and reset profiles', () => {
      store.dispatch(setProfiles({ profiles: [mockProfile], totalCount: 1, nextCursor: 'abc' }));
      store.dispatch(setFilters({ locationRadius: 50, minCompatibility: 70, verifiedOnly: true, hasPhotos: true }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.filters.locationRadius).toBe(50);
      expect(state.profiles).toEqual([]);
      expect(state.selectedProfileIds).toEqual([]);
    });

    it('should update filters partially', () => {
      store.dispatch(updateFilters({ minCompatibility: 60 }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.filters.minCompatibility).toBe(60);
    });

    it('should reset filters to defaults', () => {
      store.dispatch(updateFilters({ locationRadius: 100, verifiedOnly: true }));
      store.dispatch(resetFilters());

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.filters.locationRadius).toBe(25);
      expect(state.filters.verifiedOnly).toBe(false);
    });
  });

  describe('profile data', () => {
    it('should set profiles', () => {
      store.dispatch(setProfiles({
        profiles: [mockProfile],
        totalCount: 100,
        nextCursor: 'cursor-123',
      }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.profiles).toHaveLength(1);
      expect(state.totalCount).toBe(100);
      expect(state.nextCursor).toBe('cursor-123');
      expect(state.loading).toBe(false);
    });

    it('should append profiles', () => {
      store.dispatch(setProfiles({ profiles: [mockProfile], totalCount: 2, nextCursor: 'cursor-1' }));
      const profile2 = { ...mockProfile, userId: 'user-2' };
      store.dispatch(appendProfiles({ profiles: [profile2], nextCursor: null }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.profiles).toHaveLength(2);
      expect(state.nextCursor).toBeNull();
    });

    it('should update a profile', () => {
      store.dispatch(setProfiles({ profiles: [mockProfile], totalCount: 1, nextCursor: null }));
      store.dispatch(updateProfile({ ...mockProfile, compatibilityScore: 90 }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.profiles[0].compatibilityScore).toBe(90);
    });

    it('should remove a profile', () => {
      store.dispatch(setProfiles({ profiles: [mockProfile], totalCount: 1, nextCursor: null }));
      store.dispatch(removeProfile('user-1'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.profiles).toHaveLength(0);
      expect(state.totalCount).toBe(0);
    });
  });

  describe('UI state', () => {
    it('should set loading', () => {
      store.dispatch(setLoading(true));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.loading).toBe(true);
    });

    it('should set refreshing', () => {
      store.dispatch(setRefreshing(true));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.refreshing).toBe(true);
    });

    it('should set error and clear loading states', () => {
      store.dispatch(setLoading(true));
      store.dispatch(setRefreshing(true));
      store.dispatch(setError('Network error'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.error).toBe('Network error');
      expect(state.loading).toBe(false);
      expect(state.refreshing).toBe(false);
    });
  });

  describe('selection', () => {
    it('should toggle profile selection', () => {
      store.dispatch(toggleProfileSelection('user-1'));

      let state = store.getState().browseDiscovery as BrowseState;
      expect(state.selectedProfileIds).toContain('user-1');

      store.dispatch(toggleProfileSelection('user-1'));

      state = store.getState().browseDiscovery as BrowseState;
      expect(state.selectedProfileIds).not.toContain('user-1');
    });

    it('should set selected profiles', () => {
      store.dispatch(setSelectedProfiles(['user-1', 'user-2', 'user-3']));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.selectedProfileIds).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should clear selection', () => {
      store.dispatch(setSelectedProfiles(['user-1', 'user-2']));
      store.dispatch(clearSelection());

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.selectedProfileIds).toEqual([]);
    });
  });

  describe('saved profiles & bookmarks', () => {
    it('should add saved profile', () => {
      store.dispatch(addSavedProfile(mockSavedProfile));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.savedProfiles).toHaveLength(1);
      expect(state.bookmarkStats.total).toBe(1);
      expect(state.bookmarkStats.byFolder['top-choice']).toBe(1);
    });

    it('should replace saved profile if already exists', () => {
      store.dispatch(addSavedProfile(mockSavedProfile));
      store.dispatch(addSavedProfile({ ...mockSavedProfile, folder: 'strong-maybe' }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.savedProfiles).toHaveLength(1);
      expect(state.savedProfiles[0].folder).toBe('strong-maybe');
    });

    it('should update saved profile', () => {
      store.dispatch(addSavedProfile(mockSavedProfile));
      store.dispatch(updateSavedProfile({
        profileId: 'user-1',
        updates: { notes: 'Updated notes' },
      }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.savedProfiles[0].notes).toBe('Updated notes');
    });

    it('should remove saved profile', () => {
      store.dispatch(addSavedProfile(mockSavedProfile));
      store.dispatch(removeSavedProfile('user-1'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.savedProfiles).toHaveLength(0);
      expect(state.bookmarkStats.total).toBe(0);
    });

    it('should move saved profile to different folder', () => {
      store.dispatch(addSavedProfile(mockSavedProfile));
      store.dispatch(moveSavedProfile({ profileId: 'user-1', toFolder: 'backup' }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.savedProfiles[0].folder).toBe('backup');
      expect(state.bookmarkStats.byFolder['top-choice']).toBe(0);
      expect(state.bookmarkStats.byFolder['backup']).toBe(1);
    });

    it('should increment profile view count', () => {
      store.dispatch(addSavedProfile(mockSavedProfile));
      store.dispatch(incrementProfileViewCount('user-1'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.savedProfiles[0].viewCount).toBe(4);
      expect(state.savedProfiles[0].lastViewedAt).toBeDefined();
    });
  });

  describe('comparison tool', () => {
    it('should add profile to comparison', () => {
      store.dispatch(addToComparison(mockComparisonProfile));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonProfiles).toHaveLength(1);
    });

    it('should enforce max comparison limit', () => {
      for (let i = 0; i < 5; i++) {
        store.dispatch(addToComparison({
          profile: { ...mockProfile, userId: `user-${i}` },
          addedAt: new Date().toISOString(),
        }));
      }

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonProfiles.length).toBeLessThanOrEqual(4);
    });

    it('should remove profile from comparison', () => {
      store.dispatch(addToComparison(mockComparisonProfile));
      store.dispatch(removeFromComparison('user-1'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonProfiles).toHaveLength(0);
    });

    it('should clear comparison', () => {
      store.dispatch(addToComparison(mockComparisonProfile));
      store.dispatch(clearComparison());

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonProfiles).toHaveLength(0);
    });

    it('should save comparison set', () => {
      const set: ComparisonSet = {
        id: 'set-1',
        name: 'My comparison',
        profiles: [mockComparisonProfile],
        createdAt: new Date().toISOString(),
      };
      store.dispatch(saveComparisonSet(set));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonSets).toHaveLength(1);
    });

    it('should delete comparison set', () => {
      const set: ComparisonSet = {
        id: 'set-1',
        name: 'My comparison',
        profiles: [mockComparisonProfile],
        createdAt: new Date().toISOString(),
      };
      store.dispatch(saveComparisonSet(set));
      store.dispatch(deleteComparisonSet('set-1'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonSets).toHaveLength(0);
    });

    it('should load comparison set', () => {
      const set: ComparisonSet = {
        id: 'set-1',
        name: 'My comparison',
        profiles: [mockComparisonProfile],
        createdAt: new Date().toISOString(),
      };
      store.dispatch(saveComparisonSet(set));
      store.dispatch(clearComparison());
      store.dispatch(loadComparisonSet('set-1'));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.comparisonProfiles).toHaveLength(1);
    });
  });

  describe('connection requests', () => {
    it('should add sent request', () => {
      store.dispatch(addSentRequest(mockConnectionRequest));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.sentRequests).toHaveLength(1);
    });

    it('should update sent request', () => {
      store.dispatch(addSentRequest(mockConnectionRequest));
      store.dispatch(updateSentRequest({
        requestId: 'req-1',
        updates: { status: 'accepted' },
      }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.sentRequests[0].status).toBe('accepted');
    });

    it('should add received request', () => {
      const received = { ...mockConnectionRequest, id: 'req-2' };
      store.dispatch(addReceivedRequest(received));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.receivedRequests).toHaveLength(1);
    });

    it('should update received request', () => {
      const received = { ...mockConnectionRequest, id: 'req-2' };
      store.dispatch(addReceivedRequest(received));
      store.dispatch(updateReceivedRequest({
        requestId: 'req-2',
        updates: { status: 'declined' },
      }));

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.receivedRequests[0].status).toBe('declined');
    });

    it('should remove expired requests', () => {
      const expiredRequest = {
        ...mockConnectionRequest,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      store.dispatch(addSentRequest(expiredRequest));
      store.dispatch(addReceivedRequest({ ...expiredRequest, id: 'req-2' }));
      store.dispatch(removeExpiredRequests());

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.sentRequests).toHaveLength(0);
      expect(state.receivedRequests).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      store.dispatch(setProfiles({ profiles: [mockProfile], totalCount: 1, nextCursor: 'abc' }));
      store.dispatch(addSavedProfile(mockSavedProfile));
      store.dispatch(setError('Some error'));
      store.dispatch(resetBrowseDiscovery());

      const state = store.getState().browseDiscovery as BrowseState;
      expect(state.profiles).toEqual([]);
      expect(state.savedProfiles).toEqual([]);
      expect(state.error).toBeNull();
    });
  });
});
