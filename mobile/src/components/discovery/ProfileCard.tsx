/**
 * ProfileCard Component
 *
 * Purpose: Display parent profile in Discovery Screen
 * Constitution: Principle I (Child Safety - ONLY childrenCount, childrenAgeGroups)
 *
 * Features:
 * - Profile photo, name, age, city
 * - Children info (count + age groups only)
 * - Compatibility score with visual indicator
 * - Verification badges (ID, background check, phone)
 * - Budget range, move-in date, bio
 *
 * Child Safety: NO names, photos, ages, schools of children
 *
 * Created: 2025-10-06
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ProfileCard as ProfileCardType } from '../../services/api/discoveryAPI';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;

interface ProfileCardProps {
  profile: ProfileCardType;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const {
    firstName,
    age,
    city,
    childrenCount,
    childrenAgeGroups,
    compatibilityScore,
    verificationStatus,
    budget,
    moveInDate,
    bio,
    profilePhoto,
  } = profile;

  // Format age groups for display
  const ageGroupLabels: Record<string, string> = {
    toddler: '0-5',
    elementary: '6-12',
    teen: '13-18',
  };

  const formattedAgeGroups = childrenAgeGroups
    .map((group) => ageGroupLabels[group] || group)
    .join(', ');

  // Compatibility color based on score
  const getCompatibilityColor = (score: number): string => {
    if (score >= 80) {
      return '#4CAF50';
    } // Green
    if (score >= 60) {
      return '#FFC107';
    } // Yellow
    if (score >= 40) {
      return '#FF9800';
    } // Orange
    return '#F44336'; // Red
  };

  // Format budget
  const budgetText = budget ? `$${budget.toLocaleString()}/mo` : 'Not specified';

  // Format move-in date
  const moveInText = moveInDate
    ? new Date(moveInDate).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Flexible';

  return (
    <View style={styles.card}>
      {/* Profile Photo with Gradient Overlay */}
      <View style={styles.photoContainer}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.defaultAvatar]}>
            <Text style={styles.defaultAvatarText}>No Photo</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

        {/* Compatibility Score Badge */}
        <View
          style={[
            styles.compatibilityBadge,
            { backgroundColor: getCompatibilityColor(compatibilityScore) },
          ]}
        >
          <Text style={styles.compatibilityText}>{compatibilityScore}%</Text>
          <Text style={styles.compatibilityLabel}>Match</Text>
        </View>

        {/* Basic Info Overlay */}
        <View style={styles.basicInfo}>
          <Text style={styles.nameAge}>
            {firstName}, {age}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#fff" />
            <Text style={styles.city}>{city || 'Location not set'}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Details */}
      <ScrollView style={styles.details} showsVerticalScrollIndicator={false}>
        {/* Verification Badges */}
        <View style={styles.badgesRow}>
          {verificationStatus.idVerified && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.badgeText}>ID Verified</Text>
            </View>
          )}
          {verificationStatus.backgroundCheckComplete && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="certificate" size={16} color="#4CAF50" />
              <Text style={styles.badgeText}>Background Check</Text>
            </View>
          )}
          {verificationStatus.phoneVerified && (
            <View style={styles.badge}>
              <MaterialCommunityIcons name="phone-check" size={16} color="#4CAF50" />
              <Text style={styles.badgeText}>Phone Verified</Text>
            </View>
          )}
        </View>

        {/* Children Info - ONLY count and age groups (NO PII) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="human-male-child" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Children</Text>
          </View>
          <Text style={styles.sectionText}>
            {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
          </Text>
          <Text style={styles.sectionSubtext}>Age groups: {formattedAgeGroups}</Text>
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="currency-usd" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Budget</Text>
          </View>
          <Text style={styles.sectionText}>{budgetText}</Text>
        </View>

        {/* Move-in Date */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="calendar" size={20} color="#333" />
            <Text style={styles.sectionTitle}>Move-in</Text>
          </View>
          <Text style={styles.sectionText}>{moveInText}</Text>
        </View>

        {/* Bio */}
        {bio && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="text-box-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  photoContainer: {
    height: CARD_HEIGHT * 0.5,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  compatibilityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  compatibilityText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  compatibilityLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: -2,
  },
  basicInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  nameAge: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  city: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
  },
  details: {
    flex: 1,
    padding: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 28,
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#777',
    marginLeft: 28,
    marginTop: 2,
  },
  bioText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginLeft: 28,
  },
});
