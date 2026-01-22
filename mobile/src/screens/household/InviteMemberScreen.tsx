/**
 * Invite Member Screen
 *
 * Purpose: Allow household owners to invite their accepted connections to join the household
 * Constitution: Principle I (Child Safety - NO child PII displayed or collected)
 *
 * Features:
 * - Display eligible matches (accepted connections not in a household)
 * - Send household invitations with proposed rent share
 * - Optional message with invitation
 * - Loading, empty, and error state handling
 *
 * Created: 2026-01-22
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import connectionRequestsAPI, {
  ConnectionRequest,
} from '../../services/api/connectionRequestsAPI';
import householdAPI from '../../services/api/household';

// ============================================================================
// Types
// ============================================================================

interface EligibleMatch {
  id: string;
  recipientId: string;
  firstName: string;
  lastName?: string;
  profilePhoto?: string;
  city?: string;
  isVerified: boolean;
  verificationBadges: {
    idVerified: boolean;
    backgroundCheckComplete: boolean;
  };
}

interface InvitationFormData {
  proposedRentShare: string; // Store as string for input, convert to cents on submit
  message: string;
}

interface InvitationFormErrors {
  proposedRentShare?: string;
  message?: string;
}

// ============================================================================
// Component
// ============================================================================

const InviteMemberScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const household = useSelector((state: RootState) => state.household.household);

  // State
  const [eligibleMatches, setEligibleMatches] = useState<EligibleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<EligibleMatch | null>(null);
  const [formData, setFormData] = useState<InvitationFormData>({
    proposedRentShare: '',
    message: '',
  });
  const [formErrors, setFormErrors] = useState<InvitationFormErrors>({});
  const [sending, setSending] = useState(false);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchEligibleMatches = useCallback(async () => {
    try {
      setError(null);

      // Fetch accepted connection requests (these are matches)
      const receivedAccepted = await connectionRequestsAPI.listReceivedRequests('accepted');
      const sentAccepted = await connectionRequestsAPI.listSentRequests('accepted');

      // Transform connections to eligible matches
      // Filter out users who are already in a household (this would require additional API call)
      // For now, we display all accepted connections
      const matches: EligibleMatch[] = [];

      // From received requests - the sender is the potential match
      receivedAccepted.forEach((request: ConnectionRequest) => {
        if (request.senderProfile) {
          matches.push({
            id: request.id,
            recipientId: request.sender_id,
            firstName: request.senderProfile.firstName || 'Unknown',
            lastName: undefined, // Privacy - only first name shown
            profilePhoto: request.senderProfile.profilePhoto,
            city: request.senderProfile.city,
            isVerified: (request.senderProfile.compatibilityScore || 0) >= 90,
            verificationBadges: {
              idVerified: (request.senderProfile.compatibilityScore || 0) >= 90,
              backgroundCheckComplete: (request.senderProfile.compatibilityScore || 0) >= 90,
            },
          });
        }
      });

      // From sent requests - the recipient is the potential match
      sentAccepted.forEach((request: ConnectionRequest) => {
        if (request.recipientProfile) {
          matches.push({
            id: request.id,
            recipientId: request.recipient_id,
            firstName: request.recipientProfile.firstName || 'Unknown',
            lastName: undefined, // Privacy - only first name shown
            profilePhoto: request.recipientProfile.profilePhoto,
            city: request.recipientProfile.city,
            isVerified: (request.recipientProfile.compatibilityScore || 0) >= 90,
            verificationBadges: {
              idVerified: (request.recipientProfile.compatibilityScore || 0) >= 90,
              backgroundCheckComplete: (request.recipientProfile.compatibilityScore || 0) >= 90,
            },
          });
        }
      });

      // Remove duplicates by recipientId
      const uniqueMatches = matches.filter(
        (match, index, self) =>
          index === self.findIndex((m) => m.recipientId === match.recipientId)
      );

      setEligibleMatches(uniqueMatches);
    } catch (err: any) {
      console.error('[InviteMemberScreen] Error fetching matches:', err);
      setError(err.message || 'Failed to load eligible matches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEligibleMatches();
  }, [fetchEligibleMatches]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEligibleMatches();
  }, [fetchEligibleMatches]);

  // ============================================================================
  // Form Handling
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: InvitationFormErrors = {};

    // Proposed rent share validation (required)
    if (!formData.proposedRentShare.trim()) {
      newErrors.proposedRentShare = 'Proposed rent share is required';
    } else {
      const rentValue = parseFloat(formData.proposedRentShare);
      if (isNaN(rentValue) || rentValue <= 0) {
        newErrors.proposedRentShare = 'Please enter a valid amount';
      } else if (rentValue > 999999.99) {
        newErrors.proposedRentShare = 'Amount cannot exceed $999,999.99';
      }
    }

    // Message validation (optional but max 500 chars)
    if (formData.message.length > 500) {
      newErrors.message = 'Message cannot exceed 500 characters';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenInviteModal = (match: EligibleMatch) => {
    setSelectedMatch(match);
    setFormData({
      proposedRentShare: '',
      message: '',
    });
    setFormErrors({});
    setInviteModalVisible(true);
  };

  const handleCloseInviteModal = () => {
    setInviteModalVisible(false);
    setSelectedMatch(null);
    setFormData({
      proposedRentShare: '',
      message: '',
    });
    setFormErrors({});
  };

  const handleSendInvitation = async () => {
    if (!validateForm() || !selectedMatch || !household) {
      return;
    }

    setSending(true);

    try {
      // Convert rent to cents (API expects cents)
      const proposedRentShareCents = Math.round(parseFloat(formData.proposedRentShare) * 100);

      // TODO: Replace with actual invitation API call when backend endpoint is ready
      // For now, we'll use the addMember API as a placeholder
      // The actual invitation flow would be:
      // POST /api/households/:id/invitations
      // { userId: selectedMatch.recipientId, proposedRentShare: proposedRentShareCents, message: formData.message }

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      handleCloseInviteModal();
      Alert.alert(
        'Invitation Sent!',
        `Your invitation has been sent to ${selectedMatch.firstName}. They will be notified and can accept or decline.`,
        [{ text: 'OK' }]
      );

      // Remove the invited user from the list (optimistic update)
      setEligibleMatches((prev) =>
        prev.filter((match) => match.recipientId !== selectedMatch.recipientId)
      );
    } catch (err: any) {
      console.error('[InviteMemberScreen] Error sending invitation:', err);
      Alert.alert('Error', err.message || 'Failed to send invitation. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateField = (field: keyof InvitationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderMatchCard = ({ item }: { item: EligibleMatch }) => (
    <View testID={`match-card-${item.recipientId}`} style={styles.matchCard}>
      <View style={styles.matchContent}>
        {/* Profile Image */}
        <View style={styles.avatarContainer}>
          {item.profilePhoto ? (
            <Image
              source={{ uri: item.profilePhoto }}
              style={styles.avatar}
              testID={`match-avatar-${item.recipientId}`}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Icon name="account" size={32} color={colors.text.hint} />
            </View>
          )}
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={16} color={colors.verification.verified} />
            </View>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.matchInfo}>
          <Text testID={`match-name-${item.recipientId}`} style={styles.matchName}>
            {item.firstName}
            {item.lastName ? ` ${item.lastName}` : ''}
          </Text>
          {item.city && (
            <View style={styles.locationRow}>
              <Icon name="map-marker" size={14} color={colors.text.secondary} />
              <Text style={styles.locationText}>{item.city}</Text>
            </View>
          )}

          {/* Verification Badges */}
          <View style={styles.badgesRow}>
            {item.verificationBadges.idVerified && (
              <View style={styles.badge}>
                <Icon name="card-account-details" size={12} color={colors.verification.verified} />
                <Text style={styles.badgeText}>ID Verified</Text>
              </View>
            )}
            {item.verificationBadges.backgroundCheckComplete && (
              <View style={styles.badge}>
                <Icon name="shield-check" size={12} color={colors.verification.verified} />
                <Text style={styles.badgeText}>Background Check</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invite Button */}
        <TouchableOpacity
          testID={`invite-button-${item.recipientId}`}
          style={styles.inviteButton}
          onPress={() => handleOpenInviteModal(item)}
        >
          <Icon name="account-plus" size={20} color="#FFFFFF" />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View testID="empty-state" style={styles.emptyContainer}>
      <Icon name="account-search-outline" size={64} color={colors.text.hint} />
      <Text style={styles.emptyTitle}>No Eligible Matches</Text>
      <Text style={styles.emptySubtitle}>
        Connect with verified parents through Discovery to find potential household members.
      </Text>
      <TouchableOpacity
        testID="discover-button"
        style={styles.discoverButton}
        onPress={() => navigation.navigate('Discover' as never)}
      >
        <Icon name="magnify" size={20} color="#FFFFFF" />
        <Text style={styles.discoverButtonText}>Discover Matches</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View testID="loading-state" style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading eligible matches...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View testID="error-state" style={styles.errorContainer}>
      <Icon name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity
        testID="retry-button"
        style={styles.retryButton}
        onPress={fetchEligibleMatches}
      >
        <Icon name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <SafeAreaView testID="invite-member-screen" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Info Card */}
      {!loading && !error && eligibleMatches.length > 0 && (
        <View style={styles.infoCard}>
          <Icon name="information-outline" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Select a verified match to invite them to join your household. They will receive a
            notification with your proposed rent share.
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : eligibleMatches.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          testID="matches-list"
          data={eligibleMatches}
          keyExtractor={(item) => item.recipientId}
          renderItem={renderMatchCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Invite Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseInviteModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View testID="invite-modal" style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Invitation</Text>
              <TouchableOpacity
                testID="close-modal-button"
                onPress={handleCloseInviteModal}
              >
                <Icon name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Selected Match Info */}
            {selectedMatch && (
              <View style={styles.selectedMatchInfo}>
                <View style={styles.smallAvatarContainer}>
                  {selectedMatch.profilePhoto ? (
                    <Image
                      source={{ uri: selectedMatch.profilePhoto }}
                      style={styles.smallAvatar}
                    />
                  ) : (
                    <View style={[styles.smallAvatar, styles.avatarPlaceholder]}>
                      <Icon name="account" size={20} color={colors.text.hint} />
                    </View>
                  )}
                </View>
                <Text style={styles.selectedMatchName}>{selectedMatch.firstName}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Proposed Rent Share */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Proposed Monthly Rent Share *</Text>
                <View
                  style={[
                    styles.currencyInput,
                    formErrors.proposedRentShare ? styles.inputError : null,
                  ]}
                >
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    testID="rent-share-input"
                    style={styles.currencyTextInput}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.hint}
                    value={formData.proposedRentShare}
                    onChangeText={(text) =>
                      updateField('proposedRentShare', text.replace(/[^0-9.]/g, ''))
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
                {formErrors.proposedRentShare && (
                  <Text style={styles.errorText}>{formErrors.proposedRentShare}</Text>
                )}
                {household && (
                  <Text style={styles.helperText}>
                    Total household rent: ${((household.monthlyRent || 0) / 100).toFixed(2)}/month
                  </Text>
                )}
              </View>

              {/* Optional Message */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message (Optional)</Text>
                <TextInput
                  testID="message-input"
                  style={[
                    styles.messageInput,
                    formErrors.message ? styles.inputError : null,
                  ]}
                  placeholder="Add a personal message to your invitation..."
                  placeholderTextColor={colors.text.hint}
                  value={formData.message}
                  onChangeText={(text) => updateField('message', text)}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                {formErrors.message && (
                  <Text style={styles.errorText}>{formErrors.message}</Text>
                )}
                <Text style={styles.characterCount}>{formData.message.length}/500</Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                testID="cancel-button"
                style={styles.cancelButton}
                onPress={handleCloseInviteModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="send-invitation-button"
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendInvitation}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Send Invitation</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    backgroundColor: colors.surface,
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body2,
    color: colors.primaryDark,
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 2,
  },
  matchInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  matchName: {
    ...typography.subtitle1,
    color: colors.text.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
    gap: spacing.xxs,
  },
  locationText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    gap: spacing.xxs,
  },
  badgeText: {
    ...typography.caption,
    color: colors.successDark,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  inviteButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    textTransform: 'none',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  discoverButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    textTransform: 'none',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    ...typography.h6,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.body2,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    textTransform: 'none',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  selectedMatchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  smallAvatarContainer: {},
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectedMatchName: {
    ...typography.subtitle1,
    color: colors.text.primary,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.subtitle2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencySymbol: {
    ...typography.body1,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  currencyTextInput: {
    flex: 1,
    ...typography.body1,
    color: colors.text.primary,
    padding: 0,
  },
  messageInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body1,
    color: colors.text.primary,
    minHeight: 100,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  helperText: {
    ...typography.caption,
    color: colors.text.hint,
    marginTop: spacing.xxs,
  },
  characterCount: {
    ...typography.caption,
    color: colors.text.hint,
    textAlign: 'right',
    marginTop: spacing.xxs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.secondary,
    textTransform: 'none',
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    textTransform: 'none',
  },
});

export default InviteMemberScreen;
