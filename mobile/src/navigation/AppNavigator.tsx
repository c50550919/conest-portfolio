/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest/SafeNest App Navigator
 * Main navigation structure with authentication flow
 *
 * Navigation Flow:
 * 1. Not authenticated → Auth screens (Login/Signup)
 * 2. Authenticated but not onboarded → Onboarding flow
 * 3. Authenticated and onboarded → Main app
 *
 * Created: 2025-10-08 (Updated with auth flow)
 */

import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { createNavigationContainerRef } from '@react-navigation/native';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import SlimOnboardingNavigator from './SlimOnboardingNavigator';
import MainNavigator from './MainNavigator';
import LoadingScreen from '../components/common/LoadingScreen';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { theme } from '../theme';

// Deep linking configuration for Universal Links (iOS) and App Links (Android)
// Screen names must match the actual navigator screen names exactly
const linking = {
  prefixes: ['conest://', 'safenest://', 'https://conest.app', 'https://safenest.app'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: {
            screens: {
              ConnectionRequests: 'connections',
            },
          },
          Discover: 'discover',
          Messages: {
            screens: {
              ConversationsList: 'messages',
              Chat: 'messages/:conversationId',
            },
          },
          Household: {
            screens: {
              HouseholdMain: 'household',
              ViewInvitation: 'household/invite/:invitationId',
            },
          },
          Profile: {
            screens: {
              Verification: {
                screens: {
                  EmailVerification: 'verify-email/:token',
                  Dashboard: 'verification',
                  PhoneVerification: 'verify-phone',
                  IDVerification: 'verify-id',
                  BackgroundCheck: 'background-check',
                  IncomeVerification: 'income-verification',
                },
              },
            },
          },
        },
      },
    },
  },
};
import { analytics } from '../services/analytics';
import tokenStorage from '../services/tokenStorage';
import { loginSuccess } from '../store/slices/authSlice';
import socketService from '../services/socket';
import {
  initializeMessagingSocket,
  cleanupMessagingSocket,
} from '../services/messaging/socketIntegration';
import {
  initializeModerationSocket,
  cleanupModerationSocket,
} from '../services/moderation/moderationSocketIntegration';
import { mobilePushService } from '../services/pushNotificationService';
import { notificationAPI } from '../services/api/notificationAPI';

// Navigation reference for programmatic navigation (including E2E tests)
export const navigationRef = createNavigationContainerRef();

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  SlimOnboarding: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isOnboardingComplete, isOAuthUser } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize PostHog analytics (fire-and-forget, non-blocking)
  useEffect(() => {
    analytics.init();
  }, []);

  /**
   * Check for existing auth tokens on app launch
   * Restore authentication state if valid tokens exist
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const tokens = await tokenStorage.getTokens();

        if (tokens) {
          // TODO: Verify token validity with API
          // For now, just restore authenticated state
          dispatch(
            loginSuccess({
              user: {
                id: tokens.userId,
                email: '', // Will be populated from API
                firstName: '',
                lastName: '',
                profileComplete: true, // Assume complete if tokens exist
                phoneVerified: true,
                idVerified: true,
                backgroundCheckVerified: true,
              },
            })
          );
        }
      } catch (error) {
        console.error('[AppNavigator] Failed to restore auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  /**
   * Initialize Socket.io and messaging integration when authenticated
   * NON-BLOCKING: Socket connects in background while navigation proceeds
   * Cleanup when user logs out
   */
  useEffect(() => {
    let unsubscribeForeground: (() => void) | null = null;
    let unsubscribeTokenRefresh: (() => void) | null = null;

    if (isAuthenticated && isOnboardingComplete) {
      console.log('[AppNavigator] Initializing Socket.io (non-blocking)...');

      // Don't await - let socket connect in background while navigation proceeds
      socketService
        .connect()
        .then(() => {
          console.log('[AppNavigator] Socket connected, initializing integrations');
          // Initialize socket event listeners after connection established
          initializeMessagingSocket();
          initializeModerationSocket();
        })
        .catch((error) => {
          // Socket has built-in reconnection, log and continue
          console.warn('[AppNavigator] Socket connection failed, will retry:', error);
        });

      // Register push notification token (non-blocking)
      mobilePushService.registerToken();
      unsubscribeForeground = mobilePushService.setupForegroundHandler();
      unsubscribeTokenRefresh = mobilePushService.onTokenRefresh(async (newToken) => {
        try {
          await notificationAPI.registerDeviceToken(
            newToken,
            Platform.OS as 'ios' | 'android',
          );
        } catch (error) {
          console.warn('[AppNavigator] Token refresh registration failed:', error);
        }
      });
    } else {
      // User logged out or onboarding incomplete, cleanup socket connections
      console.log('[AppNavigator] Cleaning up socket connections...');
      cleanupMessagingSocket();
      cleanupModerationSocket();
      socketService.disconnect();

      // Remove push token on logout
      mobilePushService.unregisterToken();
    }

    // Cleanup on unmount
    return () => {
      cleanupMessagingSocket();
      cleanupModerationSocket();
      socketService.disconnect();
      if (unsubscribeForeground) unsubscribeForeground();
      if (unsubscribeTokenRefresh) unsubscribeTokenRefresh();
    };
  }, [isAuthenticated, isOnboardingComplete]);

  // Expose navigation for E2E tests (test builds only)
  useEffect(() => {
    if (__DEV__) {
      // @ts-ignore - global for testing only
      global.__navigateForTesting = (screen: string) => {
        if (navigationRef.isReady()) {
          // @ts-ignore
          navigationRef.navigate('Main', { screen });
        }
      };
    }
  }, []);

  // Show branded loading screen while checking auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onStateChange={() => {
          const currentRoute = navigationRef.current?.getCurrentRoute();
          if (currentRoute) {
            analytics.screen(currentRoute.name);
          }
        }}
        theme={{
          dark: false,
          colors: {
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.surface,
            text: theme.colors.onSurface,
            border: theme.colors.outline,
            notification: theme.colors.error,
          },
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {!isAuthenticated ? (
            // Auth Flow: Not authenticated
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ animationEnabled: false }}
            />
          ) : !isOnboardingComplete && isOAuthUser ? (
            // Slim Onboarding: OAuth user with incomplete profile (2 steps)
            <Stack.Screen
              name="SlimOnboarding"
              component={SlimOnboardingNavigator}
              options={{ animationEnabled: false }}
            />
          ) : !isOnboardingComplete ? (
            // Full Onboarding: Email/password user with incomplete profile (8 steps)
            <Stack.Screen
              name="Onboarding"
              component={OnboardingNavigator}
              options={{ animationEnabled: false }}
            />
          ) : (
            // Main App: Authenticated and onboarded
            <Stack.Screen
              name="Main"
              component={MainNavigator}
              options={{ animationEnabled: false }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default AppNavigator;
