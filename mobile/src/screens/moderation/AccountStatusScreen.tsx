/**
 * Account Status Screen
 *
 * Displays user's account moderation status including warnings,
 * suspensions, and bans. Shows appeal information when applicable.
 *
 * Constitution: Principle I (Child Safety)
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  fetchModerationStatus,
  selectModerationStatus,
  selectSuspensionInfo,
  ModerationStatus,
  ModerationState,
} from '../../store/slices/moderationSlice';
import type { AppDispatch } from '../../store';

const SUPPORT_EMAIL = 'safety@conest.com';

interface StatusConfig {
  icon: string;
  color: string;
  title: string;
  description: string;
  showAppeal: boolean;
}

const STATUS_CONFIGS: Record<ModerationStatus, StatusConfig> = {
  good_standing: {
    icon: 'check-circle',
    color: colors.success,
    title: 'Account in Good Standing',
    description:
      'Your account is active with no restrictions. Thank you for being a responsible community member.',
    showAppeal: false,
  },
  warned: {
    icon: 'alert-circle',
    color: colors.warning,
    title: 'Account Warning',
    description:
      'Your account has received a warning for messaging patterns that may not align with our community guidelines. Please review our guidelines and ensure your communications focus on housing compatibility.',
    showAppeal: true,
  },
  suspended: {
    icon: 'clock-alert',
    color: colors.error,
    title: 'Account Suspended',
    description:
      'Your account has been temporarily suspended due to community guideline concerns. During this time, you cannot send messages or use matching features.',
    showAppeal: true,
  },
  banned: {
    icon: 'account-off',
    color: colors.errorDark,
    title: 'Account Permanently Deactivated',
    description:
      'Your account has been permanently deactivated due to confirmed violations of our community safety guidelines. You may submit a formal appeal within 30 days.',
    showAppeal: true,
  },
};

export const AccountStatusScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectModerationStatus);
  const suspensionInfo = useSelector(selectSuspensionInfo);
  const loading = useSelector(
    (state: { moderation: ModerationState }) => state.moderation.loading
  );
  const strikeCount = useSelector(
    (state: { moderation: ModerationState }) => state.moderation.strikeCount
  );

  useEffect(() => {
    dispatch(fetchModerationStatus());
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchModerationStatus());
  }, [dispatch]);

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Account Appeal - CoNest');
    const body = encodeURIComponent(
      `I would like to appeal my account status.\n\nCurrent Status: ${status}\nReason: ${suspensionInfo.reason || 'Not specified'}\n\nPlease describe your situation:`
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const config = STATUS_CONFIGS[status];

  const formatSuspensionTime = () => {
    if (!suspensionInfo.until) return null;

    const until = new Date(suspensionInfo.until);
    const now = new Date();
    const diff = until.getTime() - now.getTime();

    if (diff <= 0) return 'Suspension has ended';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {/* Status Header */}
        <View style={[styles.statusCard, { borderColor: config.color }]}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
            <Icon name={config.icon} size={48} color={config.color} />
          </View>
          <Text style={[styles.statusTitle, { color: config.color }]}>
            {config.title}
          </Text>
          <Text style={styles.statusDescription}>{config.description}</Text>

          {/* Suspension Timer */}
          {status === 'suspended' && suspensionInfo.until && (
            <View style={styles.timerContainer}>
              <Icon name="timer-sand" size={20} color={colors.text.secondary} />
              <Text style={styles.timerText}>{formatSuspensionTime()}</Text>
            </View>
          )}

          {/* Suspension Reason */}
          {suspensionInfo.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{suspensionInfo.reason}</Text>
            </View>
          )}
        </View>

        {/* Strike Count */}
        {strikeCount > 0 && status !== 'banned' && (
          <View style={styles.strikesCard}>
            <View style={styles.strikesHeader}>
              <Icon name="flag" size={24} color={colors.warning} />
              <Text style={styles.strikesTitle}>Account Strikes</Text>
            </View>
            <View style={styles.strikesIndicator}>
              {[1, 2, 3].map((num) => (
                <View
                  key={num}
                  style={[
                    styles.strikeCircle,
                    num <= strikeCount && styles.strikeCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.strikeNumber,
                      num <= strikeCount && styles.strikeNumberActive,
                    ]}
                  >
                    {num}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.strikesInfo}>
              {strikeCount === 1 &&
                'First warning. Please review our community guidelines.'}
              {strikeCount === 2 &&
                'Second warning. Further violations may result in suspension.'}
              {strikeCount >= 3 &&
                'Multiple violations detected. Your account may be at risk.'}
            </Text>
          </View>
        )}

        {/* Community Guidelines */}
        <View style={styles.guidelinesCard}>
          <View style={styles.guidelinesHeader}>
            <Icon name="shield-check" size={24} color={colors.primary} />
            <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
          </View>
          <Text style={styles.guidelinesText}>
            CoNest prioritizes the safety of all families on our platform. Our
            messaging guidelines focus on:
          </Text>
          <View style={styles.guidelinesList}>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={16} color={colors.primary} />
              <Text style={styles.guidelineText}>
                Housing compatibility discussions
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={16} color={colors.primary} />
              <Text style={styles.guidelineText}>
                Respectful and professional communication
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={16} color={colors.primary} />
              <Text style={styles.guidelineText}>
                Focus on shared living arrangements
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="close" size={16} color={colors.error} />
              <Text style={styles.guidelineText}>
                No inappropriate questions about children
              </Text>
            </View>
          </View>
        </View>

        {/* Appeal Section */}
        {config.showAppeal && (
          <View style={styles.appealCard}>
            <Text style={styles.appealTitle}>Need to Appeal?</Text>
            <Text style={styles.appealText}>
              If you believe this action was taken in error, you can contact our
              safety team to discuss your account status.
            </Text>
            <TouchableOpacity
              style={styles.appealButton}
              onPress={handleContactSupport}
            >
              <Icon name="email-outline" size={20} color={colors.surface} />
              <Text style={styles.appealButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statusDescription: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  timerText: {
    ...typography.subtitle1,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  reasonContainer: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    width: '100%',
  },
  reasonLabel: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  reasonText: {
    ...typography.body1,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  strikesCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  strikesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  strikesTitle: {
    ...typography.h3,
    marginLeft: spacing.sm,
  },
  strikesIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  strikeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  strikeCircleActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  strikeNumber: {
    ...typography.h3,
    color: colors.text.disabled,
  },
  strikeNumberActive: {
    color: colors.warning,
  },
  strikesInfo: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  guidelinesCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  guidelinesTitle: {
    ...typography.h3,
    marginLeft: spacing.sm,
  },
  guidelinesText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  guidelinesList: {
    gap: spacing.sm,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidelineText: {
    ...typography.body1,
    marginLeft: spacing.sm,
    flex: 1,
  },
  appealCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  appealTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  appealText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  appealButtonText: {
    ...typography.button,
    color: colors.surface,
    marginLeft: spacing.sm,
  },
});

export default AccountStatusScreen;
