/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Pending Invites Screen
 *
 * Purpose: Display list of pending household invitations received by the user
 * Constitution: Principle I (Child Safety - NO child PII displayed)
 *
 * Features:
 * - List all pending household invitations
 * - Display household name, location, inviter info
 * - Show proposed rent share (formatted as currency)
 * - Display time remaining until expiration
 * - Navigate to ViewInvitationScreen on tap
 * - Pull-to-refresh functionality
 * - Loading skeleton while fetching
 * - Empty state and error state handling
 *
 * API Endpoint: GET /api/households/invitations/received
 *
 * Created: 2026-01-22
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, typography, borderRadius } from '../../theme';
import apiClient from '../../config/api';

// Navigation types
type HouseholdStackParamList = {
  HouseholdMain: undefined;
  Documents: undefined;
  CreateHousehold: undefined;
  PendingInvites: undefined;
  ViewInvitation: { invitationId: string };
};

type PendingInvitesNavigationProp = StackNavigationProp<HouseholdStackParamList, 'PendingInvites'>;

// ============================================================================
// Types
// ============================================================================

interface InvitationStatus {
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
}

interface HouseholdInvitation {
  id: string;
  householdId: string;
  inviterId: string;
  inviteeId: string;
  status: InvitationStatus['status'];
  proposedRentShare: number | null; // In cents
  expiresAt: string;
  createdAt: string;
}

interface HouseholdDetails {
  id: string;
  name: string;
  city: string;
  state: string;
  monthlyRent: number;
}

interface InviterDetails {
  id: string;
  firstName: string;
  lastName?: string;
}

interface InvitationWithDetails {
  invitation: HouseholdInvitation;
  household: HouseholdDetails;
  inviter: InviterDetails;
  members: Array<{
    userId: string;
    firstName: string;
    lastName?: string;
    role: string;
  }>;
}

interface GetInvitationsResponse {
  success: boolean;
  invitations: InvitationWithDetails[];
  count: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format cents to currency string (e.g., 150000 -> "$1,500.00")
 */
const formatCurrency = (cents: number | null): string => {
  if (cents === null || cents === undefined) {
    return 'Not specified';
  }
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
};

/**
 * Calculate time remaining until expiration
 */
const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expired';
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 1) {
    return `Expires in ${diffDays} days`;
  } else if (diffDays === 1) {
    return 'Expires in 1 day';
  } else if (diffHours > 1) {
    return `Expires in ${diffHours} hours`;
  } else if (diffHours === 1) {
    return 'Expires in 1 hour';
  } else {
    return 'Expires soon';
  }
};

/**
 * Get expiration urgency color
 */
const getExpirationColor = (expiresAt: string): string => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return colors.error;
  } else if (diffDays <= 3) {
    return colors.warning;
  }
  return colors.text.secondary;
};

// ============================================================================
// Skeleton Component
// ============================================================================

const SkeletonCard: React.FC = () => (
  <View style={styles.card} testID="invitation-skeleton">
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <View style={[styles.skeletonBox, styles.skeletonHouseholdName]} />
        <View style={styles.chevronPlaceholder} />
      </View>
      <View style={[styles.skeletonBox, styles.skeletonLocation]} />
      <View style={styles.inviterRow}>
        <View style={styles.skeletonAvatar} />
        <View style={[styles.skeletonBox, styles.skeletonInviterName]} />
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.skeletonBox, styles.skeletonRent]} />
        <View style={[styles.skeletonBox, styles.skeletonExpiry]} />
      </View>
    </View>
  </View>
);

// ============================================================================
// Invitation Card Component
// ============================================================================

interface InvitationCardProps {
  item: InvitationWithDetails;
  onPress: (invitationId: string) => void;
}

const InvitationCard: React.FC<InvitationCardProps> = ({ item, onPress }) => {
  const { invitation, household, inviter } = item;
  const expirationText = getTimeRemaining(invitation.expiresAt);
  const expirationColor = getExpirationColor(invitation.expiresAt);

  const handlePress = () => {
    onPress(invitation.id);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`invitation-card-${invitation.id}`}
    >
      <View style={styles.cardContent}>
        {/* Household Name and Chevron */}
        <View style={styles.cardHeader}>
          <Text style={styles.householdName} numberOfLines={1}>
            {household.name}
          </Text>
          <Icon name="chevron-right" size={24} color={colors.text.hint} />
        </View>

        {/* Location */}
        <View style={styles.locationRow}>
          <Icon name="map-marker-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.locationText}>
            {household.city}, {household.state}
          </Text>
        </View>

        {/* Inviter Info */}
        <View style={styles.inviterRow}>
          <View style={styles.inviterAvatar}>
            <Icon name="account" size={16} color={colors.text.inverse} />
          </View>
          <Text style={styles.inviterText}>
            Invited by {inviter.firstName}
            {inviter.lastName ? ` ${inviter.lastName.charAt(0)}.` : ''}
          </Text>
        </View>

        {/* Rent and Expiration */}
        <View style={styles.cardFooter}>
          <View style={styles.rentBadge}>
            <Icon name="currency-usd" size={14} color={colors.primary} />
            <Text style={styles.rentText}>
              {formatCurrency(invitation.proposedRentShare)}/mo
            </Text>
          </View>
          <Text style={[styles.expirationText, { color: expirationColor }]}>
            {expirationText}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// Main Screen Component
// ============================================================================

const PendingInvitesScreen: React.FC = () => {
  const navigation = useNavigation<PendingInvitesNavigationProp>();

  // State
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invitations
  const fetchInvitations = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      const response = await apiClient.get<GetInvitationsResponse>(
        '/api/households/invitations/received'
      );

      if (response.data.success) {
        setInvitations(response.data.invitations);
      } else {
        throw new Error('Failed to fetch invitations');
      }
    } catch (err: any) {
      console.error('[PendingInvitesScreen] Error fetching invitations:', err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to load invitations. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvitations(true);
  }, [fetchInvitations]);

  // Navigation handler
  const handleInvitationPress = useCallback(
    (invitationId: string) => {
      // Navigate to ViewInvitationScreen
      navigation.navigate('ViewInvitation', { invitationId });
    },
    [navigation]
  );

  // Back navigation handler
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Retry handler
  const handleRetry = useCallback(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Render loading skeleton
  const renderSkeletonList = () => (
    <View style={styles.listContent}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer} testID="empty-state">
      <Icon name="email-open-outline" size={64} color={colors.text.hint} />
      <Text style={styles.emptyTitle}>No pending invitations</Text>
      <Text style={styles.emptySubtitle}>
        When someone invites you to join their household, it will appear here.
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer} testID="error-state">
      <Icon name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        testID="retry-button"
      >
        <Icon name="refresh" size={20} color={colors.text.inverse} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Render invitation item
  const renderInvitationItem = ({ item }: { item: InvitationWithDetails }) => (
    <InvitationCard item={item} onPress={handleInvitationPress} />
  );

  // Key extractor
  const keyExtractor = (item: InvitationWithDetails) => item.invitation.id;

  return (
    <SafeAreaView style={styles.container} testID="pending-invites-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          testID="back-button"
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Invitations</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        renderSkeletonList()
      ) : error && invitations.length === 0 ? (
        renderErrorState()
      ) : (
        <FlatList
          data={invitations}
          renderItem={renderInvitationItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            invitations.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="invitations-list"
        />
      )}
    </SafeAreaView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32, // Same as back button for centering
  },

  // List
  listContent: {
    padding: spacing.md,
  },
  emptyListContent: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  householdName: {
    ...typography.h5,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },

  // Inviter
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  inviterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  inviterText: {
    ...typography.body2,
    color: colors.text.secondary,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rentText: {
    ...typography.subtitle2,
    color: colors.primaryDark,
    marginLeft: spacing.xxs,
  },
  expirationText: {
    ...typography.caption,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    ...typography.h5,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.text.inverse,
    marginLeft: spacing.xs,
    textTransform: 'none',
  },

  // Skeleton
  skeletonBox: {
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.sm,
  },
  skeletonHouseholdName: {
    width: '60%',
    height: 20,
  },
  skeletonLocation: {
    width: '40%',
    height: 16,
    marginBottom: spacing.md,
  },
  skeletonAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border.light,
    marginRight: spacing.sm,
  },
  skeletonInviterName: {
    width: '45%',
    height: 16,
  },
  skeletonRent: {
    width: 80,
    height: 24,
  },
  skeletonExpiry: {
    width: 100,
    height: 14,
  },
  chevronPlaceholder: {
    width: 24,
    height: 24,
  },
});

export default PendingInvitesScreen;
