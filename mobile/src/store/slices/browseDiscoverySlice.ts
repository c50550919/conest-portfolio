/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Browse Discovery Redux Slice
 *
 * Purpose: State management for browse-based discovery interface
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Features:
 * - Filtered grid/list/map views
 * - Saved profiles with bookmark folders
 * - Comparison tool
 * - Connection requests
 * - Advanced filtering and sorting
 *
 * Created: 2025-10-08
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  BrowseState,
  BrowseViewMode,
  SortOption,
  DiscoveryFilters,
  ExtendedProfileCard,
  SavedProfile,
  BookmarkFolder,
  BookmarkStats,
  ComparisonProfile,
  ComparisonSet,
  ConnectionRequest,
} from '../../types/discovery';
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_VIEW_MODE,
  COMPARISON_LIMITS,
} from '../../config/discoveryConfig';

const initialState: BrowseState = {
  // View Configuration
  viewMode: DEFAULT_VIEW_MODE,
  sortBy: DEFAULT_SORT,
  filters: DEFAULT_FILTERS,

  // Profile Data
  profiles: [],
  totalCount: 0,
  nextCursor: null,

  // UI State
  loading: false,
  error: null,
  refreshing: false,

  // Selection
  selectedProfileIds: [],

  // Saved Profiles
  savedProfiles: [],
  bookmarkStats: {
    total: 0,
    byFolder: {
      'top-choice': 0,
      'strong-maybe': 0,
      considering: 0,
      backup: 0,
      archived: 0,
    },
  },

  // Comparison
  comparisonProfiles: [],
  comparisonSets: [],

  // Connection Requests
  sentRequests: [],
  receivedRequests: [],
};

const browseDiscoverySlice = createSlice({
  name: 'browseDiscovery',
  initialState,
  reducers: {
    // ========================================================================
    // View Configuration
    // ========================================================================

    setViewMode: (state, action: PayloadAction<BrowseViewMode>) => {
      state.viewMode = action.payload;
    },

    setSortBy: (state, action: PayloadAction<SortOption>) => {
      state.sortBy = action.payload;
      // Reset profiles when sort changes to trigger refetch
      state.profiles = [];
      state.nextCursor = null;
    },

    setFilters: (state, action: PayloadAction<DiscoveryFilters>) => {
      state.filters = action.payload;
      // Reset profiles when filters change to trigger refetch
      state.profiles = [];
      state.nextCursor = null;
      state.selectedProfileIds = [];
    },

    updateFilters: (state, action: PayloadAction<Partial<DiscoveryFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Reset profiles for refetch
      state.profiles = [];
      state.nextCursor = null;
      state.selectedProfileIds = [];
    },

    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.profiles = [];
      state.nextCursor = null;
    },

    // ========================================================================
    // Profile Data
    // ========================================================================

    setProfiles: (
      state,
      action: PayloadAction<{
        profiles: ExtendedProfileCard[];
        totalCount: number;
        nextCursor: string | null;
      }>
    ) => {
      state.profiles = action.payload.profiles;
      state.totalCount = action.payload.totalCount;
      state.nextCursor = action.payload.nextCursor;
      state.loading = false;
      state.error = null;
    },

    appendProfiles: (
      state,
      action: PayloadAction<{
        profiles: ExtendedProfileCard[];
        nextCursor: string | null;
      }>
    ) => {
      state.profiles = [...state.profiles, ...action.payload.profiles];
      state.nextCursor = action.payload.nextCursor;
      state.loading = false;
    },

    updateProfile: (state, action: PayloadAction<ExtendedProfileCard>) => {
      const index = state.profiles.findIndex((p) => p.userId === action.payload.userId);
      if (index !== -1) {
        state.profiles[index] = action.payload;
      }
    },

    removeProfile: (state, action: PayloadAction<string>) => {
      state.profiles = state.profiles.filter((p) => p.userId !== action.payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
    },

    // ========================================================================
    // UI State
    // ========================================================================

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
      state.refreshing = false;
    },

    // ========================================================================
    // Selection
    // ========================================================================

    toggleProfileSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedProfileIds.indexOf(action.payload);
      if (index !== -1) {
        state.selectedProfileIds.splice(index, 1);
      } else {
        state.selectedProfileIds.push(action.payload);
      }
    },

    setSelectedProfiles: (state, action: PayloadAction<string[]>) => {
      state.selectedProfileIds = action.payload;
    },

    clearSelection: (state) => {
      state.selectedProfileIds = [];
    },

    // ========================================================================
    // Saved Profiles & Bookmarks
    // ========================================================================

    addSavedProfile: (state, action: PayloadAction<SavedProfile>) => {
      // Remove if already exists (user might be changing folder)
      state.savedProfiles = state.savedProfiles.filter(
        (p) => p.profileId !== action.payload.profileId
      );
      state.savedProfiles.unshift(action.payload); // Add to beginning
      updateBookmarkStats(state);
    },

    updateSavedProfile: (
      state,
      action: PayloadAction<{
        profileId: string;
        updates: Partial<SavedProfile>;
      }>
    ) => {
      const index = state.savedProfiles.findIndex((p) => p.profileId === action.payload.profileId);
      if (index !== -1) {
        state.savedProfiles[index] = {
          ...state.savedProfiles[index],
          ...action.payload.updates,
        };
        updateBookmarkStats(state);
      }
    },

    removeSavedProfile: (state, action: PayloadAction<string>) => {
      state.savedProfiles = state.savedProfiles.filter((p) => p.profileId !== action.payload);
      updateBookmarkStats(state);
    },

    moveSavedProfile: (
      state,
      action: PayloadAction<{
        profileId: string;
        toFolder: BookmarkFolder;
      }>
    ) => {
      const index = state.savedProfiles.findIndex((p) => p.profileId === action.payload.profileId);
      if (index !== -1) {
        state.savedProfiles[index].folder = action.payload.toFolder;
        updateBookmarkStats(state);
      }
    },

    incrementProfileViewCount: (state, action: PayloadAction<string>) => {
      const index = state.savedProfiles.findIndex((p) => p.profileId === action.payload);
      if (index !== -1) {
        state.savedProfiles[index].viewCount += 1;
        state.savedProfiles[index].lastViewedAt = new Date().toISOString();
      }
    },

    // ========================================================================
    // Comparison Tool
    // ========================================================================

    addToComparison: (state, action: PayloadAction<ComparisonProfile>) => {
      // Enforce max comparison limit from config
      if (state.comparisonProfiles.length < COMPARISON_LIMITS.maxProfiles) {
        state.comparisonProfiles.push(action.payload);
      }
    },

    removeFromComparison: (state, action: PayloadAction<string>) => {
      state.comparisonProfiles = state.comparisonProfiles.filter(
        (p) => p.profile.userId !== action.payload
      );
    },

    clearComparison: (state) => {
      state.comparisonProfiles = [];
    },

    saveComparisonSet: (state, action: PayloadAction<ComparisonSet>) => {
      state.comparisonSets.unshift(action.payload);
      // Keep max saved comparison sets from config
      if (state.comparisonSets.length > COMPARISON_LIMITS.maxSavedComparisons) {
        state.comparisonSets = state.comparisonSets.slice(0, COMPARISON_LIMITS.maxSavedComparisons);
      }
    },

    deleteComparisonSet: (state, action: PayloadAction<string>) => {
      state.comparisonSets = state.comparisonSets.filter((set) => set.id !== action.payload);
    },

    loadComparisonSet: (state, action: PayloadAction<string>) => {
      const set = state.comparisonSets.find((s) => s.id === action.payload);
      if (set) {
        state.comparisonProfiles = set.profiles;
      }
    },

    // ========================================================================
    // Connection Requests
    // ========================================================================

    addSentRequest: (state, action: PayloadAction<ConnectionRequest>) => {
      state.sentRequests.unshift(action.payload);
    },

    updateSentRequest: (
      state,
      action: PayloadAction<{
        requestId: string;
        updates: Partial<ConnectionRequest>;
      }>
    ) => {
      const index = state.sentRequests.findIndex((r) => r.id === action.payload.requestId);
      if (index !== -1) {
        state.sentRequests[index] = {
          ...state.sentRequests[index],
          ...action.payload.updates,
        };
      }
    },

    addReceivedRequest: (state, action: PayloadAction<ConnectionRequest>) => {
      state.receivedRequests.unshift(action.payload);
    },

    updateReceivedRequest: (
      state,
      action: PayloadAction<{
        requestId: string;
        updates: Partial<ConnectionRequest>;
      }>
    ) => {
      const index = state.receivedRequests.findIndex((r) => r.id === action.payload.requestId);
      if (index !== -1) {
        state.receivedRequests[index] = {
          ...state.receivedRequests[index],
          ...action.payload.updates,
        };
      }
    },

    removeExpiredRequests: (state) => {
      const now = new Date().toISOString();
      state.sentRequests = state.sentRequests.filter((r) => r.expiresAt > now);
      state.receivedRequests = state.receivedRequests.filter((r) => r.expiresAt > now);
    },

    // ========================================================================
    // Reset
    // ========================================================================

    resetBrowseDiscovery: () => initialState,
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function updateBookmarkStats(state: BrowseState) {
  state.bookmarkStats = {
    total: state.savedProfiles.length,
    byFolder: {
      'top-choice': state.savedProfiles.filter((p) => p.folder === 'top-choice').length,
      'strong-maybe': state.savedProfiles.filter((p) => p.folder === 'strong-maybe').length,
      considering: state.savedProfiles.filter((p) => p.folder === 'considering').length,
      backup: state.savedProfiles.filter((p) => p.folder === 'backup').length,
      archived: state.savedProfiles.filter((p) => p.folder === 'archived').length,
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export const {
  // View Configuration
  setViewMode,
  setSortBy,
  setFilters,
  updateFilters,
  resetFilters,

  // Profile Data
  setProfiles,
  appendProfiles,
  updateProfile,
  removeProfile,

  // UI State
  setLoading,
  setRefreshing,
  setError,

  // Selection
  toggleProfileSelection,
  setSelectedProfiles,
  clearSelection,

  // Saved Profiles
  addSavedProfile,
  updateSavedProfile,
  removeSavedProfile,
  moveSavedProfile,
  incrementProfileViewCount,

  // Comparison
  addToComparison,
  removeFromComparison,
  clearComparison,
  saveComparisonSet,
  deleteComparisonSet,
  loadComparisonSet,

  // Connection Requests
  addSentRequest,
  updateSentRequest,
  addReceivedRequest,
  updateReceivedRequest,
  removeExpiredRequests,

  // Reset
  resetBrowseDiscovery,
} = browseDiscoverySlice.actions;

export default browseDiscoverySlice.reducer;
