/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Housing Badge Component
 *
 * Pill-style badge indicating housing status on discovery cards.
 * Follows SafetyBadge/VerificationBadge pattern.
 *
 * - has_room: Green "Room Available" with optional rent share
 * - looking: Blue "Looking for Housing"
 * - null: renders nothing
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface HousingBadgeProps {
  housingStatus: 'has_room' | 'looking' | null | undefined;
  roomRentShare?: number;
  size?: 'small' | 'medium';
}

const HousingBadge: React.FC<HousingBadgeProps> = ({
  housingStatus,
  roomRentShare,
  size = 'medium',
}) => {
  if (!housingStatus) return null;

  const isHasRoom = housingStatus === 'has_room';
  const badgeColor = isHasRoom ? colors.status.success : colors.secondary;
  const badgeBg = isHasRoom ? '#E8F5E9' : '#E3F2FD';
  const label = isHasRoom ? 'Room Available' : 'Looking for Housing';
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeBg, borderColor: badgeColor },
        isSmall && styles.badgeSmall,
      ]}
      testID="housing-badge"
    >
      <Text
        style={[
          styles.badgeText,
          { color: badgeColor },
          isSmall && styles.badgeTextSmall,
        ]}
      >
        {label}
      </Text>
      {isHasRoom && roomRentShare != null && roomRentShare > 0 && (
        <Text
          style={[
            styles.rentText,
            { color: badgeColor },
            isSmall && styles.rentTextSmall,
          ]}
        >
          ${roomRentShare.toLocaleString()}/mo
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 1,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.xs,
  },
  badgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSmall: {
    fontSize: 10,
  },
  rentText: {
    fontSize: 11,
    fontWeight: '500',
  },
  rentTextSmall: {
    fontSize: 9,
  },
});

export default HousingBadge;
