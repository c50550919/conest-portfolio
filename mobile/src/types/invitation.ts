/**
 * Invitation Type Definitions
 *
 * Purpose: Types for household invitation management
 * Constitution: Principle I (Child Safety - NO child PII in invitations)
 *
 * Features:
 * - Invitation status tracking
 * - Household and inviter details
 * - Member preview information
 *
 * Created: 2026-01-22
 */

// ============================================================================
// Core Invitation Types
// ============================================================================

/**
 * Invitation status states
 */
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

/**
 * Base invitation entity
 */
export interface Invitation {
  id: string;
  householdId: string;
  inviterId: string;
  inviteeId: string;
  status: InvitationStatus;
  proposedRentShare: number | null;
  message?: string;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Extended Invitation Types
// ============================================================================

/**
 * Household summary for invitation display
 * (NO child PII - only household-level data)
 */
export interface InvitationHouseholdSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  monthlyRent: number;
}

/**
 * Inviter basic info for invitation display
 * (NO child PII - only parent profile data)
 */
export interface InvitationInviterInfo {
  id: string;
  firstName: string;
  lastName?: string;
}

/**
 * Household member preview for invitation
 * (NO child PII - only parent profile data)
 */
export interface InvitationMemberPreview {
  userId: string;
  firstName: string;
  lastName?: string;
  role: string;
}

/**
 * Full invitation with related details for display
 * Used when viewing received invitations
 */
export interface InvitationWithDetails {
  invitation: Invitation;
  household: InvitationHouseholdSummary;
  inviter: InvitationInviterInfo;
  members: InvitationMemberPreview[];
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to send an invitation
 */
export interface SendInvitationRequest {
  inviteeId: string;
  proposedRentShare?: number;
  message?: string;
}

/**
 * Response from sending an invitation
 */
export interface SendInvitationResponse {
  success: boolean;
  invitation: Invitation;
  message?: string;
}

/**
 * Response from accepting/declining/cancelling an invitation
 */
export interface InvitationActionResponse {
  success: boolean;
  invitation: Invitation;
  message?: string;
}

// ============================================================================
// State Types
// ============================================================================

/**
 * Invitation-related state for Redux store
 */
export interface InvitationState {
  pendingInvitations: InvitationWithDetails[];
  sentInvitations: Invitation[];
  invitationsLoading: boolean;
  invitationsError: string | null;
}
