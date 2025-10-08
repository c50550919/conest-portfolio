/**
 * Redux Store Configuration
 * Using Redux Toolkit for state management
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import matchesReducer from './slices/matchesSlice';
import messagesReducer from './slices/messagesSlice';
import householdReducer from './slices/householdSlice';
import discoveryReducer from './slices/discoverySlice';
import browseDiscoveryReducer from './slices/browseDiscoverySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    matches: matchesReducer,
    messages: messagesReducer,
    household: householdReducer,
    discovery: discoveryReducer,
    browseDiscovery: browseDiscoveryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['auth/login/fulfilled'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
