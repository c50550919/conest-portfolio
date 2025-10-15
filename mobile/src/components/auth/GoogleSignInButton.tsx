/**
 * Google Sign In Button Component
 *
 * Purpose: OAuth authentication with Google Sign In
 * Constitution: Principle IV (Performance - <100ms UI response)
 *              Principle II (Security - Token-based authentication)
 *
 * Features:
 * - Google Sign In button with official branding
 * - Loading state during OAuth flow
 * - Error handling with user-friendly messages
 * - Automatic token storage on success
 *
 * Created: 2025-10-13
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { signInWithGoogle } from '../../services/api/oauth';
import type { AuthSuccessResponse } from '../../types/oauth';
import { OAuthError } from '../../types/oauth';

interface GoogleSignInButtonProps {
  /** Callback when sign in succeeds */
  onSuccess: (response: AuthSuccessResponse) => void;

  /** Callback when sign in fails */
  onError?: (error: OAuthError) => void;

  /** Disabled state */
  disabled?: boolean;

  /** Button style (dark or light) */
  style?: 'dark' | 'light';
}

const GoogleSignInButtonComponent: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  style = 'dark',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (disabled || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await signInWithGoogle();

      // Success! Call parent callback
      onSuccess(response);
    } catch (err: any) {
      const oauthError = err as OAuthError;

      // Set error message for display
      let errorMessage = oauthError.message;

      // User-friendly error messages
      switch (oauthError.code) {
        case 'user_cancelled':
          // Don't show error for user cancellation
          setLoading(false);
          return;

        case 'account_conflict':
          errorMessage =
            'This email is already registered with a different sign-in method. Please use your email and password to sign in.';
          break;

        case 'network_error':
          errorMessage =
            'Network error. Please check your connection and try again.';
          break;

        case 'rate_limit_exceeded':
          errorMessage = 'Too many attempts. Please wait and try again later.';
          break;

        default:
          errorMessage = 'Sign in failed. Please try again.';
      }

      setError(errorMessage);

      // Call parent error callback if provided
      if (onError) {
        onError(oauthError);
      }

      // Show alert for critical errors
      if (oauthError.code !== 'user_cancelled') {
        Alert.alert('Sign In Failed', errorMessage, [{ text: 'OK' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleGoogleSignIn}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.buttonContainer,
            disabled && styles.buttonDisabled,
            loading && styles.buttonLoading,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#1A73E8" size="small" />
          ) : (
            <GoogleSigninButton
              style={styles.googleButton}
              size={GoogleSigninButton.Size.Wide}
              color={
                style === 'dark'
                  ? GoogleSigninButton.Color.Dark
                  : GoogleSigninButton.Color.Light
              }
              onPress={handleGoogleSignIn}
              disabled={disabled || loading}
            />
          )}
        </View>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  buttonContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    overflow: 'hidden',
  },
  googleButton: {
    width: '100%',
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLoading: {
    backgroundColor: '#F1F3F4',
  },
  errorContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#D93025',
    textAlign: 'center',
  },
});

export default GoogleSignInButtonComponent;
