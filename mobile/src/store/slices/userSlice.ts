/**
 * User Slice
 * Manages user profile state
 * CRITICAL: NO child data stored - parent profiles only
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio?: string;
  profilePhoto?: string;
  childrenCount: number;
  childrenAgeGroups: string[];
  workSchedule?: Record<string, any>;
  parentingStyle?: string;
  householdPreferences?: Record<string, any>;
  verifiedStatus: 'pending' | 'partial' | 'verified';
  backgroundCheckStatus: 'pending' | 'approved' | 'expired';
}

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
    },
    updateUserProfile: (
      state,
      action: PayloadAction<Partial<UserProfile>>
    ) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearUserProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
});

export const {
  setUserProfile,
  updateUserProfile,
  setLoading,
  setError,
  clearUserProfile,
} = userSlice.actions;
export default userSlice.reducer;
