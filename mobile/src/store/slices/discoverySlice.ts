import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * ProfileCard interface for Discovery Screen
 *
 * CHILD SAFETY (Constitution Principle I):
 * - Contains ONLY childrenCount (integer) and childrenAgeGroups (generic ranges)
 * - NO child PII: childrenNames, childrenPhotos, childrenAges, childrenSchools
 */
export interface ProfileCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  profilePhotoUrl: string;
  distanceMeters: number;
  childrenCount: number; // Generic integer only
  childrenAgeGroups: ('toddler' | 'elementary' | 'teen')[]; // Generic ranges only
  idVerified: boolean;
  backgroundCheckVerified: boolean;
  phoneVerified: boolean;
  compatibilityScore: number; // 0-100
}

interface DiscoveryState {
  profiles: ProfileCard[];
  currentIndex: number;
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
}

const initialState: DiscoveryState = {
  profiles: [],
  currentIndex: 0,
  loading: false,
  error: null,
  nextCursor: null,
};

/**
 * Discovery Slice
 *
 * Manages parent profile data for Browse Discovery Screen
 *
 * Note: Browse-based discovery (deliberate browsing, no swipe gestures)
 * Created: 2025-10-06
 * Updated: 2025-10-13 - Removed swipeable references
 */
const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    setProfiles: (state, action: PayloadAction<{ profiles: ProfileCard[]; nextCursor: string | null }>) => {
      state.profiles = action.payload.profiles;
      state.nextCursor = action.payload.nextCursor;
      state.currentIndex = 0;
      state.error = null;
    },
    appendProfiles: (state, action: PayloadAction<{ profiles: ProfileCard[]; nextCursor: string | null }>) => {
      state.profiles = [...state.profiles, ...action.payload.profiles];
      state.nextCursor = action.payload.nextCursor;
    },
    incrementIndex: (state) => {
      if (state.currentIndex < state.profiles.length - 1) {
        state.currentIndex += 1;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetDiscovery: (state) => {
      state.profiles = [];
      state.currentIndex = 0;
      state.loading = false;
      state.error = null;
      state.nextCursor = null;
    },
  },
});

export const {
  setProfiles,
  appendProfiles,
  incrementIndex,
  setLoading,
  setError,
  resetDiscovery,
} = discoverySlice.actions;

export default discoverySlice.reducer;
