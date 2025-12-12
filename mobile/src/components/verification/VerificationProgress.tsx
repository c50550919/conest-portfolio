/**
 * VerificationProgress Component
 * Task: T023
 *
 * Displays verification progress with:
 * - Visual progress bar
 * - Completed count out of total
 * - Required items tracking
 * - Color coding based on completion status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { VerificationProgressProps } from '../../types/verification';

export const VerificationProgress: React.FC<VerificationProgressProps> = ({
  completedCount,
  totalCount,
  requiredCount,
  completedRequired,
  testID,
}) => {
  // Calculate percentages (handle edge cases)
  const percentage =
    totalCount > 0 ? Math.min(Math.round((completedCount / totalCount) * 100), 100) : 0;

  const allRequiredComplete = completedRequired >= requiredCount;
  const allComplete = completedCount >= totalCount;

  // Determine progress bar color
  const getProgressColor = (): string => {
    if (allComplete) {
      return colors.success;
    }
    if (allRequiredComplete) {
      return colors.success;
    }
    if (completedCount > 0) {
      return colors.primary;
    }
    return colors.border.medium;
  };

  // Determine status message
  const getStatusMessage = (): string => {
    if (allComplete) {
      return 'All verifications complete!';
    }
    if (allRequiredComplete) {
      return 'All required complete';
    }
    return `${completedRequired} of ${requiredCount} required`;
  };

  const progressColor = getProgressColor();

  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: completedCount, max: totalCount }}
      accessibilityLabel={`Verification progress: ${completedCount} of ${totalCount} complete, ${completedRequired} of ${requiredCount} required`}
    >
      {/* Progress header */}
      <View style={styles.header}>
        <View style={styles.countContainer}>
          <Text style={styles.countLarge}>{completedCount}</Text>
          <Text style={styles.countSmall}> of {totalCount}</Text>
          <Text style={styles.countLabel}> complete</Text>
        </View>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          testID={testID ? `${testID}-bar` : undefined}
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      {/* Status row */}
      <View style={styles.statusRow}>
        {allRequiredComplete ? (
          <View style={styles.statusComplete}>
            <Icon name="check-circle" size={16} color={colors.success} />
            <Text style={styles.statusTextSuccess}>All required complete</Text>
          </View>
        ) : (
          <View testID={testID ? `${testID}-warning` : undefined} style={styles.statusPending}>
            <Icon name="alert-circle-outline" size={16} color={colors.warning} />
            <Text style={styles.statusTextWarning}>
              {completedRequired} of {requiredCount} required
            </Text>
          </View>
        )}

        {/* Optional items info */}
        {totalCount > requiredCount && (
          <Text style={styles.optionalText}>{totalCount - requiredCount} optional</Text>
        )}
      </View>

      {/* Score indicator (if fully verified) */}
      {allRequiredComplete && (
        <View style={styles.scoreContainer}>
          <Icon name="shield-check" size={20} color={colors.success} />
          <Text style={styles.scoreText}>
            {allComplete ? 'Fully Verified' : 'Verification Score: 90+'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
  },
  countSmall: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  countLabel: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  percentage: {
    ...typography.h4,
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusTextSuccess: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  statusTextWarning: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  optionalText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.xs,
  },
  scoreText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.success,
  },
});

export default VerificationProgress;
