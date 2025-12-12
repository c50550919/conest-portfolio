/**
 * Apple Sign In Button Component
 *
 * Purpose: OAuth authentication with Apple Sign In (iOS only)
 * Constitution: Principle IV (Performance - <100ms UI response)
 *              Principle II (Security - Token-based authentication with nonce)
 *
 * Features:
 * - Apple Sign In button with official branding (iOS only)
 * - Platform check - returns null on Android
 * - Loading state during OAuth flow
 * - Error handling with user-friendly messages
 * - Automatic token storage on success
 *
 * Created: 2025-10-13
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { AppleButton, appleAuth } from '@invertase/react-native-apple-authentication';
import { signInWithApple } from '../../services/api/oauth';
import type { AuthSuccessResponse } from '../../types/oauth';
import { OAuthError } from '../../types/oauth';

interface AppleSignInButtonProps {
  /** Callback when sign in succeeds */
  onSuccess: (response: AuthSuccessResponse) => void;

  /** Callback when sign in fails */
  onError?: (error: OAuthError) => void;

  /** Disabled state */
  disabled?: boolean;

  /** Button style (black or white) */
  style?: 'black' | 'white' | 'whiteOutline';
}

const AppleSignInButtonComponent: React.FC<AppleSignInButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  style = 'black',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apple Sign In is iOS-only
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
    return null;
  }

  const handleAppleSignIn = async () => {
    if (disabled || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await signInWithApple();

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
          errorMessage = 'Network error. Please check your connection and try again.';
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

  // Get button style constant
  const getButtonStyle = () => {
    switch (style) {
      case 'white':
        return AppleButton.Style.WHITE;
      case 'whiteOutline':
        return AppleButton.Style.WHITE_OUTLINE;
      default:
        return AppleButton.Style.BLACK;
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.buttonContainer,
          disabled && styles.buttonDisabled,
          loading && styles.buttonLoading,
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={style === 'black' ? '#FFFFFF' : '#000000'} size="small" />
            <Text
              style={[
                styles.loadingText,
                style === 'black' ? styles.loadingTextWhite : styles.loadingTextBlack,
              ]}
            >
              Signing in...
            </Text>
          </View>
        ) : (
          <AppleButton
            buttonStyle={getButtonStyle()}
            buttonType={AppleButton.Type.SIGN_IN}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}
      </View>

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
  appleButton: {
    width: '100%',
    height: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLoading: {
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingTextWhite: {
    color: '#FFFFFF',
  },
  loadingTextBlack: {
    color: '#000000',
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

export default AppleSignInButtonComponent;
