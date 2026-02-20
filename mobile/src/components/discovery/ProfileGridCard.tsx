/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Profile Grid Card Component
 *
 * Purpose: Compact profile card for grid/list view discovery interface
 * Constitution: Principle I (Child Safety - NO child PII display)
 *
 * Features:
 * - Compact design optimized for grid/list layouts
 * - Verification badges (ID, background check)
 * - Compatibility score visualization
 * - Quick actions (save, compare, view details)
 * - Child-safe data display (counts/age groups only)
 *
 * Created: 2025-10-08
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ExtendedProfileCard } from '../../types/discovery';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with 16px margins

interface ProfileGridCardProps {
  profile: ExtendedProfileCard;
  onPress: () => void;
  onSave?: () => void;
  onCompare?: () => void;
  isSaved?: boolean;
  isInComparison?: boolean;
}

export const ProfileGridCard: React.FC<ProfileGridCardProps> = ({
  profile,
  onPress,
  onSave,
  onCompare,
  isSaved = false,
  isInComparison = false,
}) => {
  const {
    profilePhoto,
    firstName,
    age,
    city,
    state,
    compatibilityScore,
    verificationStatus,
    childrenCount,
    childrenAgeGroups,
    budget,
    housingPreferences,
    openToGroupLiving,
  } = profile;

  // Format age groups for display (child-safe)
  const formatAgeGroups = (groups: string[]): string => {
    if (!groups || groups.length === 0) {
      return '';
    }

    const labels: Record<string, string> = {
      infant: '0-2',
      toddler: '3-5',
      elementary: '6-12',
      teen: '13-18',
    };

    return groups.map((g) => labels[g] || g).join(', ');
  };

  // Compatibility score color
  const getScoreColor = (score: number): string => {
    if (score >= 80) {
      return '#2ECC71';
    } // Green
    if (score >= 60) {
      return '#F39C12';
    } // Orange
    return '#95A5A6'; // Gray
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Profile Photo */}
      <View style={styles.photoContainer}>
        <Image source={{ uri: profilePhoto }} style={styles.photo} resizeMode="cover" />

        {/* Verification Badges */}
        <View style={styles.badgeContainer}>
          {verificationStatus.idVerified && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#2ECC71" />
            </View>
          )}
          {verificationStatus.backgroundCheckComplete && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="security" size={14} color="#3498DB" />
            </View>
          )}
          {openToGroupLiving && (
            <View style={[styles.badge, styles.villageBadge]}>
              <MaterialCommunityIcons name="home-group" size={14} color="#F39C12" />
            </View>
          )}
        </View>

        {/* Compatibility Score */}
        <View
          style={[
            styles.compatibilityBadge,
            { backgroundColor: getScoreColor(compatibilityScore) },
          ]}
        >
          <Text style={styles.compatibilityText}>{compatibilityScore}%</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionButtons}>
          {onSave && (
            <TouchableOpacity
              style={[styles.actionButton, isSaved && styles.actionButtonActive]}
              onPress={(e) => {
                e.stopPropagation();
                onSave();
              }}
            >
              <MaterialCommunityIcons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          )}
          {onCompare && (
            <TouchableOpacity
              style={[styles.actionButton, isInComparison && styles.actionButtonActive]}
              onPress={(e) => {
                e.stopPropagation();
                onCompare();
              }}
            >
              <MaterialCommunityIcons
                name={isInComparison ? 'compare' : 'compare'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.infoContainer}>
        {/* Name & Age */}
        <Text style={styles.nameText} numberOfLines={1}>
          {firstName}, {age}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={12} color="#95A5A6" />
          <Text style={styles.locationText} numberOfLines={1}>
            {city}, {state}
          </Text>
        </View>

        {/* Children Info (NO PII - counts and age groups only) */}
        <View style={styles.childrenRow}>
          <MaterialCommunityIcons name="account-group" size={12} color="#95A5A6" />
          <Text style={styles.childrenText} numberOfLines={1}>
            {childrenCount} {childrenCount === 1 ? 'child' : 'children'} (
            {formatAgeGroups(childrenAgeGroups)})
          </Text>
        </View>

        {/* Budget */}
        <View style={styles.budgetRow}>
          <MaterialCommunityIcons name="currency-usd" size={12} color="#95A5A6" />
          <Text style={styles.budgetText} numberOfLines={1}>
            ${budget}/mo
          </Text>
        </View>

        {/* Housing Type */}
        <View style={styles.housingRow}>
          <MaterialCommunityIcons name="home" size={12} color="#95A5A6" />
          <Text style={styles.housingText} numberOfLines={1}>
            {housingPreferences.housingType === 'either'
              ? 'Any type'
              : housingPreferences.housingType.charAt(0).toUpperCase() +
                housingPreferences.housingType.slice(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },

  // Photo Section
  photoContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  // Badges
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  villageBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },

  // Compatibility Score
  compatibilityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compatibilityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Quick Actions
  actionButtons: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#3498DB',
  },

  // Info Section
  infoContainer: {
    padding: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  childrenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  childrenText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  budgetText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  housingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  housingText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
});
