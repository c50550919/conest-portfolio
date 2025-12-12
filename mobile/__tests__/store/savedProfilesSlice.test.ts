/**
 * Unit Tests for Saved Profiles Redux Slice
 * Tests saved profiles feature state management with async thunks
 */

import { configureStore } from '@reduxjs/toolkit';
import savedProfilesReducer, {
  fetchSavedProfiles,
  fetchSavedProfilesByFolder,
  saveProfile,
  updateSavedProfile,
  removeSavedProfile,
  compareProfiles,
  fetchLimitStatus,
  checkIfSaved,
  getNotes,
  clearError,
  clearComparison,
  updateSavedProfileLocal,
  SavedProfilesState,
} from '../../src/store/slices/savedProfilesSlice';
import { SavedProfile, LimitStatus, CompareProfile } from '../../src/services/api/savedProfilesAPI';

// Mock the API
jest.mock('../../src/services/api/savedProfilesAPI', () => ({
  __esModule: true,
  default: {
    listSavedProfiles: jest.fn(),
    getSavedProfilesByFolder: jest.fn(),
    saveProfile: jest.fn(),
    updateSavedProfile: jest.fn(),
    removeSavedProfile: jest.fn(),
    compareProfiles: jest.fn(),
    getLimitStatus: jest.fn(),
    checkIfSaved: jest.fn(),
    getNotes: jest.fn(),
  },
}));

describe('savedProfilesSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockSavedProfile: SavedProfile = {
    id: 'saved-1',
    user_id: 'user-123',
    profile_id: 'profile-456',
    folder: 'Top Choice',
    notes_encrypted: 'Great match!',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: {
      id: 'profile-456',
      firstName: 'Jane',
      lastName: 'Doe',
      profilePhoto: 'https://example.com/photo.jpg',
    },
  };

  const mockCompareProfile: CompareProfile = {
    profile: {
      id: 'profile-456',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 35,
      city: 'San Francisco',
      compatibilityScore: 85,
    },
    savedProfile: mockSavedProfile,
  };

  const mockLimitStatus: LimitStatus = {
    current: 10,
    limit: 50,
    canSaveMore: true,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        savedProfiles: savedProfilesReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().savedProfiles as SavedProfilesState;

      expect(state.savedProfiles).toEqual([]);
      expect(state.savedProfilesByFolder).toBeNull();
      expect(state.comparisonProfiles).toEqual([]);
      expect(state.limitStatus).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.saving).toBe(false);
      expect(state.updating).toBe(false);
      expect(state.removing).toBe(false);
      expect(state.comparing).toBe(false);
    });
  });

  describe('fetchSavedProfiles', () => {
    it('should set loading to true when pending', () => {
      store.dispatch(fetchSavedProfiles.pending('', undefined));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update savedProfiles when fulfilled', () => {
      store.dispatch(fetchSavedProfiles.fulfilled([mockSavedProfile], '', undefined));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.loading).toBe(false);
      expect(state.savedProfiles).toEqual([mockSavedProfile]);
    });

    it('should set error when rejected', () => {
      const error = new Error('Failed to fetch');
      store.dispatch(fetchSavedProfiles.rejected(error, '', undefined));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to fetch');
    });
  });

  describe('fetchSavedProfilesByFolder', () => {
    const mockByFolder = {
      'Top Choice': [mockSavedProfile],
      'Strong Maybe': [],
      'Considering': [],
      'Backup': [],
    };

    it('should set loading to true when pending', () => {
      store.dispatch(fetchSavedProfilesByFolder.pending('', undefined));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.loading).toBe(true);
    });

    it('should update savedProfilesByFolder when fulfilled', () => {
      store.dispatch(fetchSavedProfilesByFolder.fulfilled(mockByFolder, '', undefined));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.loading).toBe(false);
      expect(state.savedProfilesByFolder).toEqual(mockByFolder);
    });
  });

  describe('saveProfile', () => {
    it('should set saving to true when pending', () => {
      store.dispatch(saveProfile.pending('', { profileId: 'profile-456' }));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.saving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add profile to savedProfiles when fulfilled', () => {
      store.dispatch(saveProfile.fulfilled(mockSavedProfile, '', { profileId: 'profile-456' }));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.saving).toBe(false);
      expect(state.savedProfiles).toContainEqual(mockSavedProfile);
    });

    it('should set error when rejected', () => {
      const error = new Error('Limit reached');
      store.dispatch(saveProfile.rejected(error, '', { profileId: 'profile-456' }));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.saving).toBe(false);
      expect(state.error).toBe('Limit reached');
    });
  });

  describe('updateSavedProfile', () => {
    it('should set updating to true when pending', () => {
      store.dispatch(updateSavedProfile.pending('', { id: 'saved-1' }));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.updating).toBe(true);
    });

    it('should update profile in state when fulfilled', () => {
      store.dispatch(saveProfile.fulfilled(mockSavedProfile, '', { profileId: 'profile-456' }));
      const updated = { ...mockSavedProfile, folder: 'Backup' as const };
      store.dispatch(updateSavedProfile.fulfilled(updated, '', { id: 'saved-1', folder: 'Backup' }));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.updating).toBe(false);
      expect(state.savedProfiles[0].folder).toBe('Backup');
    });
  });

  describe('removeSavedProfile', () => {
    it('should set removing to true when pending', () => {
      store.dispatch(removeSavedProfile.pending('', 'saved-1'));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.removing).toBe(true);
    });

    it('should remove profile from state when fulfilled', () => {
      store.dispatch(saveProfile.fulfilled(mockSavedProfile, '', { profileId: 'profile-456' }));
      store.dispatch(removeSavedProfile.fulfilled('saved-1', '', 'saved-1'));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.removing).toBe(false);
      expect(state.savedProfiles).toHaveLength(0);
    });
  });

  describe('compareProfiles', () => {
    it('should set comparing to true when pending', () => {
      store.dispatch(compareProfiles.pending('', ['saved-1', 'saved-2']));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.comparing).toBe(true);
    });

    it('should update comparisonProfiles when fulfilled', () => {
      store.dispatch(compareProfiles.fulfilled([mockCompareProfile], '', ['saved-1']));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.comparing).toBe(false);
      expect(state.comparisonProfiles).toEqual([mockCompareProfile]);
    });

    it('should set error when rejected', () => {
      const error = new Error('Invalid comparison');
      store.dispatch(compareProfiles.rejected(error, '', ['saved-1']));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.comparing).toBe(false);
      expect(state.error).toBe('Invalid comparison');
    });
  });

  describe('fetchLimitStatus', () => {
    it('should update limitStatus when fulfilled', () => {
      store.dispatch(fetchLimitStatus.fulfilled(mockLimitStatus, '', undefined));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.limitStatus).toEqual(mockLimitStatus);
    });
  });

  describe('checkIfSaved', () => {
    it('should handle check result', () => {
      const result = { isSaved: true, savedProfileId: 'saved-1' };
      store.dispatch(checkIfSaved.fulfilled(result, '', 'profile-456'));

      // This thunk doesn't update state directly, it's used for checking
      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.error).toBeNull();
    });
  });

  describe('getNotes', () => {
    it('should update notes in savedProfiles when fulfilled', () => {
      store.dispatch(saveProfile.fulfilled(mockSavedProfile, '', { profileId: 'profile-456' }));
      store.dispatch(getNotes.fulfilled({ id: 'saved-1', notes: 'Decrypted notes' }, '', 'saved-1'));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.savedProfiles[0].notes_encrypted).toBe('Decrypted notes');
    });
  });

  describe('synchronous actions', () => {
    it('should clear error', () => {
      const error = new Error('Test error');
      store.dispatch(fetchSavedProfiles.rejected(error, '', undefined));
      store.dispatch(clearError());

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.error).toBeNull();
    });

    it('should clear comparison', () => {
      store.dispatch(compareProfiles.fulfilled([mockCompareProfile], '', ['saved-1']));
      store.dispatch(clearComparison());

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.comparisonProfiles).toEqual([]);
    });

    it('should update saved profile locally', () => {
      store.dispatch(saveProfile.fulfilled(mockSavedProfile, '', { profileId: 'profile-456' }));
      const updated = { ...mockSavedProfile, notes_encrypted: 'Updated locally' };
      store.dispatch(updateSavedProfileLocal(updated));

      const state = store.getState().savedProfiles as SavedProfilesState;
      expect(state.savedProfiles[0].notes_encrypted).toBe('Updated locally');
    });
  });
});
