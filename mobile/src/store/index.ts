/**
 * Redux Store Configuration
 * Using Redux Toolkit for state management
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import enhancedMessagesReducer from './slices/enhancedMessagesSlice';
import householdReducer from './slices/householdSlice';
import browseDiscoveryReducer from './slices/browseDiscoverySlice';
import savedProfilesReducer from './slices/savedProfilesSlice';
import connectionRequestsReducer from './slices/connectionRequestsSlice';
import verificationReducer from './slices/verificationSlice';
import moderationReducer from './slices/moderationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    enhancedMessages: enhancedMessagesReducer,
    household: householdReducer,
    browseDiscovery: browseDiscoveryReducer,
    savedProfiles: savedProfilesReducer,
    connectionRequests: connectionRequestsReducer,
    verification: verificationReducer,
    moderation: moderationReducer,
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
