/**
 * Discover Screen - Production Implementation
 *
 * Purpose: Swipeable discovery screen with real-time match notifications
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Features:
 * - React Query infinite scroll with cursor pagination
 * - Swipeable card stack with 60fps animations
 * - Real-time match notifications via Socket.io
 * - Screenshot detection and reporting
 * - Optimistic updates for instant feedback
 * - Empty states and loading UI
 *
 * Child Safety: NO child PII displayed (only count + age groups)
 *
 * Created: 2025-10-06
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
// import * as ScreenCapture from 'expo-screen-capture'; // TODO: Implement screenshot detection for bare RN

// Hooks
import {
  useDiscoveryProfiles,
  useRecordSwipe,
  useReportScreenshot,
  getFlattenedProfiles,
  hasMoreProfiles,
} from '../../hooks/useDiscoveryProfiles';
import {
  useMatchNotifications,
  useSocketConnection,
} from '../../hooks/useMatchNotifications';
import discoveryAPI from '../../services/api/discoveryAPI';

// Components
import SwipeableCard from '../../components/discovery/SwipeableCard';
import MatchModal from '../../components/discovery/MatchModal';
import ProfileDetailsModal from '../../components/discovery/ProfileDetailsModal';

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<typeof profiles[0] | null>(null);

  // React Query - Fetch profiles
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    isError,
    error,
  } = useDiscoveryProfiles(10);

  // React Query - Record swipe mutation
  const { mutate: recordSwipe, isPending: isSwipePending } = useRecordSwipe();

  // React Query - Screenshot reporting
  const { mutate: reportScreenshot } = useReportScreenshot();

  // Socket.io - Real-time match notifications
  const { isConnected } = useSocketConnection();
  const { currentMatch, isMatchModalVisible, closeMatchModal } =
    useMatchNotifications();

  // Get flattened profiles from infinite query
  const profiles = getFlattenedProfiles(data);
  const hasMore = hasMoreProfiles(data);

  // DIAGNOSTIC: Component mount and query state logging
  useEffect(() => {
    console.log('[DiscoverScreen] ========== MOUNTED ==========');
    console.log('[DiscoverScreen] isLoading:', isLoading);
    console.log('[DiscoverScreen] isError:', isError);
    console.log('[DiscoverScreen] isFetching:', isFetching);
    console.log('[DiscoverScreen] data:', data);
    console.log('[DiscoverScreen] error:', error);
    console.log('[DiscoverScreen] profiles.length:', profiles.length);
  }, [isLoading, isError, isFetching, data, error, profiles.length]);

  // DIAGNOSTIC: Test direct API call bypassing React Query
  useEffect(() => {
    console.log('[DiscoverScreen] Testing direct API call...');
    discoveryAPI.getProfiles(undefined, 10)
      .then(result => {
        console.log('[DiscoverScreen] Direct API SUCCESS:', result.profiles.length, 'profiles');
      })
      .catch(err => {
        console.error('[DiscoverScreen] Direct API ERROR:', err.message, err.response?.data);
      });
  }, []);

  // Screenshot detection (Child Safety Feature)
  // TODO: Implement screenshot detection for bare React Native
  // Requires native module setup or alternative approach
  /*
  useEffect(() => {
    const subscription = ScreenCapture.addScreenshotListener(() => {
      const currentProfile = profiles[currentIndex];
      if (currentProfile) {
        console.log('📸 Screenshot detected for:', currentProfile.userId);

        // Show warning to user
        Alert.alert(
          'Screenshot Detected',
          'Screenshots are discouraged to protect privacy. The profile owner has been notified.',
          [{ text: 'OK' }]
        );

        // Report to backend
        reportScreenshot({ targetUserId: currentProfile.userId });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentIndex, profiles, reportScreenshot]);
  */

  // Prefetch next page when approaching end
  useEffect(() => {
    if (profiles.length - currentIndex <= 3 && hasMore && !isFetching) {
      fetchNextPage();
    }
  }, [currentIndex, profiles.length, hasMore, isFetching, fetchNextPage]);

  // Handle swipe action
  const handleSwipe = (direction: 'left' | 'right') => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    // Record swipe via API
    recordSwipe(
      {
        targetUserId: profile.userId,
        direction,
      },
      {
        onSuccess: (data) => {
          console.log(`${direction === 'right' ? 'Interested in' : 'Passed on'} ${profile.firstName}`);

          // Match notification handled by useMatchNotifications hook via Socket.io
          if (data.matchCreated) {
            console.log('🏠 Household Match created!', data.match);
          }
        },
        onError: (error) => {
          console.error('Swipe error:', error);
          Alert.alert('Error', 'Failed to record swipe. Please try again.');
        },
      }
    );

    // Move to next card
    setCurrentIndex((prev) => prev + 1);
  };

  // Handle match modal actions
  const handleSendMessage = () => {
    closeMatchModal();
    if (currentMatch) {
      // Navigate to messages screen with matched user
      navigation.navigate('Messages' as never, {
        userId: currentMatch.matchedUserId,
      } as never);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView testID="discover-loading" style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Finding compatible housing partners...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView testID="discover-error" style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={64}
            color="#F44336"
          />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorSubtitle}>
            {error?.message || 'Unable to load profiles'}
          </Text>
          <TouchableOpacity
            testID="retry-button"
            style={styles.retryButton}
            onPress={() => {
              setCurrentIndex(0);
              fetchNextPage();
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state - No more profiles
  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <SafeAreaView testID="discover-empty" style={styles.container}>
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons
            name="home-search"
            size={80}
            color="#999"
          />
          <Text style={styles.emptyTitle}>No More Profiles Right Now</Text>
          <Text style={styles.emptySubtitle}>
            {profiles.length === 0
              ? "We're finding compatible housing partners for you!"
              : "You've reviewed all available profiles. Check back soon for new household matches!"}
          </Text>
          {!hasMore && profiles.length > 0 && (
            <TouchableOpacity
              testID="review-matches-button"
              style={styles.reviewButton}
              onPress={() => navigation.navigate('Matches' as never)}
            >
              <Text style={styles.reviewButtonText}>Review Your Household Matches</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Render visible cards (current + next 2)
  const visibleCards = profiles
    .slice(currentIndex, currentIndex + 3)
    .reverse(); // Reverse for correct z-index stacking

  return (
    <SafeAreaView testID="discover-screen" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>
          Swipe right to connect, left to continue searching
        </Text>
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons
              name="wifi-off"
              size={16}
              color="#fff"
            />
            <Text style={styles.offlineText}>Offline - Reconnecting...</Text>
          </View>
        )}
      </View>

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {visibleCards.map((profile, stackIndex) => {
          const actualIndex = currentIndex + (visibleCards.length - 1 - stackIndex);
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
          testID="pass-button"
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleSwipe('left')}
          disabled={isSwipePending}
          accessibilityLabel="Continue to next profile"
          accessibilityHint="Double tap to view the next housing partner"
        >
          <MaterialCommunityIcons name="arrow-right-circle-outline" size={32} color="#9E9E9E" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="info-button"
          style={[styles.actionButton, styles.infoButton]}
          onPress={() => {
            const profile = profiles[currentIndex];
            if (profile) {
              setSelectedProfile(profile);
              setIsProfileModalVisible(true);
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
          testID="like-button"
          style={[styles.actionButton, styles.interestButton]}
          onPress={() => handleSwipe('right')}
          disabled={isSwipePending}
          accessibilityLabel="Express interest in this housing partner"
          accessibilityHint="Double tap to indicate you're interested in connecting"
        >
          <MaterialCommunityIcons name="home-account" size={32} color="#2ECC71" />
        </TouchableOpacity>
      </View>

      {/* Loading indicator for pending swipe */}
      {isSwipePending && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#E91E63" />
        </View>
      )}

      {/* Match Modal */}
      <MatchModal
        visible={isMatchModalVisible}
        match={currentMatch}
        onClose={closeMatchModal}
        onSendMessage={handleSendMessage}
      />

      {/* Profile Details Modal */}
      <ProfileDetailsModal
        visible={isProfileModalVisible}
        profile={selectedProfile}
        onClose={() => {
          setIsProfileModalVisible(false);
          setSelectedProfile(null);
        }}
        onInterested={() => {
          // User is interested - trigger right swipe
          handleSwipe('right');
        }}
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  offlineText: {
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#E91E63',
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#E91E63',
    borderRadius: 24,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
