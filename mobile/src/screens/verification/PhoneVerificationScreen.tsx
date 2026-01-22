/**
 * PhoneVerificationScreen
 * Task: T026
 *
 * OTP-based phone verification flow:
 * 1. User requests SMS code
 * 2. Enters 6-digit OTP
 * 3. Auto-submit on completion
 * 4. Handle errors and retries
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { OTPInput } from '../../components/verification';
import {
  sendPhoneCode,
  sendPhoneVoiceCode,
  verifyPhoneCode,
  resetPhoneVerification,
  fetchVerificationStatus,
  selectPhoneVerification,
  selectVerificationLoading,
  selectVerificationError,
  clearError,
} from '../../store/slices/verificationSlice';
import { VERIFICATION_CONSTANTS, VerificationStackParamList } from '../../types/verification';
import { AppDispatch } from '../../store';
import type { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<VerificationStackParamList, 'PhoneVerification'>;

export const PhoneVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useDispatch<AppDispatch>();
  const phoneState = useSelector(selectPhoneVerification);
  const loading = useSelector(selectVerificationLoading);
  const error = useSelector(selectVerificationError);

  const [otpValue, setOtpValue] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showVoiceOption, setShowVoiceOption] = useState(false);
  const [codeExpiryCountdown, setCodeExpiryCountdown] = useState(0);

  const phoneNumber = route.params?.phoneNumber || phoneState.phoneNumber || 'your phone';

  // Handle OTP expiry countdown (shows remaining time for code validity)
  useEffect(() => {
    if (phoneState.codeExpiry) {
      const updateExpiry = () => {
        const remaining = Math.max(0, Math.ceil((phoneState.codeExpiry! - Date.now()) / 1000));
        setCodeExpiryCountdown(remaining);
      };

      updateExpiry();
      const timer = setInterval(updateExpiry, 1000);
      return () => clearInterval(timer);
    } else {
      setCodeExpiryCountdown(0);
    }
  }, [phoneState.codeExpiry]);

  // Format expiry time as MM:SS
  const formatExpiryTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show voice call option after 60 seconds
  useEffect(() => {
    if (phoneState.codeSent && !showVoiceOption) {
      const timer = setTimeout(() => {
        setShowVoiceOption(true);
      }, 60000); // 60 seconds
      return () => clearTimeout(timer);
    }
  }, [phoneState.codeSent, showVoiceOption]);

  // Handle resend countdown
  useEffect(() => {
    if (phoneState.resendAvailableAt) {
      const remaining = Math.max(0, Math.ceil((phoneState.resendAvailableAt - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining > 0) {
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
    }
  }, [phoneState.resendAvailableAt]);

  // Check for cooldown from too many failed attempts
  const isCoolingDown = phoneState.cooldownUntil ? Date.now() < phoneState.cooldownUntil : false;

  // Handle send code
  const handleSendCode = useCallback(async () => {
    dispatch(clearError());
    const result = await dispatch(sendPhoneCode());

    if (sendPhoneCode.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Failed to send verification code');
    }
  }, [dispatch]);

  // Handle verify code
  const handleVerifyCode = useCallback(
    async (code: string) => {
      dispatch(clearError());
      const result = await dispatch(verifyPhoneCode(code));

      if (verifyPhoneCode.fulfilled.match(result)) {
        // Refresh verification status and go back
        await dispatch(fetchVerificationStatus());
        Alert.alert('Success', 'Phone verified successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (verifyPhoneCode.rejected.match(result)) {
        // Show error but don't clear OTP for retry
        if (result.payload === 'MAX_RETRIES_EXCEEDED') {
          setOtpValue('');
        }
      }
    },
    [dispatch, navigation]
  );

  // Handle OTP completion (auto-submit)
  const handleOTPComplete = useCallback(
    (code: string) => {
      if (!loading && !isCoolingDown) {
        handleVerifyCode(code);
      }
    },
    [handleVerifyCode, loading, isCoolingDown]
  );

  // Handle resend
  const handleResend = useCallback(() => {
    if (countdown === 0 && !loading) {
      setOtpValue('');
      handleSendCode();
    }
  }, [countdown, loading, handleSendCode]);

  // Handle voice call fallback
  const handleVoiceCall = useCallback(async () => {
    dispatch(clearError());
    setOtpValue('');
    const result = await dispatch(sendPhoneVoiceCode());

    if (sendPhoneVoiceCode.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Failed to initiate voice call');
    } else {
      Alert.alert(
        'Voice Call Initiated',
        'You will receive a phone call with your verification code shortly.',
        [{ text: 'OK' }]
      );
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(resetPhoneVerification());
      dispatch(clearError());
    };
  }, [dispatch]);

  // Calculate remaining attempts
  const remainingAttempts = VERIFICATION_CONSTANTS.MAX_OTP_ATTEMPTS - phoneState.failedAttempts;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header} accessibilityRole="header">
            <View style={styles.iconContainer} accessibilityElementsHidden>
              <Icon name="phone-message" size={48} color={colors.primary} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              Verify Your Phone
            </Text>
            <Text style={styles.subtitle}>
              {phoneState.codeSent
                ? `Enter the 6-digit code sent to ${phoneNumber}`
                : `We'll send a verification code to ${phoneNumber}`}
            </Text>
          </View>

          {/* OTP Section */}
          {phoneState.codeSent ? (
            <View style={styles.otpSection}>
              <OTPInput
                testID="otp-input"
                value={otpValue}
                onChange={setOtpValue}
                onComplete={handleOTPComplete}
                disabled={loading || isCoolingDown}
                error={!!error}
              />

              {/* Code expiry timer */}
              {codeExpiryCountdown > 0 && (
                <View
                  style={styles.expiryContainer}
                  accessible
                  accessibilityLabel={`Code expires in ${formatExpiryTime(codeExpiryCountdown)}`}
                >
                  <Icon
                    name="timer-outline"
                    size={16}
                    color={codeExpiryCountdown < 120 ? colors.warning : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.expiryText,
                      codeExpiryCountdown < 120 && styles.expiryTextWarning,
                    ]}
                  >
                    Code expires in {formatExpiryTime(codeExpiryCountdown)}
                  </Text>
                </View>
              )}

              {/* Code expired message */}
              {phoneState.codeExpiry && codeExpiryCountdown === 0 && (
                <View
                  style={styles.expiredContainer}
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel="Code has expired. Please request a new code."
                >
                  <Icon name="timer-off-outline" size={16} color={colors.error} />
                  <Text style={styles.expiredText}>Code has expired. Please request a new code.</Text>
                </View>
              )}

              {/* Error message */}
              {error && (
                <View
                  style={styles.errorContainer}
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel={`Error: ${error}`}
                >
                  <Icon name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Attempts remaining */}
              {phoneState.failedAttempts > 0 && (
                <Text
                  style={styles.attemptsText}
                  accessibilityRole="text"
                  accessibilityLabel={`Warning: ${remainingAttempts} attempts remaining`}
                >
                  {remainingAttempts} attempts remaining
                </Text>
              )}

              {/* Cooldown message */}
              {isCoolingDown && (
                <View
                  style={styles.cooldownContainer}
                  accessible
                  accessibilityRole="alert"
                  accessibilityLabel="Too many attempts. Please wait 5 minutes before trying again."
                >
                  <Icon name="clock-alert-outline" size={20} color={colors.warning} />
                  <Text style={styles.cooldownText}>
                    Too many attempts. Please wait 5 minutes before trying again.
                  </Text>
                </View>
              )}

              {/* Resend button */}
              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0 || loading}
                style={styles.resendButton}
                accessibilityRole="button"
                accessibilityLabel={
                  countdown > 0
                    ? `Resend code available in ${countdown} seconds`
                    : "Didn't receive code? Tap to resend"
                }
                accessibilityState={{ disabled: countdown > 0 || loading }}
              >
                <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code? Resend"}
                </Text>
              </TouchableOpacity>

              {/* Voice call fallback - shown after 60s */}
              {showVoiceOption && (
                <TouchableOpacity
                  onPress={handleVoiceCall}
                  disabled={loading}
                  style={styles.voiceCallButton}
                  accessibilityRole="button"
                  accessibilityLabel="Call me instead. Receive verification code via phone call."
                  accessibilityState={{ disabled: loading }}
                >
                  <Icon name="phone" size={18} color={colors.primary} />
                  <Text style={styles.voiceCallText}>Call Me Instead</Text>
                </TouchableOpacity>
              )}

              {/* Verify button */}
              <Button
                mode="contained"
                onPress={() => handleVerifyCode(otpValue)}
                loading={loading}
                disabled={otpValue.length !== 6 || loading || isCoolingDown}
                style={styles.verifyButton}
                contentStyle={styles.buttonContent}
                testID="verify-button"
              >
                Verify Code
              </Button>
            </View>
          ) : (
            /* Send Code Section */
            <View style={styles.sendSection}>
              <Button
                mode="contained"
                onPress={handleSendCode}
                loading={loading}
                disabled={loading}
                style={styles.sendButton}
                contentStyle={styles.buttonContent}
                testID="send-code-button"
              >
                Send Verification Code
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
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
  otpSection: {
    alignItems: 'center',
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  expiryText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  expiryTextWarning: {
    color: colors.warning,
    fontWeight: '500' as const,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
    backgroundColor: `${colors.error}10`,
    padding: spacing.sm,
    borderRadius: 8,
  },
  expiredText: {
    ...typography.caption,
    color: colors.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
  },
  attemptsText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cooldownText: {
    ...typography.body2,
    color: colors.warning,
    flex: 1,
  },
  resendButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  resendText: {
    ...typography.body2,
    color: colors.primary,
  },
  resendTextDisabled: {
    color: colors.text.disabled,
  },
  voiceCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  voiceCallText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '500' as const,
  },
  verifyButton: {
    marginTop: spacing.lg,
    width: '100%',
    borderRadius: 12,
  },
  buttonContent: {
    height: 56,
  },
  sendSection: {
    width: '100%',
  },
  sendButton: {
    borderRadius: 12,
  },
  backButton: {
    marginTop: spacing.md,
  },
});

export default PhoneVerificationScreen;
