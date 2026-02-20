/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * SafetyBadge Component
 * Shows verification status with color-coded badges
 * From UI_DESIGN.md specifications
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';

export type VerificationStatus = 'verified' | 'partial' | 'unverified';
export type VerificationType = 'id' | 'background' | 'phone' | 'email' | 'income';

interface SafetyBadgeProps {
  status: VerificationStatus;
  type: VerificationType;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const SafetyBadge: React.FC<SafetyBadgeProps> = ({
  status,
  type,
  size = 'medium',
  showLabel = true,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'verified':
        return colors.verification.verified;
      case 'partial':
        return colors.verification.partial;
      case 'unverified':
        return colors.verification.unverified;
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'id':
        return 'card-account-details';
      case 'background':
        return 'shield-check';
      case 'phone':
        return 'phone-check';
      case 'email':
        return 'email-check';
      case 'income':
        return 'cash-check';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'id':
        return 'ID Verified';
      case 'background':
        return 'Background Check';
      case 'phone':
        return 'Phone Verified';
      case 'email':
        return 'Email Verified';
      case 'income':
        return 'Income Verified';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 24;
    }
  };

  const badgeColor = getStatusColor();

  return (
    <View style={[styles.container, size === 'small' && styles.containerSmall]}>
      <View style={[styles.iconContainer, { backgroundColor: badgeColor }]}>
        <Icon name={getIconName()} size={getIconSize()} color="#FFFFFF" />
      </View>
      {showLabel && (
        <Text style={[styles.label, size === 'small' && styles.labelSmall]}>{getLabel()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  containerSmall: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.text.primary,
  },
  labelSmall: {
    fontSize: 12,
  },
});

export default SafetyBadge;
