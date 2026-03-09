/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * User Slice
 * Manages user profile state and onboarding data
 * CRITICAL: NO child PII stored - parent profiles only (Constitution Principle I)
 *
 * Onboarding Flow:
 * 1. ProfileSetup → basic info (name, email, bio)
 * 2. ChildrenInfo → children count & age groups (FHA compliant - optional)
 * 3. Location/Budget → city, state, budget
 * 4. Final submission → API call to create profile
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Full user profile from backend
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio?: string;
  occupation?: string;
  profilePhoto?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // FHA COMPLIANT: Optional child data (not used in matching scores)
  childrenCount: number;
  childrenAgeGroups: string[];
  workSchedule?: Record<string, unknown>;
  parentingStyle?: string;
  householdPreferences?: Record<string, unknown>;
  budgetMin?: number;
  budgetMax?: number;
  // Housing status fields
  housingStatus?: 'has_room' | 'looking' | null;
  roomRentShare?: number;
  roomAvailableDate?: string;
  roomDescription?: string;
  // Profile completion tracking
  profileCompletionPercentage?: number;
  verifiedStatus: 'pending' | 'partial' | 'verified';
  backgroundCheckStatus: 'pending' | 'approved' | 'expired';
}

/**
 * Temporary onboarding data collected across multiple screens
 * Stored locally until final profile creation
 */
export interface OnboardingData {
  // Step 1: Basic Info (ProfileSetupScreen)
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  occupation?: string;
  dateOfBirth?: string;
  // Step 2: Children Info (ChildrenInfoScreen) - FHA COMPLIANT
  childrenCount?: number;
  childrenAgeGroups?: string[];
  // Step 3: Location & Budget
  city?: string;
  state?: string;
  zipCode?: string;
  budgetMin?: number;
  budgetMax?: number;
  // Step 4: Schedule & Lifestyle
  scheduleType?: 'flexible' | 'fixed' | 'shift_work';
  workFromHome?: boolean;
  parentingStyle?: string;
  // Village Living Preferences (Phase 1)
  openToGroupLiving?: boolean;
  preferredHouseholdSize?: number;
  // Profile photo (uploaded separately)
  profilePhotoUri?: string;
}

interface UserState {
  profile: UserProfile | null;
  onboardingData: OnboardingData;
  onboardingStep: number;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  onboardingData: {},
  onboardingStep: 0,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /**
     * Set the complete user profile (from API response)
     */
    setUserProfile: (state, action: PayloadAction<UserProfile>) => {
      state.profile = action.payload;
      // Clear onboarding data after profile is created
      state.onboardingData = {};
      state.onboardingStep = 0;
    },

    /**
     * Update existing user profile (partial update)
     */
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },

    /**
     * Update onboarding data during multi-step onboarding
     * Data is stored locally until final submission
     */
    updateOnboardingData: (state, action: PayloadAction<Partial<OnboardingData>>) => {
      state.onboardingData = { ...state.onboardingData, ...action.payload };
    },

    /**
     * Set current onboarding step for progress tracking
     */
    setOnboardingStep: (state, action: PayloadAction<number>) => {
      state.onboardingStep = action.payload;
    },

    /**
     * Set housing status on user profile
     */
    setHousingStatus: (state, action: PayloadAction<{
      housingStatus: 'has_room' | 'looking' | null;
      roomRentShare?: number;
      roomAvailableDate?: string;
      roomDescription?: string;
    }>) => {
      if (state.profile) {
        state.profile.housingStatus = action.payload.housingStatus;
        state.profile.roomRentShare = action.payload.roomRentShare;
        state.profile.roomAvailableDate = action.payload.roomAvailableDate;
        state.profile.roomDescription = action.payload.roomDescription;
      }
    },

    /**
     * Set profile completion percentage
     */
    setProfileCompletion: (state, action: PayloadAction<number>) => {
      if (state.profile) {
        state.profile.profileCompletionPercentage = action.payload;
      }
    },

    /**
     * Set location data from slim onboarding
     */
    setLocationData: (state, action: PayloadAction<{
      city: string;
      state: string;
      zipCode: string;
    }>) => {
      if (state.profile) {
        state.profile.city = action.payload.city;
        state.profile.state = action.payload.state;
        state.profile.zipCode = action.payload.zipCode;
      }
    },

    /**
     * Set budget data from slim onboarding
     */
    setBudgetData: (state, action: PayloadAction<{
      budgetMin: number;
      budgetMax: number;
      profileCompletionPercentage?: number;
    }>) => {
      if (state.profile) {
        state.profile.budgetMin = action.payload.budgetMin;
        state.profile.budgetMax = action.payload.budgetMax;
        if (action.payload.profileCompletionPercentage != null) {
          state.profile.profileCompletionPercentage = action.payload.profileCompletionPercentage;
        }
      }
    },

    /**
     * Clear onboarding data (on cancel or completion)
     */
    clearOnboardingData: (state) => {
      state.onboardingData = {};
      state.onboardingStep = 0;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Clear all user data (on logout)
     */
    clearUserProfile: (state) => {
      state.profile = null;
      state.onboardingData = {};
      state.onboardingStep = 0;
      state.error = null;
    },
  },
});

export const {
  setUserProfile,
  updateUserProfile,
  updateOnboardingData,
  setOnboardingStep,
  setHousingStatus,
  setProfileCompletion,
  setLocationData,
  setBudgetData,
  clearOnboardingData,
  setLoading,
  setError,
  clearUserProfile,
} = userSlice.actions;

export default userSlice.reducer;
