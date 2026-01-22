/**
 * VerificationDashboardScreen
 * Task: T025
 *
 * Main dashboard showing all verification items and progress.
 * Entry point for the verification flow.
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { VerificationCard, VerificationProgress } from '../../components/verification';
import {
  fetchVerificationStatus,
  selectVerificationStatus,
  selectVerificationLoading,
  selectVerificationError,
} from '../../store/slices/verificationSlice';
import {
  VerificationDashboardProps,
  VerificationItem,
  VerificationItemStatus,
} from '../../types/verification';
import { AppDispatch } from '../../store';

export const VerificationDashboardScreen: React.FC<VerificationDashboardProps> = ({
  navigation,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectVerificationStatus);
  const loading = useSelector(selectVerificationLoading);
  const error = useSelector(selectVerificationError);

  // Fetch status on mount and when screen is focused
  useEffect(() => {
    dispatch(fetchVerificationStatus());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchVerificationStatus());
  }, [dispatch]);

  // Map API status to verification items
  const verificationItems: VerificationItem[] = useMemo(() => {
    const mapIdStatus = (apiStatus: string | undefined): VerificationItemStatus => {
      switch (apiStatus) {
        case 'approved':
          return 'completed';
        case 'rejected':
          return 'failed';
        case 'expired':
          return 'expired';
        case 'pending':
          return 'pending';
        default:
          return 'not_started';
      }
    };

    const mapBackgroundStatus = (apiStatus: string | undefined): VerificationItemStatus => {
      switch (apiStatus) {
        case 'approved':
          return 'completed';
        case 'rejected':
        case 'consider':
          return 'failed';
        case 'expired':
          return 'expired';
        case 'pending':
          return 'pending';
        default:
          return 'not_started';
      }
    };

    const mapIncomeStatus = (apiStatus: string | undefined): VerificationItemStatus => {
      switch (apiStatus) {
        case 'verified':
          return 'completed';
        case 'rejected':
          return 'failed';
        case 'pending':
          return 'pending';
        default:
          return 'not_started';
      }
    };

    return [
      {
        id: 'email',
        title: 'Email Verification',
        description: 'Verify your email address',
        status: status?.email_verified ? 'completed' : 'not_started',
        required: true,
        icon: 'email-outline',
      },
      {
        id: 'phone',
        title: 'Phone Verification',
        description: 'Verify your phone number via SMS',
        status: status?.phone_verified ? 'completed' : 'not_started',
        required: true,
        icon: 'phone-outline',
      },
      {
        id: 'id',
        title: 'ID Verification',
        description: 'Verify your government-issued ID',
        status: mapIdStatus(status?.id_verification_status),
        required: true,
        icon: 'card-account-details-outline',
        expiresAt: status?.id_expiration_date ? new Date(status.id_expiration_date) : undefined,
      },
      {
        id: 'background',
        title: 'Background Check',
        description: 'Complete background verification',
        status: mapBackgroundStatus(status?.background_check_status),
        required: true,
        icon: 'shield-check-outline',
        expiresAt: status?.bg_check_expiration_date
          ? new Date(status.bg_check_expiration_date)
          : undefined,
      },
      {
        id: 'income',
        title: 'Income Verification',
        description: 'Verify your income (optional)',
        status: mapIncomeStatus(status?.income_verification_status),
        required: false,
        icon: 'currency-usd',
      },
    ];
  }, [status]);

  // Calculate progress
  const progressStats = useMemo(() => {
    const completed = verificationItems.filter((item) => item.status === 'completed').length;
    const total = verificationItems.length;
    const required = verificationItems.filter((item) => item.required);
    const completedRequired = required.filter((item) => item.status === 'completed').length;

    return {
      completedCount: completed,
      totalCount: total,
      requiredCount: required.length,
      completedRequired,
    };
  }, [verificationItems]);

  const handleItemPress = (item: VerificationItem) => {
    // Don't navigate if already completed (unless expired)
    if (item.status === 'completed') {
      return;
    }

    switch (item.id) {
      case 'email':
        // Pass user's email if available
        navigation.navigate('EmailVerification', {
          email: '', // Will be populated from user profile
        });
        break;
      case 'phone':
        navigation.navigate('PhoneVerification', {});
        break;
      case 'id':
        navigation.navigate('IDVerification');
        break;
      case 'background':
        navigation.navigate('BackgroundCheck');
        break;
      case 'income':
        navigation.navigate('IncomeVerification');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header} accessibilityRole="header">
          <Text style={styles.title} accessibilityRole="header">
            Verification Center
          </Text>
          <Text style={styles.subtitle}>
            Complete these steps to build trust with other parents
          </Text>
        </View>

        {/* Progress Section */}
        <VerificationProgress testID="verification-progress" {...progressStats} />

        {/* Verification Score */}
        {status?.verification_score !== undefined && (
          <View
            style={styles.scoreCard}
            accessible
            accessibilityLabel={`Verification score: ${status.verification_score} out of 100. Complete all required verifications to reach 90 or higher.`}
            accessibilityRole="summary"
          >
            <View style={styles.scoreHeader}>
              <Icon name="shield-star" size={24} color={colors.primary} />
              <Text style={styles.scoreLabel}>Verification Score</Text>
            </View>
            <Text style={styles.scoreValue}>{status.verification_score}</Text>
            <Text style={styles.scoreHint}>Complete all required verifications to reach 90+</Text>
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
            <Icon name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Verification Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Required Verifications</Text>
          {verificationItems
            .filter((item) => item.required)
            .map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                onPress={() => handleItemPress(item)}
                testID={`verification-card-${item.id}`}
              />
            ))}

          <Text style={[styles.sectionTitle, styles.optionalTitle]}>Optional Verifications</Text>
          {verificationItems
            .filter((item) => !item.required)
            .map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                onPress={() => handleItemPress(item)}
                testID={`verification-card-${item.id}`}
              />
            ))}
        </View>

        {/* Info note */}
        <View
          style={styles.infoNote}
          accessible
          accessibilityRole="text"
          accessibilityLabel="Information: Your verification status is visible to other parents and helps build trust in the community."
        >
          <Icon name="information-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.infoText}>
            Your verification status is visible to other parents and helps build trust in the
            community.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  scoreLabel: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    flex: 1,
  },
  itemsSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.body1,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  optionalTitle: {
    marginTop: spacing.lg,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${colors.info}10`,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
});

export default VerificationDashboardScreen;
