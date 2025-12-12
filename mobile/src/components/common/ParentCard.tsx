/**
 * ParentCard Component
 * Profile card for parent matches
 * From UI_DESIGN.md specifications
 * CRITICAL: NO child data - parent profiles only
 */

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import SafetyBadge from './SafetyBadge';
import CompatibilityScore from './CompatibilityScore';

interface ParentCardProps {
  id: string;
  name: string;
  location: string;
  profilePhoto?: string;
  childrenCount: number;
  workSchedule?: string;
  compatibilityScore: number;
  isVerified: boolean;
  hasBackgroundCheck: boolean;
  onMessagePress?: () => void;
  onViewPress?: () => void;
  onCardPress?: () => void;
}

const ParentCard: React.FC<ParentCardProps> = ({
  name,
  location,
  profilePhoto,
  childrenCount,
  workSchedule,
  compatibilityScore,
  isVerified,
  hasBackgroundCheck,
  onMessagePress,
  onViewPress,
  onCardPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onCardPress} activeOpacity={0.9}>
      <View style={styles.header}>
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Icon name="account" size={40} color={colors.text.disabled} />
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={16} color={colors.text.secondary} />
            <Text style={styles.location}>{location}</Text>
          </View>

          {/* Children count - NO specific details */}
          <View style={styles.childrenRow}>
            <Icon name="account-child" size={16} color={colors.text.secondary} />
            <Text style={styles.childrenText}>
              {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
            </Text>
          </View>

          {/* Work schedule chip */}
          {workSchedule && (
            <View style={styles.scheduleChip}>
              <Icon name="calendar-clock" size={14} color={colors.primary} />
              <Text style={styles.scheduleText}>{workSchedule}</Text>
            </View>
          )}
        </View>

        {/* Compatibility Score */}
        <CompatibilityScore
          score={compatibilityScore}
          size={60}
          strokeWidth={6}
          showLabel={false}
        />
      </View>

      {/* Verification Badges */}
      <View style={styles.badgesContainer}>
        {isVerified && <SafetyBadge status="verified" type="id" size="small" />}
        {hasBackgroundCheck && <SafetyBadge status="verified" type="background" size="small" />}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.button, styles.viewButton]} onPress={onViewPress}>
          <Icon name="eye" size={20} color={colors.primary} />
          <Text style={styles.viewButtonText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.messageButton]} onPress={onMessagePress}>
          <Icon name="message" size={20} color={colors.surface} />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  photoContainer: {
    marginRight: spacing.md,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...typography.h5,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.body2,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  childrenText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  scheduleText: {
    ...typography.caption,
    color: colors.primaryDark,
    marginLeft: 4,
    fontWeight: '500',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: 44, // Accessibility minimum touch target
  },
  viewButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  viewButtonText: {
    ...typography.button,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontSize: 14,
    textTransform: 'none',
  },
  messageButton: {
    backgroundColor: colors.primary,
  },
  messageButtonText: {
    ...typography.button,
    color: colors.surface,
    marginLeft: spacing.xs,
    fontSize: 14,
    textTransform: 'none',
  },
});

export default ParentCard;
