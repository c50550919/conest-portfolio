/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Auth Slice
 * Manages authentication state and user profile
 *
 * Constitution: Principle I (Child Safety - NO child PII in state)
 *              Principle IV (Performance - optimized state updates)
 *
 * State includes:
 * - Authentication status and tokens
 * - User profile data (parent info only)
 * - Onboarding completion status
 * - Loading and error states
 *
 * Created: 2025-10-08 (Enhanced with user profile)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileComplete: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  backgroundCheckVerified: boolean;
  isOAuthUser?: boolean;
  onboardingRequired?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  isOAuthUser: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isOnboardingComplete: false,
  isOAuthUser: false,
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: User; isOAuthUser?: boolean }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isOAuthUser = action.payload.isOAuthUser ?? false;
      state.isOnboardingComplete = action.payload.user.profileComplete;
      state.loading = false;
      state.error = null;
    },
    oauthLoginSuccess: (state, action: PayloadAction<{ user: User; onboardingRequired: boolean }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isOAuthUser = true;
      state.isOnboardingComplete = !action.payload.onboardingRequired;
      state.loading = false;
      state.error = null;
    },
    registerSuccess: (state, action: PayloadAction<{ user: User }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.isOAuthUser = false;
      state.isOnboardingComplete = false;
      state.loading = false;
      state.error = null;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.isOnboardingComplete = action.payload;
      if (state.user) {
        state.user.profileComplete = action.payload;
      }
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isOnboardingComplete = false;
      state.isOAuthUser = false;
      state.user = null;
      state.loading = false;
      state.error = null;
    },
    refreshTokenSuccess: (state) => {
      // Tokens are handled by tokenStorage service
      // This action just confirms token refresh
      state.isAuthenticated = true;
      state.error = null;
    },
  },
});

export const {
  loginSuccess,
  oauthLoginSuccess,
  registerSuccess,
  setOnboardingComplete,
  updateUser,
  setLoading,
  setError,
  clearError,
  logout,
  refreshTokenSuccess,
} = authSlice.actions;

export default authSlice.reducer;
