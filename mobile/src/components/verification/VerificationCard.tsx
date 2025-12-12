/**
 * VerificationCard Component
 * Task: T019
 *
 * Displays a verification item with status indicator, icon, and action prompt.
 * Used on VerificationDashboardScreen to show verification progress.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../theme';
import { VerificationCardProps, VerificationItemStatus } from '../../types/verification';

const STATUS_CONFIG: Record<
  VerificationItemStatus,
  { label: string; color: string; bgColor: string; iconName: string }
> = {
  not_started: {
    label: 'Start',
    color: colors.primary,
    bgColor: `${colors.primary}15`,
    iconName: 'arrow-right-circle',
  },
  pending: {
    label: 'Pending',
    color: colors.warning,
    bgColor: `${colors.warning}15`,
    iconName: 'clock-outline',
  },
  completed: {
    label: 'Complete',
    color: colors.success,
    bgColor: `${colors.success}15`,
    iconName: 'check-circle',
  },
  failed: {
    label: 'Retry',
    color: colors.error,
    bgColor: `${colors.error}15`,
    iconName: 'alert-circle',
  },
  expired: {
    label: 'Expired',
    color: colors.warning,
    bgColor: `${colors.warning}15`,
    iconName: 'clock-alert-outline',
  },
};

export const VerificationCard: React.FC<VerificationCardProps> = ({ item, onPress, testID }) => {
  const statusConfig = STATUS_CONFIG[item.status];

  const getBorderColor = (): string => {
    switch (item.status) {
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'expired':
        return colors.warning;
      default:
        return colors.border.light;
    }
  };

  const formatExpiryDate = (date: Date): string => {
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'Expired';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else if (diffDays <= 7) {
      return `Expires in ${diffDays} days`;
    } else {
      return `Expires ${date.toLocaleDateString()}`;
    }
  };

  const containerStyle: ViewStyle = {
    ...styles.container,
    borderColor: getBorderColor(),
  };

  return (
    <TouchableOpacity
      testID={testID}
      style={containerStyle}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.status}${item.required ? ', required' : ''}`}
      accessibilityHint={
        item.status === 'not_started'
          ? 'Double tap to start verification'
          : item.status === 'failed'
            ? 'Double tap to retry'
            : 'Double tap to view status'
      }
    >
      {/* Icon */}
      <View
        testID={testID ? `${testID}-icon` : undefined}
        style={[styles.iconContainer, { backgroundColor: statusConfig.bgColor }]}
      >
        <Icon name={item.icon} size={24} color={statusConfig.color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.title}</Text>
          {item.required ? (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          ) : (
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
          )}
        </View>
        <Text style={styles.description}>{item.description}</Text>

        {/* Expiry info */}
        {item.expiresAt && item.status === 'completed' && (
          <Text style={styles.expiryText}>{formatExpiryDate(item.expiresAt)}</Text>
        )}
      </View>

      {/* Status indicator */}
      <View style={styles.statusContainer}>
        {item.status === 'completed' ? (
          <View
            testID={testID ? `${testID}-checkmark` : undefined}
            style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}
          >
            <Icon name="check" size={16} color={colors.success} />
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            <Icon name={statusConfig.iconName} size={16} color={statusConfig.color} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  requiredBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  optionalBadge: {
    backgroundColor: colors.border.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  description: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  expiryText: {
    ...typography.caption,
    color: colors.warning,
    marginTop: 4,
  },
  statusContainer: {
    marginLeft: 'auto',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

export default VerificationCard;
