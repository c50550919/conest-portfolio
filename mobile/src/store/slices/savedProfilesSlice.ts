/**
 * Saved Profiles Redux Slice
 *
 * Purpose: State management for saved profiles feature (bookmarking with folders and notes)
 * Feature: 003-complete-3-critical (SavedProfiles Redux state)
 * Task: T035
 *
 * State:
 * - savedProfiles: Array of saved profiles with profile data
 * - loading: Boolean for async operations
 * - error: Error message string
 * - comparisonProfiles: Array of profiles selected for comparison
 * - limitStatus: Current count vs 50-profile limit
 *
 * Actions:
 * - fetchSavedProfiles: Load all saved profiles with optional folder filter
 * - saveProfile: Bookmark a profile to a folder with optional notes
 * - updateSavedProfile: Change folder or notes for a saved profile
 * - removeSavedProfile: Delete a saved profile
 * - compareProfiles: Load 2-4 profiles for side-by-side comparison
 * - checkIfSaved: Check if a profile is already saved
 *
 * Created: 2025-10-14
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import savedProfilesAPI, { SavedProfile, LimitStatus, CompareProfile, SavedProfilesByFolder } from '../../services/api/savedProfilesAPI';

export interface SavedProfilesState {
  // Data
  savedProfiles: SavedProfile[];
  savedProfilesByFolder: SavedProfilesByFolder | null;
  comparisonProfiles: CompareProfile[];
  limitStatus: LimitStatus | null;

  // UI State
  loading: boolean;
  error: string | null;

  // Operation-specific loading states
  saving: boolean;
  updating: boolean;
  removing: boolean;
  comparing: boolean;
}

const initialState: SavedProfilesState = {
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

// ========================================================================
// Async Thunks
// ========================================================================

/**
 * Fetch all saved profiles with optional folder filter
 */
export const fetchSavedProfiles = createAsyncThunk(
  'savedProfiles/fetchSavedProfiles',
  async (folder?: string) => {
    const profiles = await savedProfilesAPI.listSavedProfiles(folder);
    return profiles;
  }
);

/**
 * Fetch saved profiles grouped by folder
 */
export const fetchSavedProfilesByFolder = createAsyncThunk(
  'savedProfiles/fetchSavedProfilesByFolder',
  async () => {
    const profilesByFolder = await savedProfilesAPI.getSavedProfilesByFolder();
    return profilesByFolder;
  }
);

/**
 * Save a profile to a folder with optional notes
 */
export const saveProfile = createAsyncThunk(
  'savedProfiles/saveProfile',
  async ({
    profileId,
    folder,
    notes,
  }: {
    profileId: string;
    folder?: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup' | null;
    notes?: string;
  }) => {
    const savedProfile = await savedProfilesAPI.saveProfile(profileId, folder, notes);
    return savedProfile;
  }
);

/**
 * Update folder or notes for a saved profile
 */
export const updateSavedProfile = createAsyncThunk(
  'savedProfiles/updateSavedProfile',
  async ({
    id,
    folder,
    notes,
  }: {
    id: string;
    folder?: 'Top Choice' | 'Strong Maybe' | 'Considering' | 'Backup' | null;
    notes?: string;
  }) => {
    const updatedProfile = await savedProfilesAPI.updateSavedProfile(id, folder, notes);
    return updatedProfile;
  }
);

/**
 * Remove a saved profile
 */
export const removeSavedProfile = createAsyncThunk(
  'savedProfiles/removeSavedProfile',
  async (id: string) => {
    await savedProfilesAPI.removeSavedProfile(id);
    return id;
  }
);

/**
 * Compare 2-4 saved profiles side-by-side
 */
export const compareProfiles = createAsyncThunk(
  'savedProfiles/compareProfiles',
  async (ids: string[]) => {
    const profiles = await savedProfilesAPI.compareProfiles(ids);
    return profiles;
  }
);

/**
 * Fetch saved profile limit status
 */
export const fetchLimitStatus = createAsyncThunk(
  'savedProfiles/fetchLimitStatus',
  async () => {
    const status = await savedProfilesAPI.getLimitStatus();
    return status;
  }
);

/**
 * Check if a profile is already saved
 */
export const checkIfSaved = createAsyncThunk(
  'savedProfiles/checkIfSaved',
  async (profileId: string) => {
    const result = await savedProfilesAPI.checkIfSaved(profileId);
    return result;
  }
);

/**
 * Get decrypted notes for a saved profile
 */
export const getNotes = createAsyncThunk(
  'savedProfiles/getNotes',
  async (id: string) => {
    const notes = await savedProfilesAPI.getNotes(id);
    return { id, notes };
  }
);

// ========================================================================
// Slice
// ========================================================================

const savedProfilesSlice = createSlice({
  name: 'savedProfiles',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Clear comparison profiles
    clearComparison: (state) => {
      state.comparisonProfiles = [];
    },

    // Update saved profile locally (optimistic UI)
    updateSavedProfileLocal: (state, action: PayloadAction<SavedProfile>) => {
      const index = state.savedProfiles.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.savedProfiles[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // ========================================================================
    // Fetch Saved Profiles
    // ========================================================================
    builder
      .addCase(fetchSavedProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedProfiles.fulfilled, (state, action) => {
        state.loading = false;
        state.savedProfiles = action.payload;
      })
      .addCase(fetchSavedProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch saved profiles';
      });

    // ========================================================================
    // Fetch Saved Profiles By Folder
    // ========================================================================
    builder
      .addCase(fetchSavedProfilesByFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedProfilesByFolder.fulfilled, (state, action) => {
        state.loading = false;
        state.savedProfilesByFolder = action.payload;
      })
      .addCase(fetchSavedProfilesByFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch saved profiles by folder';
      });

    // ========================================================================
    // Save Profile
    // ========================================================================
    builder
      .addCase(saveProfile.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveProfile.fulfilled, (state, action) => {
        state.saving = false;
        state.savedProfiles.push(action.payload);
      })
      .addCase(saveProfile.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to save profile';
      });

    // ========================================================================
    // Update Saved Profile
    // ========================================================================
    builder
      .addCase(updateSavedProfile.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateSavedProfile.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.savedProfiles.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.savedProfiles[index] = action.payload;
        }
      })
      .addCase(updateSavedProfile.rejected, (state, action) => {
        state.updating = false;
        state.error = action.error.message || 'Failed to update saved profile';
      });

    // ========================================================================
    // Remove Saved Profile
    // ========================================================================
    builder
      .addCase(removeSavedProfile.pending, (state) => {
        state.removing = true;
        state.error = null;
      })
      .addCase(removeSavedProfile.fulfilled, (state, action) => {
        state.removing = false;
        state.savedProfiles = state.savedProfiles.filter((p) => p.id !== action.payload);
      })
      .addCase(removeSavedProfile.rejected, (state, action) => {
        state.removing = false;
        state.error = action.error.message || 'Failed to remove saved profile';
      });

    // ========================================================================
    // Compare Profiles
    // ========================================================================
    builder
      .addCase(compareProfiles.pending, (state) => {
        state.comparing = true;
        state.error = null;
      })
      .addCase(compareProfiles.fulfilled, (state, action) => {
        state.comparing = false;
        state.comparisonProfiles = action.payload;
      })
      .addCase(compareProfiles.rejected, (state, action) => {
        state.comparing = false;
        state.error = action.error.message || 'Failed to compare profiles';
      });

    // ========================================================================
    // Fetch Limit Status
    // ========================================================================
    builder
      .addCase(fetchLimitStatus.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchLimitStatus.fulfilled, (state, action) => {
        state.limitStatus = action.payload;
      })
      .addCase(fetchLimitStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch limit status';
      });

    // ========================================================================
    // Get Notes
    // ========================================================================
    builder
      .addCase(getNotes.fulfilled, (state, action) => {
        const index = state.savedProfiles.findIndex((p) => p.id === action.payload.id);
        if (index !== -1 && action.payload.notes) {
          // Store decrypted notes temporarily in local state
          // Note: In production, you may want to cache this separately
          state.savedProfiles[index].notes_encrypted = action.payload.notes;
        }
      });
  },
});

export const { clearError, clearComparison, updateSavedProfileLocal } = savedProfilesSlice.actions;

export default savedProfilesSlice.reducer;
