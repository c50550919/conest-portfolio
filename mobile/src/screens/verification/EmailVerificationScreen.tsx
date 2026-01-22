/**
 * EmailVerificationScreen
 * Task: T027
 *
 * Email verification via magic link:
 * 1. User requests verification email
 * 2. Email with magic link is sent
 * 3. User clicks link (handled via deep linking)
 * 4. Screen shows pending status
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import {
  sendEmailLink,
  resetEmailVerification,
  fetchVerificationStatus,
  selectEmailVerification,
  selectVerificationLoading,
  selectVerificationError,
  selectVerificationStatus,
  clearError,
} from '../../store/slices/verificationSlice';
import { VerificationStackParamList } from '../../types/verification';
import { AppDispatch } from '../../store';
import type { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<VerificationStackParamList, 'EmailVerification'>;

export const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const emailState = useSelector(selectEmailVerification);
  const status = useSelector(selectVerificationStatus);
  const loading = useSelector(selectVerificationLoading);
  const error = useSelector(selectVerificationError);

  const [countdown, setCountdown] = useState(0);
  const appState = useRef(AppState.currentState);

  const email = route.params?.email || emailState.email || 'your email';

  // Check if already verified
  const isVerified = status?.email_verified === true;

  // Auto-refresh when app comes to foreground (user clicked email link and returned)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - auto-check verification status
        if (emailState.linkSent && !isVerified) {
          dispatch(fetchVerificationStatus()).then((result) => {
            if (
              fetchVerificationStatus.fulfilled.match(result) &&
              result.payload.email_verified
            ) {
              Alert.alert('Success', 'Email verified successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            }
          });
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch, emailState.linkSent, isVerified, navigation]);

  // Auto-refresh when screen gains focus (navigated back from browser/email app)
  useFocusEffect(
    useCallback(() => {
      if (emailState.linkSent && !isVerified) {
        dispatch(fetchVerificationStatus()).then((result) => {
          if (
            fetchVerificationStatus.fulfilled.match(result) &&
            result.payload.email_verified
          ) {
            Alert.alert('Success', 'Email verified successfully!', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          }
        });
      }
    }, [dispatch, emailState.linkSent, isVerified, navigation]),
  );

  // Handle countdown for resend
  useEffect(() => {
    if (emailState.linkExpiry) {
      // Show a 60-second countdown for resend
      const remaining = 60;
      setCountdown(remaining);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [emailState.linkSent, emailState.linkExpiry]);

  // Send email link
  const handleSendEmail = useCallback(async () => {
    dispatch(clearError());
    const result = await dispatch(sendEmailLink());

    if (sendEmailLink.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Failed to send verification email');
    }
  }, [dispatch]);

  // Open email app
  const handleOpenEmail = useCallback(async () => {
    try {
      // Try to open the default mail app
      const url = 'mailto:';
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open email app', 'Please check your email manually.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open email app');
    }
  }, []);

  // Refresh status to check if verified
  const handleRefresh = useCallback(async () => {
    await dispatch(fetchVerificationStatus());

    // Check if now verified
    const currentStatus = await dispatch(fetchVerificationStatus());
    if (
      fetchVerificationStatus.fulfilled.match(currentStatus) &&
      currentStatus.payload.email_verified
    ) {
      Alert.alert('Success', 'Email verified successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [dispatch, navigation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(resetEmailVerification());
      dispatch(clearError());
    };
  }, [dispatch]);

  // If already verified, show success state
  if (isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={[styles.iconContainer, styles.iconSuccess]}>
              <Icon name="email-check" size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>Email Verified!</Text>
            <Text style={styles.subtitle}>Your email address has been successfully verified.</Text>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Done
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header} accessibilityRole="header">
          <View style={styles.iconContainer} accessibilityElementsHidden>
            <Icon name="email-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Verify Your Email
          </Text>
          <Text style={styles.subtitle}>
            {emailState.linkSent
              ? `We've sent a verification link to ${email}`
              : `We'll send a verification link to ${email}`}
          </Text>
        </View>

        {emailState.linkSent ? (
          /* Link Sent State */
          <View style={styles.sentSection}>
            {/* Status card */}
            <View
              style={styles.statusCard}
              accessible
              accessibilityLabel="Check your inbox. Click the verification link in the email we sent you."
            >
              <Icon name="email-send" size={32} color={colors.primary} />
              <Text style={styles.statusTitle}>Check your inbox</Text>
              <Text style={styles.statusText}>
                Click the verification link in the email we sent you.
              </Text>
            </View>

            {/* Open email button */}
            <Button
              mode="outlined"
              onPress={handleOpenEmail}
              style={styles.openEmailButton}
              contentStyle={styles.buttonContent}
              icon="email-open"
            >
              Open Email App
            </Button>

            {/* Refresh status */}
            <TouchableOpacity
              onPress={handleRefresh}
              style={styles.refreshButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh status. Tap if you already clicked the verification link."
            >
              <Icon name="refresh" size={16} color={colors.primary} />
              <Text style={styles.refreshText}>Already clicked the link? Refresh status</Text>
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity
              onPress={handleSendEmail}
              disabled={countdown > 0 || loading}
              style={styles.resendButton}
              accessibilityRole="button"
              accessibilityLabel={
                countdown > 0
                  ? `Resend email available in ${countdown} seconds`
                  : "Didn't receive it? Tap to send again"
              }
              accessibilityState={{ disabled: countdown > 0 || loading }}
            >
              <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                {countdown > 0 ? `Resend email in ${countdown}s` : "Didn't receive it? Send again"}
              </Text>
            </TouchableOpacity>

            {/* Tips */}
            <View
              style={styles.tipsContainer}
              accessible
              accessibilityLabel="Tips: Check your spam or junk folder. Make sure your email address is correct. The link expires in 24 hours."
            >
              <Text style={styles.tipsTitle}>Tips:</Text>
              <Text style={styles.tipText}>• Check your spam/junk folder</Text>
              <Text style={styles.tipText}>• Make sure your email address is correct</Text>
              <Text style={styles.tipText}>• The link expires in 24 hours</Text>
            </View>
          </View>
        ) : (
          /* Initial State */
          <View style={styles.sendSection}>
            {error && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              mode="contained"
              onPress={handleSendEmail}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              testID="send-email-button"
            >
              Send Verification Email
            </Button>
          </View>
        )}

        {/* Back button */}
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          testID="back-button"
        >
          Cancel
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconSuccess: {
    backgroundColor: `${colors.success}15`,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  sentSection: {
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.lg,
  },
  statusTitle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statusText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  openEmailButton: {
    width: '100%',
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  refreshText: {
    ...typography.body2,
    color: colors.primary,
  },
  resendButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  resendText: {
    ...typography.body2,
    color: colors.primary,
  },
  resendTextDisabled: {
    color: colors.text.disabled,
  },
  tipsContainer: {
    backgroundColor: `${colors.info}10`,
    borderRadius: 8,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.lg,
  },
  tipsTitle: {
    ...typography.body2,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  tipText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  sendSection: {
    width: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    flex: 1,
  },
  button: {
    borderRadius: 12,
    width: '100%',
  },
  buttonContent: {
    height: 56,
  },
  backButton: {
    marginTop: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
  },
});

export default EmailVerificationScreen;
