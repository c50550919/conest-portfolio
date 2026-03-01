/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * CoNest Home Screen
 * Dashboard with quick actions, match notifications, and household status
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchMyHousehold } from '../../store/slices/householdSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';
import connectionRequestsAPI from '../../services/api/connectionRequestsAPI';
import enhancedMessagesAPI from '../../services/api/enhancedMessagesAPI';
import verificationAPI from '../../services/api/verificationAPI';

// Shadow utility for consistent elevation across platforms
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const cardShadowMedium = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 5,
};

const cardShadowLight = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
};

interface DashboardStats {
  pendingConnections: number;
  unreadMessages: number;
  avgCompatibility: number;
}

// Activity types derived from existing data sources
type ActivityType = 'connection_request' | 'message' | 'verification';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: Date;
  icon: string;
  iconColor: string;
  navigationTarget: string;
}

// Helper function to format relative time
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);

  // Household state from Redux
  const household = useSelector((state: RootState) => state.household.household);
  const householdLoading = useSelector((state: RootState) => state.household.loading);
  const householdMembers = useSelector((state: RootState) => state.household.members);

  // Dashboard stats state
  const [stats, setStats] = useState<DashboardStats>({
    pendingConnections: 0,
    unreadMessages: 0,
    avgCompatibility: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // Recent activities state
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(false);

    let pendingConnections = 0;
    let unreadMessages = 0;
    const avgCompatibility = 0; // TODO: Add compatibility score API endpoint
    let hasError = false;

    // Fetch connection request statistics (independent call)
    try {
      const connectionStats = await connectionRequestsAPI.getStatistics();
      pendingConnections = connectionStats.received?.pending ?? 0;
    } catch (err) {
      console.log('[HomeScreen] Could not fetch connection stats:', err);
      hasError = true;
    }

    // Fetch conversations to count unread messages (independent call)
    try {
      const response = await enhancedMessagesAPI.getConversations();
      const conversations = response.data || [];
      unreadMessages = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
    } catch (err) {
      console.log('[HomeScreen] Could not fetch messages:', err);
      hasError = true;
    }

    setStats({
      pendingConnections,
      unreadMessages,
      avgCompatibility,
    });
    setStatsError(hasError);
    setIsLoadingStats(false);
  }, []);

  // Fetch recent activities from multiple sources
  const fetchRecentActivities = useCallback(async () => {
    setIsLoadingActivities(true);
    const activities: ActivityItem[] = [];

    // 1. Fetch pending connection requests (received)
    try {
      const pendingRequests = await connectionRequestsAPI.listReceivedRequests('pending');
      pendingRequests.slice(0, 3).forEach((request) => {
        activities.push({
          id: `conn-${request.id}`,
          type: 'connection_request',
          title: 'New Connection Request',
          subtitle: `${request.senderProfile?.firstName || 'Someone'} wants to connect`,
          timestamp: new Date(request.sent_at),
          icon: 'account-multiple-plus',
          iconColor: colors.primary,
          navigationTarget: 'ConnectionRequests',
        });
      });
    } catch (err) {
      console.log('[HomeScreen] Could not fetch connection requests for activities:', err);
    }

    // 2. Fetch recent unread messages (from conversations)
    try {
      const response = await enhancedMessagesAPI.getConversations();
      const conversations = response.data || [];
      // Get conversations with unread messages
      conversations
        .filter(conv => conv.unreadCount > 0)
        .slice(0, 3)
        .forEach((conv) => {
          activities.push({
            id: `msg-${conv.id}`,
            type: 'message',
            title: 'New Message',
            subtitle: `${conv.participantName}: ${conv.lastMessage?.slice(0, 35) || 'New message'}...`,
            timestamp: new Date(conv.lastMessageAt),
            icon: 'message-text',
            iconColor: colors.secondary,
            navigationTarget: 'Messages',
          });
        });
    } catch (err) {
      console.log('[HomeScreen] Could not fetch messages for activities:', err);
    }

    // 3. Check verification status for completed items
    try {
      const verificationStatus = await verificationAPI.getVerificationStatus();
      // Add activity if background check is approved
      if (verificationStatus.background_check_status === 'approved') {
        activities.push({
          id: 'verification-bg-complete',
          type: 'verification',
          title: 'Background Check Complete',
          subtitle: 'All verifications passed',
          // Use bg_check_expiration_date to estimate when it was verified (30 days before expiry)
          timestamp: verificationStatus.bg_check_expiration_date
            ? new Date(new Date(verificationStatus.bg_check_expiration_date).getTime() - 30 * 24 * 60 * 60 * 1000)
            : new Date(),
          icon: 'check-circle',
          iconColor: colors.success || colors.primary,
          navigationTarget: 'Profile',
        });
      }
    } catch (err) {
      console.log('[HomeScreen] Could not fetch verification status for activities:', err);
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit to 5 most recent
    setRecentActivities(activities.slice(0, 5));
    setIsLoadingActivities(false);
  }, []);

  // Fetch stats and household data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardStats();
      fetchRecentActivities();
      dispatch(fetchMyHousehold());
    }, [fetchDashboardStats, fetchRecentActivities, dispatch])
  );

  // Debug logging
  console.log('[HomeScreen] User from Redux:', user);

  // Show loading state if user data is not yet available
  if (!user) {
    console.log('[HomeScreen] No user data found in Redux, showing loading state');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate full name from user data with fallbacks
  const fullName =
    user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || 'User';

  return (
    <SafeAreaView testID="home-screen" style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text testID="welcome-message" style={styles.greeting}>
              Welcome back!
            </Text>
            <Text testID="user-name" style={styles.userName}>
              {fullName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Messages' as never)}
          >
            <Icon name="bell-outline" size={24} color={colors.text.primary} />
            {stats.unreadMessages > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {stats.unreadMessages > 99 ? '99+' : stats.unreadMessages}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            testID="stat-new-connections"
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('ConnectionRequests' as never)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.primary + '18', colors.primary + '08']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="account-multiple-plus" size={26} color={colors.primary} />
              </View>
              <Text style={styles.statNumber}>{isLoadingStats ? '-' : statsError && stats.pendingConnections === 0 ? '\u2014' : stats.pendingConnections}</Text>
              <Text style={styles.statLabel}>Pending{'\n'}Requests</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            testID="stat-messages"
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('Messages' as never)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.secondary + '18', colors.secondary + '08']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.statIconContainer, { backgroundColor: colors.secondary + '20' }]}>
                <Icon name="message-text" size={26} color={colors.secondary} />
              </View>
              <Text style={styles.statNumber}>{isLoadingStats ? '-' : statsError && stats.unreadMessages === 0 ? '\u2014' : stats.unreadMessages}</Text>
              <Text style={styles.statLabel}>Unread{'\n'}Messages</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            testID="stat-compatibility"
            style={styles.statCardWrapper}
            onPress={() => navigation.navigate('Discover' as never)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.tertiary + '18', colors.tertiary + '08']}
              style={styles.statCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.statIconContainer, { backgroundColor: colors.tertiary + '20' }]}>
                <Icon name="home-search" size={26} color={colors.tertiary} />
              </View>
              <Text style={styles.statNumber}>
                {isLoadingStats
                  ? '-'
                  : stats.avgCompatibility > 0
                    ? `${stats.avgCompatibility}%`
                    : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Discover</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Household Status - Conditional Rendering */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household Status</Text>

          {householdLoading ? (
            // Loading state
            <View style={styles.householdLoadingCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.householdLoadingText}>Loading household...</Text>
            </View>
          ) : household ? (
            // Real household data
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.householdCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.householdHeader}>
                <Icon name="home-group" size={32} color="#FFFFFF" />
                {/* Show verified badge only if all members have completed verification */}
                {householdMembers.length > 0 && householdMembers.every(m => m.verifiedAt || m.verificationBadges?.idVerified) && (
                  <View style={styles.verifiedBadge}>
                    <Icon name="check-decagram" size={16} color={colors.primary} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.householdTitle}>{household.name}</Text>
              <Text style={styles.householdSubtitle}>
                {household.address?.city}, {household.address?.state} • {householdMembers.length} {householdMembers.length === 1 ? 'Member' : 'Members'}
              </Text>
              <View style={styles.householdActions}>
                <TouchableOpacity
                  testID="household-schedule-button"
                  style={styles.householdButton}
                  onPress={() => navigation.navigate('Household' as never)}
                >
                  <Icon name="calendar" size={18} color="#FFFFFF" />
                  <Text style={styles.householdButtonText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="household-expenses-button"
                  style={styles.householdButton}
                  onPress={() => navigation.navigate('Household' as never)}
                >
                  <Icon name="currency-usd" size={18} color="#FFFFFF" />
                  <Text style={styles.householdButtonText}>Expenses</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            // No household - CTA card
            <View testID="no-household-card" style={styles.noHouseholdCard}>
              <View style={styles.noHouseholdIconWrapper}>
                <Icon name="home-search" size={40} color={colors.primary} />
              </View>
              <Text style={styles.noHouseholdTitle}>Find Your Co-Living Match!</Text>
              <Text style={styles.noHouseholdSubtitle}>
                Connect with verified parents and create your household.
              </Text>
              <View style={styles.noHouseholdButtons}>
                <TouchableOpacity
                  testID="discover-matches-button"
                  style={styles.discoverButton}
                  onPress={() => navigation.navigate('Discover' as never)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.discoverButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.discoverButtonText}>DISCOVER MATCHES</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  testID="create-household-button"
                  style={styles.createHouseholdButton}
                  onPress={() => navigation.navigate('CreateHousehold' as never)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.createHouseholdButtonText}>CREATE HOUSEHOLD</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Discover' as never)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.primary + '15', colors.primary + '05']}
                style={styles.actionIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="account-search" size={28} color={colors.primary} />
              </LinearGradient>
              <Text style={styles.actionLabel}>Find Roommates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Messages' as never)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.secondary + '15', colors.secondary + '05']}
                style={styles.actionIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="message-text" size={28} color={colors.secondary} />
              </LinearGradient>
              <Text style={styles.actionLabel}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Household' as never)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.tertiary + '15', colors.tertiary + '05']}
                style={styles.actionIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="home-edit" size={28} color={colors.tertiary} />
              </LinearGradient>
              <Text style={styles.actionLabel}>Manage Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Documents' as never)}
              testID="home-documents-button"
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#9C27B0' + '15', '#9C27B0' + '05']}
                style={styles.actionIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="file-document-outline" size={28} color="#9C27B0" />
              </LinearGradient>
              <Text style={styles.actionLabel}>Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ConnectionRequests' as never)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoadingActivities ? (
            <View style={styles.activityLoadingContainer}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.activityLoadingText}>Loading activity...</Text>
            </View>
          ) : recentActivities.length === 0 ? (
            <View style={styles.emptyActivityCard}>
              <Icon name="bell-off-outline" size={32} color={colors.text.hint} />
              <Text style={styles.emptyActivityText}>No recent activity</Text>
            </View>
          ) : (
            recentActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => navigation.navigate(activity.navigationTarget as never)}
                activeOpacity={0.7}
              >
                <View style={[styles.activityIcon, { backgroundColor: activity.iconColor + '12' }]}>
                  <Icon name={activity.icon} size={20} color={activity.iconColor} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activitySubtitle} numberOfLines={1}>
                    {activity.subtitle}
                  </Text>
                  <Text style={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.text.hint} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Safety Tips */}
        <View style={[styles.section, { marginBottom: spacing.xl }]}>
          <View style={styles.tipCard}>
            <Icon name="shield-check" size={24} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Safety First</Text>
              <Text style={styles.tipText}>
                Remember to always meet potential roommates in public places and verify their
                identity before sharing personal information.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  greeting: {
    ...typography.body1,
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },
  userName: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.xs,
    fontWeight: '700',
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...cardShadowLight,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCardWrapper: {
    flex: 1,
    borderRadius: borderRadius.lg,
    ...cardShadow,
    backgroundColor: colors.surface,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statNumber: {
    ...typography.h4,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  householdCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    ...cardShadowMedium,
  },
  householdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    gap: spacing.xxs,
  },
  verifiedText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  householdTitle: {
    ...typography.h5,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  householdSubtitle: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.md,
  },
  householdActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  householdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  householdButtonText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  householdLoadingCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    ...cardShadow,
  },
  householdLoadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  noHouseholdCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...cardShadowMedium,
  },
  noHouseholdIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  noHouseholdTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '700',
  },
  noHouseholdSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  noHouseholdButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  discoverButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...cardShadow,
  },
  discoverButtonGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  createHouseholdButton: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createHouseholdButtonText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...cardShadow,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionIconGradient: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...cardShadowLight,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
    fontWeight: '600',
  },
  activitySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
  },
  activityTime: {
    ...typography.caption,
    color: colors.text.hint,
    fontSize: 11,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '08',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...cardShadowLight,
  },
  tipContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tipTitle: {
    ...typography.subtitle1,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  tipText: {
    ...typography.body2,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  activityLoadingContainer: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadowLight,
  },
  activityLoadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  emptyActivityCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadowLight,
  },
  emptyActivityText: {
    ...typography.body2,
    color: colors.text.hint,
    marginTop: spacing.sm,
  },
});

export default HomeScreen;
