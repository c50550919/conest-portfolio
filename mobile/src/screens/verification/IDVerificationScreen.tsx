/**
 * IDVerificationScreen
 * Task: T028
 *
 * ID verification via Veriff WebView:
 * 1. Initiate verification session
 * 2. Load Veriff URL in WebView
 * 3. Handle navigation events for completion/failure
 * 4. Call completeIDVerification on finish
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import {
  initiateIDVerification,
  completeIDVerification,
  resetIDVerification,
  fetchVerificationStatus,
  selectIDVerification,
  selectVerificationStatus,
  selectVerificationLoading,
  selectVerificationError,
  clearError,
  setWebViewVisible,
} from '../../store/slices/verificationSlice';
import { IDVerificationProps, VERIFICATION_CONSTANTS } from '../../types/verification';
import { AppDispatch } from '../../store';

export const IDVerificationScreen: React.FC<IDVerificationProps> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const idState = useSelector(selectIDVerification);
  const status = useSelector(selectVerificationStatus);
  const loading = useSelector(selectVerificationLoading);
  const error = useSelector(selectVerificationError);

  const [webViewLoading, setWebViewLoading] = useState(true);

  // Check current status
  const idStatus = status?.id_verification_status;
  const isApproved = idStatus === 'approved';
  const isPending = idStatus === 'pending';
  const isRejected = idStatus === 'rejected';

  // Check cooldown
  const isCoolingDown = idState.cooldownUntil ? Date.now() < idState.cooldownUntil : false;

  const canRetry = idState.retryCount < VERIFICATION_CONSTANTS.MAX_ID_RETRIES && !isCoolingDown;

  // Start verification session
  const handleStartVerification = useCallback(async () => {
    dispatch(clearError());
    const result = await dispatch(initiateIDVerification());

    if (initiateIDVerification.rejected.match(result)) {
      Alert.alert('Error', result.payload || 'Failed to start ID verification');
    }
  }, [dispatch]);

  // Handle WebView navigation state changes
  const handleNavigationStateChange = useCallback(
    async (navState: WebViewNavigation) => {
      const { url } = navState;

      // Check for Veriff completion URLs
      // Veriff redirects to these paths on completion
      if (url.includes('/finished') || url.includes('/success')) {
        if (idState.sessionId) {
          await dispatch(completeIDVerification(idState.sessionId));
          await dispatch(fetchVerificationStatus());

          Alert.alert(
            'Verification Submitted',
            'Your ID has been submitted for review. This usually takes a few minutes.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else if (url.includes('/canceled') || url.includes('/error')) {
        dispatch(setWebViewVisible(false));
        Alert.alert('Verification Cancelled', 'ID verification was cancelled. You can try again.', [
          { text: 'OK' },
        ]);
      }
    },
    [dispatch, idState.sessionId, navigation]
  );

  // Handle WebView errors
  const handleWebViewError = useCallback(() => {
    dispatch(setWebViewVisible(false));
    Alert.alert(
      'Connection Error',
      'Failed to load verification page. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }, [dispatch]);

  // Close WebView
  const handleCloseWebView = useCallback(() => {
    Alert.alert('Cancel Verification?', 'Are you sure you want to cancel ID verification?', [
      { text: 'No, Continue', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => dispatch(setWebViewVisible(false)),
      },
    ]);
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(resetIDVerification());
      dispatch(clearError());
    };
  }, [dispatch]);

  // Render WebView if session URL is available
  if (idState.webViewVisible && idState.sessionUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webViewHeader}>
          <Text style={styles.webViewTitle}>ID Verification</Text>
          <Button mode="text" onPress={handleCloseWebView} compact>
            Cancel
          </Button>
        </View>

        {webViewLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading verification...</Text>
          </View>
        )}

        <WebView
          source={{ uri: idState.sessionUrl }}
          style={styles.webView}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setWebViewLoading(true)}
          onLoadEnd={() => setWebViewLoading(false)}
          onError={handleWebViewError}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </SafeAreaView>
    );
  }

  // Already approved state
  if (isApproved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={[styles.iconContainer, styles.iconSuccess]}>
              <Icon name="card-account-details-outline" size={48} color={colors.success} />
            </View>
            <Text style={styles.title}>ID Verified!</Text>
            <Text style={styles.subtitle}>Your government ID has been successfully verified.</Text>
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

  // Pending state
  if (isPending) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.pendingContainer}>
            <View style={[styles.iconContainer, styles.iconPending]}>
              <Icon name="clock-outline" size={48} color={colors.warning} />
            </View>
            <Text style={styles.title}>Verification Pending</Text>
            <Text style={styles.subtitle}>
              Your ID is being reviewed. This usually takes a few minutes.
            </Text>
            <Button
              mode="outlined"
              onPress={() => dispatch(fetchVerificationStatus())}
              loading={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              icon="refresh"
            >
              Refresh Status
            </Button>
            <Button mode="text" onPress={() => navigation.goBack()} style={styles.backButton}>
              Go Back
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main start verification screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, isRejected && styles.iconError]}>
            <Icon
              name="card-account-details-outline"
              size={48}
              color={isRejected ? colors.error : colors.primary}
            />
          </View>
          <Text style={styles.title}>{isRejected ? 'Verification Failed' : 'Verify Your ID'}</Text>
          <Text style={styles.subtitle}>
            {isRejected
              ? 'Your previous verification was not approved. Please try again with a valid government ID.'
              : 'Verify your identity using a government-issued ID'}
          </Text>
        </View>

        {/* Requirements */}
        <View
          style={styles.requirementsCard}
          accessible
          accessibilityLabel="What you'll need: Government-issued ID, Device camera access, Good lighting conditions"
        >
          <Text style={styles.requirementsTitle}>What you'll need:</Text>
          <View style={styles.requirement}>
            <Icon name="card-account-details" size={20} color={colors.primary} />
            <Text style={styles.requirementText}>Government-issued ID</Text>
          </View>
          <View style={styles.requirement}>
            <Icon name="camera" size={20} color={colors.primary} />
            <Text style={styles.requirementText}>Device camera access</Text>
          </View>
          <View style={styles.requirement}>
            <Icon name="lightbulb-on" size={20} color={colors.primary} />
            <Text style={styles.requirementText}>Good lighting conditions</Text>
          </View>
        </View>

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

        {/* Cooldown message */}
        {isCoolingDown && (
          <View
            style={styles.cooldownContainer}
            accessible
            accessibilityRole="alert"
            accessibilityLabel="Too many attempts. Please wait 24 hours before trying again."
          >
            <Icon name="clock-alert-outline" size={20} color={colors.warning} />
            <Text style={styles.cooldownText}>
              Too many attempts. Please wait 24 hours before trying again.
            </Text>
          </View>
        )}

        {/* Retry count */}
        {idState.retryCount > 0 && canRetry && (
          <Text style={styles.retryText}>
            Attempts: {idState.retryCount} of {VERIFICATION_CONSTANTS.MAX_ID_RETRIES}
          </Text>
        )}

        {/* Start button */}
        <Button
          mode="contained"
          onPress={handleStartVerification}
          loading={loading}
          disabled={loading || !canRetry}
          style={styles.button}
          contentStyle={styles.buttonContent}
          testID="start-verification-button"
        >
          {isRejected ? 'Try Again' : 'Start Verification'}
        </Button>

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
  iconPending: {
    backgroundColor: `${colors.warning}15`,
  },
  iconError: {
    backgroundColor: `${colors.error}15`,
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
  requirementsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    ...typography.body2,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  requirementText: {
    ...typography.body2,
    color: colors.text.secondary,
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
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cooldownText: {
    ...typography.body2,
    color: colors.warning,
    flex: 1,
  },
  retryText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  button: {
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  buttonContent: {
    height: 56,
  },
  backButton: {
    marginTop: spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
  },
  pendingContainer: {
    alignItems: 'center',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.surface,
  },
  webViewTitle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});

export default IDVerificationScreen;
