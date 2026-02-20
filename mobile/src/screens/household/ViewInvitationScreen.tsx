/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * View Invitation Screen
 *
 * Purpose: Display household invitation details and allow accept/decline actions
 * Constitution: Principle I (Child Safety - NO child PII displayed)
 *
 * Features:
 * - Display invitation details (household, inviter, rent share)
 * - Accept/decline actions with confirmation
 * - Expired invitation handling
 * - Loading states during API calls
 *
 * Created: 2026-01-22
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';
import apiClient from '../../config/api';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Invitation member info (NO child PII - Constitution Principle I)
 */
interface InvitationMember {
  userId: string;
  firstName: string;
  lastName?: string;
  role: 'lease-holder' | 'co-tenant' | 'subletter';
  isVerified: boolean;
}

/**
 * Household invitation details
 */
interface HouseholdInvitation {
  id: string;
  householdId: string;
  householdName: string;
  location: {
    city: string;
    state: string;
  };
  monthlyRent: number;
  proposedRentShare: number;
  members: InvitationMember[];
  invitedBy: {
    userId: string;
    firstName: string;
    lastName?: string;
    isVerified: boolean;
  };
  message?: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

/**
 * Navigation param list for household stack
 */
type HouseholdStackParamList = {
  HouseholdMain: undefined;
  ViewInvitation: { invitationId: string };
  Documents: undefined;
  CreateHousehold: undefined;
};

type ViewInvitationRouteProp = RouteProp<HouseholdStackParamList, 'ViewInvitation'>;
type ViewInvitationNavigationProp = StackNavigationProp<HouseholdStackParamList>;

// ============================================================================
// Component
// ============================================================================

const ViewInvitationScreen: React.FC = () => {
  const navigation = useNavigation<ViewInvitationNavigationProp>();
  const route = useRoute<ViewInvitationRouteProp>();
  const { invitationId } = route.params;

  // State
  const [invitation, setInvitation] = useState<HouseholdInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    action: 'accept' | 'decline' | null;
  }>({ visible: false, action: null });

  // Fetch invitation details
  const fetchInvitation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{ invitation: HouseholdInvitation }>(
        `/api/households/invitations/${invitationId}`
      );
      setInvitation(response.data.invitation);
    } catch (err: any) {
      console.error('[ViewInvitationScreen] Failed to fetch invitation:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to load invitation details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    fetchInvitation();
  }, [fetchInvitation]);

  // Check if invitation is expired
  const isExpired = useCallback((): boolean => {
    if (!invitation) return false;
    if (invitation.status === 'expired') return true;
    return new Date(invitation.expiresAt) < new Date();
  }, [invitation]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get initials for avatar
  const getInitials = (firstName: string, lastName?: string): string => {
    if (lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return firstName.substring(0, 2).toUpperCase();
  };

  // Handle accept invitation
  const handleAccept = async () => {
    if (!invitation || isExpired()) return;

    try {
      setActionLoading(true);
      await apiClient.patch(`/api/households/invitations/${invitationId}/accept`);
      setConfirmModal({ visible: false, action: null });

      Alert.alert(
        'Welcome to the Household!',
        `You are now a member of "${invitation.householdName}".`,
        [
          {
            text: 'View Household',
            onPress: () => navigation.navigate('HouseholdMain'),
          },
        ]
      );
    } catch (err: any) {
      console.error('[ViewInvitationScreen] Failed to accept invitation:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to accept invitation';
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle decline invitation
  const handleDecline = async () => {
    if (!invitation) return;

    try {
      setActionLoading(true);
      await apiClient.patch(`/api/households/invitations/${invitationId}/decline`);
      setConfirmModal({ visible: false, action: null });

      Alert.alert('Invitation Declined', 'You have declined this household invitation.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('[ViewInvitationScreen] Failed to decline invitation:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to decline invitation';
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // Show confirmation modal
  const showConfirmation = (action: 'accept' | 'decline') => {
    setConfirmModal({ visible: true, action });
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} testID="view-invitation-screen">
        <View style={styles.header}>
          <TouchableOpacity
            testID="back-button"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invitation Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer} testID="invitation-loading">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !invitation) {
    return (
      <SafeAreaView style={styles.container} testID="view-invitation-screen">
        <View style={styles.header}>
          <TouchableOpacity
            testID="back-button"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invitation Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerContainer} testID="invitation-error">
          <Icon name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Invitation</Text>
          <Text style={styles.errorSubtitle}>{error || 'Invitation not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchInvitation}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Check if expired
  const expired = isExpired();

  return (
    <SafeAreaView style={styles.container} testID="view-invitation-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitation Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="invitation-scroll-view"
      >
        {/* Expired Banner */}
        {expired && (
          <View style={styles.expiredBanner} testID="expired-banner">
            <Icon name="clock-alert-outline" size={20} color={colors.error} />
            <Text style={styles.expiredText}>This invitation has expired</Text>
          </View>
        )}

        {/* Household Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.householdCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          testID="household-card"
        >
          <View style={styles.householdHeader}>
            <Icon name="home-city" size={32} color="#FFFFFF" />
            <View style={styles.householdInfo}>
              <Text style={styles.householdName} testID="household-name">
                {invitation.householdName}
              </Text>
              <Text style={styles.householdLocation} testID="household-location">
                {invitation.location.city}, {invitation.location.state}
              </Text>
            </View>
          </View>
          <View style={styles.householdStats}>
            <View style={styles.householdStat}>
              <Text style={styles.statLabel}>Monthly Rent</Text>
              <Text style={styles.statValue} testID="monthly-rent">
                {formatCurrency(invitation.monthlyRent)}
              </Text>
            </View>
            <View style={styles.householdStatDivider} />
            <View style={styles.householdStat}>
              <Text style={styles.statLabel}>Your Share</Text>
              <Text style={styles.statValue} testID="rent-share">
                {formatCurrency(invitation.proposedRentShare)}
              </Text>
            </View>
            <View style={styles.householdStatDivider} />
            <View style={styles.householdStat}>
              <Text style={styles.statLabel}>Members</Text>
              <Text style={styles.statValue} testID="member-count">
                {invitation.members.length}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Invited By Section */}
        <View style={styles.section} testID="invited-by-section">
          <Text style={styles.sectionTitle}>Invited By</Text>
          <View style={styles.inviterCard}>
            <View style={styles.inviterAvatar}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(invitation.invitedBy.firstName, invitation.invitedBy.lastName)}
                </Text>
              </View>
              {invitation.invitedBy.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Icon name="check-decagram" size={16} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.inviterInfo}>
              <Text style={styles.inviterName} testID="inviter-name">
                {invitation.invitedBy.firstName}
                {invitation.invitedBy.lastName ? ` ${invitation.invitedBy.lastName}` : ''}
              </Text>
              {invitation.invitedBy.isVerified && (
                <View style={styles.verifiedTag}>
                  <Icon name="shield-check" size={14} color={colors.primary} />
                  <Text style={styles.verifiedTagText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Message Section (if present) */}
        {invitation.message && (
          <View style={styles.section} testID="message-section">
            <Text style={styles.sectionTitle}>Message from Inviter</Text>
            <View style={styles.messageCard}>
              <Icon name="format-quote-open" size={20} color={colors.text.hint} />
              <Text style={styles.messageText} testID="invitation-message">
                {invitation.message}
              </Text>
            </View>
          </View>
        )}

        {/* Current Members Section */}
        <View style={styles.section} testID="members-section">
          <Text style={styles.sectionTitle}>Current Household Members</Text>
          {invitation.members.map((member, index) => (
            <View
              key={member.userId}
              style={styles.memberCard}
              testID={`member-card-${member.userId}`}
            >
              <View style={styles.memberAvatar}>
                <View
                  style={[
                    styles.memberAvatarPlaceholder,
                    {
                      backgroundColor:
                        index % 3 === 0
                          ? colors.primary + '30'
                          : index % 3 === 1
                            ? colors.secondary + '30'
                            : colors.tertiary + '30',
                    },
                  ]}
                >
                  <Text style={styles.memberAvatarText}>
                    {getInitials(member.firstName, member.lastName)}
                  </Text>
                </View>
                {member.isVerified && (
                  <View style={styles.memberVerifiedBadge}>
                    <Icon name="check-decagram" size={12} color={colors.primary} />
                  </View>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.firstName}
                  {member.lastName ? ` ${member.lastName}` : ''}
                </Text>
                <Text style={styles.memberRole}>
                  {member.role === 'lease-holder'
                    ? 'Lease Holder'
                    : member.role === 'co-tenant'
                      ? 'Co-tenant'
                      : 'Subletter'}
                </Text>
              </View>
              {member.isVerified && (
                <View style={styles.memberVerifiedTag}>
                  <Icon name="shield-check" size={12} color={colors.primary} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Expiration Info */}
        <View style={styles.section} testID="expiration-section">
          <View style={styles.expirationCard}>
            <Icon
              name={expired ? 'clock-alert-outline' : 'clock-outline'}
              size={20}
              color={expired ? colors.error : colors.text.secondary}
            />
            <Text style={[styles.expirationText, expired && styles.expirationTextExpired]}>
              {expired
                ? `Expired on ${formatDate(invitation.expiresAt)}`
                : `Expires on ${formatDate(invitation.expiresAt)}`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {!expired && invitation.status === 'pending' && (
        <View style={styles.actionContainer} testID="action-buttons">
          <TouchableOpacity
            style={styles.declineButton}
            onPress={() => showConfirmation('decline')}
            disabled={actionLoading}
            testID="decline-button"
          >
            <Icon name="close" size={20} color={colors.error} />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => showConfirmation('accept')}
            disabled={actionLoading}
            testID="accept-button"
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ visible: false, action: null })}
        testID="confirmation-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="modal-content">
            <View
              style={[
                styles.modalIconContainer,
                {
                  backgroundColor:
                    confirmModal.action === 'accept' ? colors.success + '20' : colors.error + '20',
                },
              ]}
            >
              <Icon
                name={confirmModal.action === 'accept' ? 'home-plus' : 'home-remove'}
                size={32}
                color={confirmModal.action === 'accept' ? colors.success : colors.error}
              />
            </View>
            <Text style={styles.modalTitle}>
              {confirmModal.action === 'accept'
                ? 'Accept Invitation?'
                : 'Decline Invitation?'}
            </Text>
            <Text style={styles.modalMessage}>
              {confirmModal.action === 'accept'
                ? `You will become a member of "${invitation?.householdName}" with a monthly rent share of ${formatCurrency(invitation?.proposedRentShare || 0)}.`
                : `Are you sure you want to decline the invitation to join "${invitation?.householdName}"? This action cannot be undone.`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setConfirmModal({ visible: false, action: null })}
                disabled={actionLoading}
                testID="modal-cancel-button"
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  {
                    backgroundColor:
                      confirmModal.action === 'accept' ? colors.success : colors.error,
                  },
                ]}
                onPress={confirmModal.action === 'accept' ? handleAccept : handleDecline}
                disabled={actionLoading}
                testID="modal-confirm-button"
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {confirmModal.action === 'accept' ? 'Accept' : 'Decline'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h6,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centerContainer: {
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
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },

  // Expired Banner
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  expiredText: {
    ...typography.body2,
    color: colors.error,
    fontWeight: '600',
  },

  // Household Card
  householdCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  householdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  householdInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  householdName: {
    ...typography.h5,
    color: '#FFFFFF',
    marginBottom: spacing.xxs,
  },
  householdLocation: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  householdStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  householdStat: {
    flex: 1,
    alignItems: 'center',
  },
  householdStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xxs,
  },
  statValue: {
    ...typography.subtitle1,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // Inviter Card
  inviterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inviterAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.subtitle1,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  inviterInfo: {
    flex: 1,
  },
  inviterName: {
    ...typography.subtitle1,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  verifiedTagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // Message Card
  messageCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  messageText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
    fontStyle: 'italic',
  },

  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  memberAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  memberAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  memberVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.full,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  memberRole: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  memberVerifiedTag: {
    padding: spacing.xs,
  },

  // Expiration Card
  expirationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  expirationText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  expirationTextExpired: {
    color: colors.error,
  },

  // Action Buttons
  actionContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.surface,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    gap: spacing.xs,
  },
  declineButtonText: {
    ...typography.button,
    color: colors.error,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    gap: spacing.xs,
  },
  acceptButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.medium,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});

export default ViewInvitationScreen;
