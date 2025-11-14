/**
 * CoNest Home Screen
 * Dashboard with quick actions, match notifications, and household status
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector((state: RootState) => state.auth.user);

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
  const fullName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email || 'User';

  return (
    <SafeAreaView testID="home-screen" style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text testID="welcome-message" style={styles.greeting}>Welcome back!</Text>
            <Text testID="user-name" style={styles.userName}>{fullName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="bell-outline" size={24} color={colors.text.primary} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            testID="stat-new-connections"
            style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}
            onPress={() => navigation.navigate('Discover' as never)}
          >
            <Icon name="account-search" size={32} color={colors.primary} />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>New Connections</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="stat-messages"
            style={[styles.statCard, { backgroundColor: colors.secondary + '15' }]}
            onPress={() => navigation.navigate('Messages' as never)}
          >
            <Icon name="message-text" size={32} color={colors.secondary} />
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="stat-compatibility"
            style={[styles.statCard, { backgroundColor: colors.tertiary + '15' }]}
            onPress={() => navigation.navigate('Discover' as never)}
          >
            <Icon name="home-group" size={32} color={colors.tertiary} />
            <Text style={styles.statNumber}>85%</Text>
            <Text style={styles.statLabel}>Compatibility</Text>
          </TouchableOpacity>
        </View>

        {/* Household Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household Status</Text>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.householdCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.householdHeader}>
              <Icon name="home-group" size={32} color="#FFFFFF" />
              <View style={styles.verifiedBadge}>
                <Icon name="check-decagram" size={16} color={colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.householdTitle}>Mountain View House</Text>
            <Text style={styles.householdSubtitle}>3 Bedrooms • 2 Parents • 4 Children</Text>
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
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Discover' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary + '20' }]}>
                <Icon name="account-search" size={28} color={colors.primary} />
              </View>
              <Text style={styles.actionLabel}>Find Roommates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Messages' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.secondary + '20' }]}>
                <Icon name="message-text" size={28} color={colors.secondary} />
              </View>
              <Text style={styles.actionLabel}>Messages</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Household' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tertiary + '20' }]}>
                <Icon name="home-edit" size={28} color={colors.tertiary} />
              </View>
              <Text style={styles.actionLabel}>Manage Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: '#9C27B0' + '20' }]}>
                <Icon name="file-document-outline" size={28} color="#9C27B0" />
              </View>
              <Text style={styles.actionLabel}>Documents</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Icon name="account-multiple-check" size={20} color={colors.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New Connection!</Text>
              <Text style={styles.activitySubtitle}>Connected with Jennifer K. • 95% compatible</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Icon name="currency-usd" size={20} color={colors.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Rent Payment Received</Text>
              <Text style={styles.activitySubtitle}>$850 from Maria Lopez</Text>
              <Text style={styles.activityTime}>1 day ago</Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Icon name="check-circle" size={20} color={colors.primary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Background Check Complete</Text>
              <Text style={styles.activitySubtitle}>All verifications passed</Text>
              <Text style={styles.activityTime}>3 days ago</Text>
            </View>
          </View>
        </View>

        {/* Safety Tips */}
        <View style={[styles.section, { marginBottom: spacing.xl }]}>
          <View style={styles.tipCard}>
            <Icon name="shield-check" size={24} color={colors.primary} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Safety First</Text>
              <Text style={styles.tipText}>
                Remember to always meet potential roommates in public places and verify their identity before sharing personal information.
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
  },
  userName: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    ...typography.h4,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
    borderRadius: borderRadius.lg,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionIcon: {
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
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
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
  },
  activitySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
  },
  activityTime: {
    ...typography.caption,
    color: colors.text.hint,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  tipContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  tipTitle: {
    ...typography.subtitle1,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
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
});

export default HomeScreen;
