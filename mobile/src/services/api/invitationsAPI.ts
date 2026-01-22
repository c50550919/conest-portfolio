/**
 * Invitations API Service
 *
 * Purpose: API client for household invitation management
 * Constitution: Principle I (Child Safety - NO child PII in requests/responses)
 * Constitution: Principle IV (Performance - <200ms API calls P95)
 *
 * Endpoints:
 * - GET /api/households/invitations/received - Get received invitations
 * - GET /api/households/:id/invitations/sent - Get sent invitations
 * - GET /api/households/invitations/:inviteId - Get single invitation
 * - POST /api/households/:id/invitations - Send invitation
 * - PATCH /api/households/invitations/:inviteId/accept - Accept invitation
 * - PATCH /api/households/invitations/:inviteId/decline - Decline invitation
 * - DELETE /api/households/invitations/:inviteId - Cancel invitation
 *
 * Created: 2026-01-22
 */

import apiClient from '../../config/api';
import {
  Invitation,
  InvitationWithDetails,
  SendInvitationRequest,
  SendInvitationResponse,
  InvitationActionResponse,
} from '../../types/invitation';

/**
 * Invitations API Client
 * Handles all invitation-related API interactions
 */
class InvitationsAPI {
  /**
   * Get all received invitations for the current user
   * Returns invitations with household and inviter details
   * @returns List of received invitations with details
   */
  async getReceivedInvitations(): Promise<InvitationWithDetails[]> {
    console.log('[InvitationsAPI] getReceivedInvitations called');
    try {
      const response = await apiClient.get<{ invitations: InvitationWithDetails[] }>(
        '/api/households/invitations/received'
      );
      console.log(
        '[InvitationsAPI] getReceivedInvitations response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data.invitations;
    } catch (error: any) {
      console.error('[InvitationsAPI] getReceivedInvitations error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }

  /**
   * Get all sent invitations for a household
   * @param householdId - UUID of the household
   * @returns List of sent invitations
   */
  async getSentInvitations(householdId: string): Promise<Invitation[]> {
    console.log('[InvitationsAPI] getSentInvitations called for household:', householdId);
    try {
      const response = await apiClient.get<{ invitations: Invitation[] }>(
        `/api/households/${householdId}/invitations/sent`
      );
      console.log(
        '[InvitationsAPI] getSentInvitations response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data.invitations;
    } catch (error: any) {
      console.error('[InvitationsAPI] getSentInvitations error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }

  /**
   * Get a single invitation by ID
   * @param inviteId - UUID of the invitation
   * @returns Invitation with full details
   */
  async getInvitation(inviteId: string): Promise<InvitationWithDetails> {
    console.log('[InvitationsAPI] getInvitation called for:', inviteId);
    try {
      const response = await apiClient.get<InvitationWithDetails>(`/api/households/invitations/${inviteId}`);
      console.log(
        '[InvitationsAPI] getInvitation response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error: any) {
      console.error('[InvitationsAPI] getInvitation error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }

  /**
   * Send an invitation to join a household
   * @param householdId - UUID of the household
   * @param data - Invitation data (inviteeId, optional rent share, optional message)
   * @returns Created invitation
   */
  async sendInvitation(householdId: string, data: SendInvitationRequest): Promise<Invitation> {
    console.log('[InvitationsAPI] sendInvitation called:', { householdId, data });
    try {
      const response = await apiClient.post<SendInvitationResponse>(
        `/api/households/${householdId}/invitations`,
        data
      );
      console.log(
        '[InvitationsAPI] sendInvitation response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data.invitation;
    } catch (error: any) {
      console.error('[InvitationsAPI] sendInvitation error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }

  /**
   * Accept an invitation to join a household
   * @param inviteId - UUID of the invitation
   * @returns Updated invitation with accepted status
   */
  async acceptInvitation(inviteId: string): Promise<Invitation> {
    console.log('[InvitationsAPI] acceptInvitation called for:', inviteId);
    try {
      const response = await apiClient.patch<InvitationActionResponse>(
        `/api/households/invitations/${inviteId}/accept`
      );
      console.log(
        '[InvitationsAPI] acceptInvitation response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data.invitation;
    } catch (error: any) {
      console.error('[InvitationsAPI] acceptInvitation error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }

  /**
   * Decline an invitation
   * @param inviteId - UUID of the invitation
   * @returns Updated invitation with declined status
   */
  async declineInvitation(inviteId: string): Promise<Invitation> {
    console.log('[InvitationsAPI] declineInvitation called for:', inviteId);
    try {
      const response = await apiClient.patch<InvitationActionResponse>(
        `/api/households/invitations/${inviteId}/decline`
      );
      console.log(
        '[InvitationsAPI] declineInvitation response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data.invitation;
    } catch (error: any) {
      console.error('[InvitationsAPI] declineInvitation error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }

  /**
   * Cancel a sent invitation
   * @param inviteId - UUID of the invitation
   * @returns Updated invitation with cancelled status
   */
  async cancelInvitation(inviteId: string): Promise<Invitation> {
    console.log('[InvitationsAPI] cancelInvitation called for:', inviteId);
    try {
      const response = await apiClient.delete<InvitationActionResponse>(
        `/api/households/invitations/${inviteId}`
      );
      console.log(
        '[InvitationsAPI] cancelInvitation response:',
        JSON.stringify(response.data, null, 2)
      );
      return response.data.invitation;
    } catch (error: any) {
      console.error('[InvitationsAPI] cancelInvitation error:', error.message);
      console.error(
        '[InvitationsAPI] Error response:',
        JSON.stringify(error.response?.data, null, 2)
      );
      throw error;
    }
  }
}

export default new InvitationsAPI();
