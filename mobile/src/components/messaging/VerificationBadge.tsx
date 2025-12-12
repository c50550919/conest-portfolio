/**
 * VerificationBadge Component
 * Displays verification status for messaging participants
 * Shows verified users with a badge indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  variant?: 'compact' | 'full';
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  size = 'medium',
  showLabel = false,
  variant = 'compact',
}) => {
  if (!isVerified) {
    return null;
  }

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'medium':
        return 18;
      case 'large':
        return 22;
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return { width: 20, height: 20 };
      case 'medium':
        return { width: 24, height: 24 };
      case 'large':
        return { width: 28, height: 28 };
    }
  };

  if (variant === 'compact') {
    return (
      <View style={[styles.compactBadge, getBadgeSize()]}>
        <Icon name="check-decagram" size={getIconSize()} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.fullBadge}>
      <View style={[styles.iconContainer, getBadgeSize()]}>
        <Icon name="check-decagram" size={getIconSize()} color="#FFFFFF" />
      </View>
      {showLabel && (
        <Text style={[styles.label, size === 'small' && styles.labelSmall]}>Verified</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  compactBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  iconContainer: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  labelSmall: {
    fontSize: 10,
  },
});

export default VerificationBadge;
