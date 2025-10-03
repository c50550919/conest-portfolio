/**
 * Auth Slice
 * Manages authentication state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  token: string | null;
  refreshToken: string | null;
  userId: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isOnboardingComplete: false,
  token: null,
  refreshToken: null,
  userId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        token: string;
        refreshToken: string;
        userId: string;
      }>
    ) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.userId = action.payload.userId;
    },
    setOnboardingComplete: (state, action: PayloadAction<boolean>) => {
      state.isOnboardingComplete = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.isOnboardingComplete = false;
      state.token = null;
      state.refreshToken = null;
      state.userId = null;
    },
  },
});

export const { setAuth, setOnboardingComplete, logout } = authSlice.actions;
export default authSlice.reducer;
