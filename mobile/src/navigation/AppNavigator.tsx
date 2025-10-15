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
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { createNavigationContainerRef } from '@react-navigation/native';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainNavigator from './MainNavigator';
import { theme } from '../theme';
import tokenStorage from '../services/tokenStorage';
import { loginSuccess } from '../store/slices/authSlice';

// Navigation reference for programmatic navigation (including E2E tests)
export const navigationRef = createNavigationContainerRef();

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isOnboardingComplete } = useSelector(
    (state: RootState) => state.auth
  );
  const [isLoading, setIsLoading] = useState(true);


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

  // Show splash screen while checking auth
  if (isLoading) {
    return null; // TODO: Replace with proper SplashScreen component
  }

  return (
    <NavigationContainer
      ref={navigationRef}
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
        ) : !isOnboardingComplete ? (
          // Onboarding Flow: Authenticated but profile incomplete
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
  );
};

export default AppNavigator;
