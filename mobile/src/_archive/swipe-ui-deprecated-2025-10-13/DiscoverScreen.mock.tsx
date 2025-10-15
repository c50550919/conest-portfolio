/**
 * Discover Screen - MOCK VERSION for UI Testing
 *
 * Purpose: Test mission-focused UI changes without backend
 *
 * To use: Temporarily replace DiscoverScreen.tsx import with this file
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

// Components
import SwipeableCard from '../../components/discovery/SwipeableCard';
import MatchModal from '../../components/discovery/MatchModal';

// Mock data matching ProfileCard expected structure
const MOCK_PROFILES = [
  {
    userId: '1',
    firstName: 'Sarah',
    age: 32,
    city: 'San Francisco',
    state: 'CA',
    profilePhoto: 'https://i.pravatar.cc/300?img=1',
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'elementary'],
    compatibilityScore: 85,
    verificationStatus: {
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
    },
    budget: 1500,
    moveInDate: '2025-11-01',
    bio: 'Single mom looking for a supportive household to share expenses and parenting duties.',
  },
  {
    userId: '2',
    firstName: 'Maria',
    age: 28,
    city: 'Oakland',
    state: 'CA',
    profilePhoto: 'https://i.pravatar.cc/300?img=5',
    childrenCount: 1,
    childrenAgeGroups: ['elementary'],
    compatibilityScore: 78,
    verificationStatus: {
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
    },
    budget: 1200,
    moveInDate: '2025-12-15',
    bio: 'Working parent seeking stable housing partnership with another single parent.',
  },
  {
    userId: '3',
    firstName: 'Jennifer',
    age: 35,
    city: 'Berkeley',
    state: 'CA',
    profilePhoto: 'https://i.pravatar.cc/300?img=9',
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'teen'],
    compatibilityScore: 92,
    verificationStatus: {
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
    },
    budget: 1800,
    moveInDate: '2025-10-15',
    bio: 'Looking for a family-friendly household to share with other parents who value safety and community.',
  },
];

export default function DiscoverScreenMock() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMatchModalVisible, setIsMatchModalVisible] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<any>(null);

  const profiles = MOCK_PROFILES;

  // Handle swipe action
  const handleSwipe = (direction: 'left' | 'right') => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    console.log(`${direction === 'right' ? 'Interested in' : 'Passed on'} ${profile.firstName}`);

    // Simulate match on right swipe for demo
    if (direction === 'right') {
      console.log('🏠 Household Match created! (MOCK)');

      // Show match modal for demo
      setCurrentMatch({
        matchId: 'mock-match-123',
        matchedUserId: profile.userId,
        compatibilityScore: profile.compatibilityScore,
        createdAt: new Date().toISOString(),
      });
      setIsMatchModalVisible(true);
    }

    // Move to next card
    setCurrentIndex((prev) => prev + 1);
  };

  // Handle match modal actions
  const handleSendMessage = () => {
    setIsMatchModalVisible(false);
    Alert.alert('Success', 'This would navigate to messages in the full app');
  };

  const closeMatchModal = () => {
    setIsMatchModalVisible(false);
  };

  // Empty state - No more profiles
  if (currentIndex >= profiles.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name="home-search"
            size={80}
            color="#999"
          />
          <Text style={styles.emptyTitle}>No More Profiles Right Now</Text>
          <Text style={styles.emptySubtitle}>
            You've reviewed all available profiles. Check back soon for new household matches!
          </Text>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setCurrentIndex(0)}
          >
            <Text style={styles.reviewButtonText}>Reset Demo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render visible cards (current + next 2)
  const visibleCards = profiles
    .slice(currentIndex, currentIndex + 3)
    .reverse(); // Reverse for correct z-index stacking

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>
          Swipe right to connect, left to continue searching
        </Text>
        <View style={styles.mockBanner}>
          <MaterialCommunityIcons
            name="test-tube"
            size={16}
            color="#fff"
          />
          <Text style={styles.mockText}>MOCK DATA - UI Testing Mode</Text>
        </View>
      </View>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {visibleCards.map((profile, stackIndex) => {
          const isTopCard = stackIndex === visibleCards.length - 1;

          return (
            <SwipeableCard
              key={profile.userId}
              profile={profile}
              onSwipe={isTopCard ? handleSwipe : () => {}}
              index={stackIndex}
            />
          );
        })}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleSwipe('left')}
          accessibilityLabel="Continue to next profile"
          accessibilityHint="Double tap to view the next housing partner"
        >
          <MaterialCommunityIcons name="arrow-right-circle-outline" size={32} color="#9E9E9E" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={() => {
            const profile = profiles[currentIndex];
            if (profile) {
              Alert.alert(
                'Profile Info',
                `Household Fit: ${profile.compatibilityScore}%\nChildren: ${profile.childrenCount}\nAge Groups: ${profile.childrenAgeGroups.join(', ')}`,
                [{ text: 'OK' }]
              );
            }
          }}
          accessibilityLabel="View detailed profile information"
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={24}
            color="#2196F3"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.interestButton]}
          onPress={() => handleSwipe('right')}
          accessibilityLabel="Express interest in this housing partner"
          accessibilityHint="Double tap to indicate you're interested in connecting"
        >
          <MaterialCommunityIcons name="home-account" size={32} color="#2ECC71" />
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      <MatchModal
        visible={isMatchModalVisible}
        match={currentMatch}
        onClose={closeMatchModal}
        onSendMessage={handleSendMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  mockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#9E9E9E',
  },
  interestButton: {
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  infoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  reviewButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#3498DB',
    borderRadius: 24,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
