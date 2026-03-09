/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Profile Completion Bar Component
 *
 * Two variants:
 * - compact: Horizontal progress bar with percentage label (for profile screen)
 * - inline-card: Card with progress bar + CTA + next field suggestion (for discovery feed)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface ProfileCompletionBarProps {
  percentage: number;
  variant: 'compact' | 'inline-card';
  nextField?: string;
  onPress?: () => void;
}

function getBarColor(pct: number): string {
  if (pct >= 80) return colors.status.success;
  if (pct >= 50) return colors.tertiary;
  return colors.status.warning;
}

const ProfileCompletionBar: React.FC<ProfileCompletionBarProps> = ({
  percentage,
  variant,
  nextField,
  onPress,
}) => {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const barColor = getBarColor(clampedPct);

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer} testID="profile-completion-compact">
        <View style={styles.compactHeader}>
          <Text style={styles.compactLabel}>Profile</Text>
          <Text style={styles.compactPercentage}>{clampedPct}% complete</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${clampedPct}%`, backgroundColor: barColor }]} />
        </View>
      </View>
    );
  }

  // inline-card variant
  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      testID="profile-completion-card"
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>
          {clampedPct < 100
            ? 'Complete your profile to get better matches'
            : 'Your profile is complete!'}
        </Text>
        {nextField && clampedPct < 100 && (
          <Text style={styles.cardSuggestion}>Add {nextField} →</Text>
        )}
      </View>
      <View style={styles.cardBarRow}>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${clampedPct}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.cardPercentage}>{clampedPct}%</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    gap: spacing.xs,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  compactPercentage: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  barBackground: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cardContent: {
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  cardSuggestion: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  cardBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    minWidth: 35,
    textAlign: 'right',
  },
});

export default ProfileCompletionBar;
