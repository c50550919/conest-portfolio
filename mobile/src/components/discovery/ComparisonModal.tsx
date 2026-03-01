/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * ComparisonModal Component
 *
 * Side-by-side profile comparison view for housing matches.
 * Displays key attributes for comparing multiple profiles.
 *
 * Features:
 * - Horizontal scroll for 2-4 profiles
 * - Key attribute comparison
 * - Remove individual profiles
 * - Compatibility breakdown trigger
 *
 * Created: 2025-12-08
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ExtendedProfileCard } from '../../types/discovery';

const { width } = Dimensions.get('window');

export interface ComparisonProfile {
  profile: ExtendedProfileCard;
  addedAt: string;
}

interface ComparisonModalProps {
  visible: boolean;
  profiles: ComparisonProfile[];
  onClose: () => void;
  onRemoveProfile: (userId: string) => void;
  onShowBreakdown: () => void;
  loadingBreakdown: boolean;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  visible,
  profiles,
  onClose,
  onRemoveProfile,
  onShowBreakdown,
  loadingBreakdown,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Compare Profiles ({profiles.length})
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          {/* Comparison Content */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.scrollView}
          >
            {profiles.map((comparisonItem) => {
              const profile = comparisonItem.profile;
              return (
                <View key={profile.userId} style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <Text style={styles.profileName}>
                      {profile.firstName}, {profile.age}
                    </Text>
                    <Text style={styles.profileLocation}>
                      {profile.city}, {profile.state}
                    </Text>
                    <Text style={styles.compatibilityScore}>
                      Compatibility: {profile.compatibilityScore}%
                    </Text>
                  </View>

                  <View style={styles.attributeList}>
                    {profile.housingBudget && (
                      <View style={styles.attribute}>
                        <Text style={styles.attributeLabel}>Budget</Text>
                        <Text style={styles.attributeValue}>
                          ${profile.housingBudget.min} - ${profile.housingBudget.max}/mo
                        </Text>
                      </View>
                    )}

                    {profile.parenting?.philosophy && (
                      <View style={styles.attribute}>
                        <Text style={styles.attributeLabel}>
                          Parenting Philosophy
                        </Text>
                        <Text style={styles.attributeValue}>
                          {profile.parenting.philosophy
                            .split('-')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                        </Text>
                      </View>
                    )}

                    {profile.schedule?.workSchedule && (
                      <View style={styles.attribute}>
                        <Text style={styles.attributeLabel}>Work Schedule</Text>
                        <Text style={styles.attributeValue}>
                          {profile.schedule.workSchedule.charAt(0).toUpperCase() +
                            profile.schedule.workSchedule.slice(1)}
                        </Text>
                      </View>
                    )}

                    {profile.housingPreferences?.housingType && (
                      <View style={styles.attribute}>
                        <Text style={styles.attributeLabel}>Housing Type</Text>
                        <Text style={styles.attributeValue}>
                          {profile.housingPreferences.housingType.charAt(0).toUpperCase() +
                            profile.housingPreferences.housingType.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveProfile(profile.userId)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {/* Compatibility Breakdown Button (only for 2 profiles) */}
          {profiles.length === 2 && (
            <View style={styles.breakdownContainer}>
              <TouchableOpacity
                testID="compatibility-breakdown-button"
                style={styles.breakdownButton}
                onPress={onShowBreakdown}
                disabled={loadingBreakdown}
              >
                {loadingBreakdown ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons
                    name="chart-donut"
                    size={24}
                    color="#FFFFFF"
                    style={styles.breakdownIcon}
                  />
                )}
                <Text style={styles.breakdownButtonText}>
                  {loadingBreakdown ? 'Loading...' : 'Show Detailed Compatibility'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    width: width * 0.85,
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#E1E8ED',
  },
  profileHeader: {
    backgroundColor: '#F5F6F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  profileLocation: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  compatibilityScore: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '600',
  },
  attributeList: {
    gap: 12,
  },
  attribute: {
    marginBottom: 4,
  },
  attributeLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  attributeValue: {
    fontSize: 14,
    color: '#2C3E50',
  },
  removeButton: {
    backgroundColor: '#E74C3C',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  breakdownContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
  },
  breakdownButton: {
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownIcon: {
    marginRight: 8,
  },
  breakdownButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ComparisonModal;
