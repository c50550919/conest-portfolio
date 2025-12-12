/**
 * TrustIndicator Component
 * Shows trust metrics: verification days, references, response rate, account age
 * From UI_DESIGN.md specifications
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface TrustIndicatorProps {
  daysSinceVerification: number;
  referenceCount: number;
  responseRate: number; // 0-100
  accountAgeDays: number;
}

const TrustIndicator: React.FC<TrustIndicatorProps> = ({
  daysSinceVerification,
  referenceCount,
  responseRate,
  accountAgeDays,
}) => {
  const getAccountAgeLabel = () => {
    if (accountAgeDays >= 365) {
      const years = Math.floor(accountAgeDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    if (accountAgeDays >= 30) {
      const months = Math.floor(accountAgeDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${accountAgeDays} days`;
  };

  const getResponseRateColor = () => {
    if (responseRate >= 80) {
      return colors.success;
    }
    if (responseRate >= 50) {
      return colors.warning;
    }
    return colors.error;
  };

  return (
    <View style={styles.container}>
      {/* Verification Freshness */}
      <View style={styles.metric}>
        <View style={styles.iconContainer}>
          <Icon name="shield-check" size={20} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Verified</Text>
          <Text style={styles.value}>{daysSinceVerification} days ago</Text>
        </View>
      </View>

      {/* References */}
      <View style={styles.metric}>
        <View style={styles.iconContainer}>
          <Icon name="account-group" size={20} color={colors.secondary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>References</Text>
          <Text style={styles.value}>
            {referenceCount} {referenceCount === 1 ? 'person' : 'people'}
          </Text>
        </View>
      </View>

      {/* Response Rate */}
      <View style={styles.metric}>
        <View style={styles.iconContainer}>
          <Icon name="message-reply-text" size={20} color={getResponseRateColor()} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Response Rate</Text>
          <Text style={[styles.value, { color: getResponseRateColor() }]}>{responseRate}%</Text>
        </View>
      </View>

      {/* Account Age */}
      <View style={styles.metric}>
        <View style={styles.iconContainer}>
          <Icon name="calendar-check" size={20} color={colors.tertiary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>Member For</Text>
          <Text style={styles.value}>{getAccountAgeLabel()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  value: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
});

export default TrustIndicator;
