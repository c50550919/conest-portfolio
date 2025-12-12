/**
 * Signup Screen
 *
 * Purpose: User registration with email and password
 * Constitution: Principle I (Child Safety - NO child PII collection)
 *              Principle IV (Performance - <500ms screen transitions)
 *              Principle II (Security - secure credential handling)
 *
 * CRITICAL CHILD SAFETY REQUIREMENT:
 * - NO child name inputs
 * - NO child photo uploads
 * - NO child age inputs
 * - NO child school inputs
 * - ONLY collect childrenCount + childrenAgeGroups during onboarding
 *
 * Features:
 * - Email/password registration with validation
 * - Phone number input for verification
 * - Error handling with user feedback
 * - Navigation to phone verification or login
 *
 * Created: 2025-10-08
 */

import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import authAPI from '@services/api/auth';
import { registerSuccess, setLoading, setError } from '@store/slices/authSlice';
import { theme } from '@theme';

type SignupScreenNavigationProp = StackNavigationProp<any, 'Signup'>;

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const SignupScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<SignupScreenNavigationProp>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoadingState] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  /**
   * Validate email format
   */
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate phone format (US format)
   */
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[0-9]{10}$/;
    const digitsOnly = phone.replace(/\D/g, '');
    return phoneRegex.test(digitsOnly);
  };

  /**
   * Validate password strength
   */
  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  /**
   * Validate all form inputs
   */
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // First name validation
    if (!firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Invalid email format';
    }

    // Phone validation
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      errors.phone = 'Invalid phone number (10 digits required)';
    }

    // Password validation
    if (!password.trim()) {
      errors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      errors.password =
        'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle signup submission
   */
  const handleSignup = async () => {
    // Validate inputs
    if (!validateForm()) {
      return;
    }

    setLoadingState(true);
    dispatch(setLoading(true));

    try {
      const response = await authAPI.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, ''), // Remove non-digits
        password,
      });

      // Update Redux state with user data
      dispatch(
        registerSuccess({
          user: {
            id: response.user.id,
            email: response.user.email,
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            profileComplete: false,
            phoneVerified: false,
            idVerified: false,
            backgroundCheckVerified: false,
          },
        })
      );

      // Navigate to phone verification
      navigation.navigate('PhoneVerification', { phone: phone.replace(/\D/g, '') });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Signup failed. Please try again.';

      dispatch(setError(errorMessage));
      Alert.alert('Signup Error', errorMessage);
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  /**
   * Navigate to login screen
   */
  const handleLogin = () => {
    navigation.navigate('Login');
  };

  /**
   * Clear validation error for specific field
   */
  const clearError = (field: keyof ValidationErrors) => {
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: undefined });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* App Logo/Title */}
          <View style={styles.header}>
            <Text style={styles.title}>CoNest</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>

          {/* First Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, validationErrors.firstName ? styles.inputError : undefined]}
              placeholder="Enter your first name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                clearError('firstName');
              }}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              testID="first-name-input"
            />
            {validationErrors.firstName && (
              <Text style={styles.errorText}>{validationErrors.firstName}</Text>
            )}
          </View>

          {/* Last Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, validationErrors.lastName ? styles.inputError : undefined]}
              placeholder="Enter your last name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                clearError('lastName');
              }}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              testID="last-name-input"
            />
            {validationErrors.lastName && (
              <Text style={styles.errorText}>{validationErrors.lastName}</Text>
            )}
          </View>

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
                clearError('email');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              testID="email-input"
            />
            {validationErrors.email && (
              <Text style={styles.errorText}>{validationErrors.email}</Text>
            )}
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, validationErrors.phone ? styles.inputError : undefined]}
              placeholder="(555) 123-4567"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                clearError('phone');
              }}
              keyboardType="phone-pad"
              autoCorrect={false}
              editable={!loading}
              testID="phone-input"
            />
            {validationErrors.phone && (
              <Text style={styles.errorText}>{validationErrors.phone}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, validationErrors.password ? styles.inputError : undefined]}
              placeholder="Create a password"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearError('password');
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

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.confirmPassword ? styles.inputError : undefined,
              ]}
              placeholder="Confirm your password"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearError('confirmPassword');
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              testID="confirm-password-input"
            />
            {validationErrors.confirmPassword && (
              <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
            )}
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            testID="signup-button"
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleLogin} disabled={loading} testID="login-link">
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
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
    marginBottom: theme.spacing.md,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  loginText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default SignupScreen;
