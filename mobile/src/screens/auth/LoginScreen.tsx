/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Login Screen
 *
 * Purpose: User authentication with email/password and OAuth (Google/Apple)
 * Constitution: Principle IV (Performance - <500ms screen transitions)
 *              Principle II (Security - secure credential handling)
 *
 * Features:
 * - Email/password input validation
 * - Google Sign In OAuth integration
 * - Apple Sign In OAuth integration (iOS only)
 * - Biometric authentication (optional)
 * - Error handling with user feedback
 * - Navigation to Signup or Main app
 *
 * Updated: 2025-10-13 (Added OAuth integration)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

// Logo asset
const CoNestLogo = require('../../assets/images/conest-logo.png');
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import authAPI from '@services/api/auth';
import { loginSuccess, setLoading, setError } from '@store/slices/authSlice';
import { theme } from '@theme';
// Temporarily disabled OAuth for testing comparison flow
// import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
// import AppleSignInButton from '../../components/auth/AppleSignInButton';
// import { configureGoogleSignIn } from '../../services/api/oauth';
// import type { AuthSuccessResponse } from '../../types/oauth';

type LoginScreenNavigationProp = StackNavigationProp<any, 'Login'>;

const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoadingState] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  /**
   * Configure Google Sign In at component mount
   */
  // Temporarily disabled for testing
  // useEffect(() => {
  //   configureGoogleSignIn();
  // }, []);

  /**
   * Handle successful OAuth authentication
   * Dispatches login success and navigates based on user status
   */
  // Temporarily disabled for testing
  // const handleOAuthSuccess = (response: AuthSuccessResponse) => {
  //   // Update Redux state with OAuth user data
  //   dispatch(
  //     loginSuccess({
  //       user: {
  //         id: response.user.id,
  //         email: response.user.email,
  //         firstName: '', // OAuth users may not have firstName initially
  //         lastName: '',
  //         profileComplete: !response.isNew, // New users need to complete profile
  //         phoneVerified: response.user.phoneVerified,
  //         idVerified: false,
  //         backgroundCheckVerified: false,
  //       },
  //     })
  //   );

  //   // Show success message if account was linked
  //   if (response.linked) {
  //     Alert.alert(
  //       'Account Linked',
  //       'Your OAuth provider has been successfully linked to your existing account.'
  //     );
  //   }

  //   // Navigation handled by AppNavigator based on profileComplete status
  //   // New users (isNew=true) will be directed to onboarding
  //   // Returning users will go directly to home
  // };

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    // Validate inputs
    if (!validateForm()) {
      return;
    }

    setLoadingState(true);
    dispatch(setLoading(true));

    try {
      const response = await authAPI.login({
        email: email.trim(),
        password,
      });

      // Update Redux state with user data
      dispatch(
        loginSuccess({
          user: {
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            profileComplete: response.user.profileComplete,
            phoneVerified: false, // Will be updated during onboarding
            idVerified: false,
            backgroundCheckVerified: false,
          },
        })
      );
      // Note: Navigation happens automatically via AppNavigator conditional rendering
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';

      dispatch(setError(errorMessage));
      Alert.alert('Login Error', errorMessage);
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  /**
   * Navigate to signup screen
   */
  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* App Logo/Title */}
        <View style={styles.header}>
          <Image source={CoNestLogo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>CoNest</Text>
          <Text style={styles.subtitle}>Welcome back</Text>
        </View>

        {/* OAuth Sign In Buttons - Temporarily disabled for testing */}
        {/* <View style={styles.oauthContainer}>
          <GoogleSignInButton
            onSuccess={handleOAuthSuccess}
            disabled={loading}
            style="dark"
          />
          <View style={styles.oauthSpacing} />
          <AppleSignInButton
            onSuccess={handleOAuthSuccess}
            disabled={loading}
            style="black"
          />
        </View> */}

        {/* Divider - Temporarily hidden */}
        {/* <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View> */}

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, validationErrors.email ? styles.inputError : undefined]}
            placeholder="Enter your email"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (validationErrors.email) {
                setValidationErrors({ ...validationErrors, email: undefined });
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            testID="email-input"
          />
          {validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, validationErrors.password ? styles.inputError : undefined]}
            placeholder="Enter your password"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (validationErrors.password) {
                setValidationErrors({ ...validationErrors, password: undefined });
              }
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            testID="password-input"
          />
          {validationErrors.password && (
            <Text style={styles.errorText}>{validationErrors.password}</Text>
          )}
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          testID="login-button"
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Signup Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignup} disabled={loading} testID="signup-link">
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.onSurface,
    backgroundColor: theme.colors.surface,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  button: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onPrimary,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  signupText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  oauthContainer: {
    marginBottom: theme.spacing.lg,
  },
  oauthSpacing: {
    height: theme.spacing.md,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.outline,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
});

export default LoginScreen;
