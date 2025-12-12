/**
 * OAuth API Service
 *
 * Purpose: OAuth authentication with Google and Apple Sign In
 * Constitution: Principle IV (Performance - <200ms API calls P95)
 *              Principle II (Security - Token-based auth, nonce validation)
 *
 * Endpoints:
 * - POST /api/auth/oauth/google - Google OAuth Sign In
 * - POST /api/auth/oauth/apple - Apple OAuth Sign In
 *
 * Features:
 * - Google Sign In with ID token verification
 * - Apple Sign In with nonce-based replay protection
 * - Automatic token storage via tokenStorage
 * - Comprehensive error handling and user-friendly messages
 *
 * Created: 2025-10-13
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';
import axios from 'axios';
import tokenStorage from '../tokenStorage';
import type { GoogleAuthRequest, AppleAuthRequest, AuthSuccessResponse } from '../../types/oauth';
import { OAuthError } from '../../types/oauth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Google OAuth Configuration
 * WebClientId should match backend GOOGLE_CLIENT_ID
 */
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID || 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

/**
 * Configure Google Sign In
 * Must be called at app startup before using signInWithGoogle()
 */
export const configureGoogleSignIn = () => {
  try {
    // Only configure if credentials are provided (not placeholder values)
    if (GOOGLE_WEB_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID.includes('YOUR_GOOGLE_WEB_CLIENT_ID')) {
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
      console.log('✅ Google Sign-In configured successfully');
    } else {
      console.warn(
        '⚠️ Google Sign-In not configured: GOOGLE_WEB_CLIENT_ID not set. Google OAuth will not work until configured.'
      );
    }
  } catch (error) {
    console.error('❌ Failed to configure Google Sign-In:', error);
    // Don't crash the app - just log the error
  }
};

// Auto-configure on module load (safe with try-catch)
configureGoogleSignIn();

/**
 * Sign in with Google
 *
 * @returns AuthSuccessResponse with user and tokens
 * @throws OAuthError with code and message
 */
export const signInWithGoogle = async (): Promise<AuthSuccessResponse> => {
  try {
    // Step 1: Check Google Play Services
    await GoogleSignin.hasPlayServices();

    // Step 2: Sign in with Google (opens Google Sign In UI)
    const userInfo = await GoogleSignin.signIn();

    // Step 3: Extract ID token
    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      throw new OAuthError(
        'google_signin_failed',
        'Failed to get ID token from Google Sign In',
        500
      );
    }

    // Step 4: Send ID token to backend
    const request: GoogleAuthRequest = { idToken };
    const response = await axios.post<AuthSuccessResponse>(
      `${API_BASE_URL}/auth/oauth/google`,
      request
    );

    // Step 5: Store tokens securely
    if (response.data.success && response.data.tokens) {
      await tokenStorage.setTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        userId: response.data.user.id,
      });
    }

    // Step 6: Return user and metadata
    return response.data;
  } catch (error: any) {
    // Handle Google Sign In cancellation
    if (error.code === 'SIGN_IN_CANCELLED') {
      throw new OAuthError('user_cancelled', 'Google Sign In was cancelled', 400);
    }

    // Handle network errors
    if (error.code === 'NETWORK_ERROR') {
      throw new OAuthError(
        'network_error',
        'Network error during Google Sign In. Please check your connection.',
        503
      );
    }

    // Handle backend API errors
    if (error.response?.data) {
      const apiError = error.response.data;

      // Account conflict (409)
      if (apiError.error === 'conflict') {
        throw new OAuthError(
          'account_conflict',
          apiError.message || 'This email is already associated with a different sign-in method',
          409
        );
      }

      // Unauthorized (401)
      if (apiError.error === 'unauthorized') {
        throw new OAuthError('invalid_token', 'Google Sign In failed. Please try again.', 401);
      }

      // Rate limiting (429)
      if (error.response.status === 429) {
        throw new OAuthError(
          'rate_limit_exceeded',
          'Too many sign-in attempts. Please try again later.',
          429
        );
      }

      // Generic API error
      throw new OAuthError(
        'api_error',
        apiError.message || 'Sign in failed. Please try again.',
        error.response.status || 500
      );
    }

    // Unknown error
    throw new OAuthError(
      'unknown_error',
      'An unexpected error occurred during Google Sign In',
      500
    );
  }
};

/**
 * Sign in with Apple (iOS only)
 *
 * @returns AuthSuccessResponse with user and tokens
 * @throws OAuthError with code and message
 */
export const signInWithApple = async (): Promise<AuthSuccessResponse> => {
  // Step 1: Platform check (Apple Sign In is iOS-only)
  if (Platform.OS !== 'ios') {
    throw new OAuthError('platform_not_supported', 'Apple Sign In is only available on iOS', 400);
  }

  try {
    // Step 2: Generate nonce for replay attack prevention
    const nonce = generateNonce();

    // Step 3: Perform Apple Sign In request
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      nonce,
    });

    // Step 4: Get credential state (check if user is authorized)
    const credentialState = await appleAuth.getCredentialStateForUser(
      appleAuthRequestResponse.user
    );

    if (credentialState !== appleAuth.State.AUTHORIZED) {
      throw new OAuthError('apple_signin_failed', 'Apple Sign In authorization failed', 401);
    }

    // Step 5: Extract identity token
    const { identityToken, fullName } = appleAuthRequestResponse;

    if (!identityToken) {
      throw new OAuthError(
        'apple_signin_failed',
        'Failed to get identity token from Apple Sign In',
        500
      );
    }

    // Step 6: Send identity token to backend
    const request: AppleAuthRequest = {
      identityToken,
      nonce,
      fullName: fullName
        ? {
            givenName: fullName.givenName || undefined,
            familyName: fullName.familyName || undefined,
          }
        : undefined,
    };

    const response = await axios.post<AuthSuccessResponse>(
      `${API_BASE_URL}/auth/oauth/apple`,
      request
    );

    // Step 7: Store tokens securely
    if (response.data.success && response.data.tokens) {
      await tokenStorage.setTokens({
        accessToken: response.data.tokens.accessToken,
        refreshToken: response.data.tokens.refreshToken,
        userId: response.data.user.id,
      });
    }

    // Step 8: Return user and metadata
    return response.data;
  } catch (error: any) {
    // Handle Apple Sign In cancellation
    if (error.code === '1001') {
      throw new OAuthError('user_cancelled', 'Apple Sign In was cancelled', 400);
    }

    // Handle backend API errors
    if (error.response?.data) {
      const apiError = error.response.data;

      // Account conflict (409)
      if (apiError.error === 'conflict') {
        throw new OAuthError(
          'account_conflict',
          apiError.message || 'This email is already associated with a different sign-in method',
          409
        );
      }

      // Unauthorized (401)
      if (apiError.error === 'unauthorized') {
        throw new OAuthError('invalid_token', 'Apple Sign In failed. Please try again.', 401);
      }

      // Rate limiting (429)
      if (error.response.status === 429) {
        throw new OAuthError(
          'rate_limit_exceeded',
          'Too many sign-in attempts. Please try again later.',
          429
        );
      }

      // Generic API error
      throw new OAuthError(
        'api_error',
        apiError.message || 'Sign in failed. Please try again.',
        error.response.status || 500
      );
    }

    // OAuthError (already formatted)
    if (error instanceof OAuthError) {
      throw error;
    }

    // Unknown error
    throw new OAuthError('unknown_error', 'An unexpected error occurred during Apple Sign In', 500);
  }
};

/**
 * Generate a random nonce for Apple Sign In
 * Used to prevent replay attacks
 *
 * @returns 32-character random string
 */
const generateNonce = (): string => {
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
  let result = '';

  // Generate 32 random characters
  for (let i = 0; i < 32; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return result;
};

/**
 * Check if Google Sign In is available
 * Useful for conditionally showing Google Sign In button
 */
export const isGoogleSignInAvailable = async (): Promise<boolean> => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if Apple Sign In is available
 * Only available on iOS 13+
 */
export const isAppleSignInAvailable = (): boolean => {
  return Platform.OS === 'ios' && appleAuth.isSupported;
};

/**
 * Sign out from Google (revoke access)
 * Call this when user logs out to clear Google session
 */
export const signOutGoogle = async (): Promise<void> => {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('Google sign out failed:', error);
  }
};
