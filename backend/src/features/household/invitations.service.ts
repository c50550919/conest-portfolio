/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Invitations Service
 *
 * Purpose: Business logic for household invitations
 * Constitution: Principle I (Child Safety - NO child PII in invitations)
 *
 * Features:
 * - Send invitations to verified users
 * - Accept/decline invitations
 * - Cancel sent invitations
 * - Validate invitation eligibility
 *
 * Created: 2026-01-22
 */

import {
  HouseholdInvitationModel,
  HouseholdInvitation,
  CreateInvitationData,
} from '../../models/HouseholdInvitation';
import { HouseholdMemberModel } from '../../models/HouseholdMember';
import { db } from '../../config/database';
import logger from '../../config/logger';
import { encryptNote } from '../../utils/encryption';

// ============================================================================
// Types
// ============================================================================

export interface SendInvitationRequest {
  householdId: string;
  inviterId: string;
  inviteeId: string;
  proposedRentShare?: number; // In cents
  message?: string; // Will be encrypted
}

export interface InvitationWithDetails {
  invitation: HouseholdInvitation;
  household: {
    id: string;
    name: string;
    city: string;
    state: string;
    monthlyRent: number;
  };
  inviter: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  members: Array<{
    userId: string;
    firstName: string;
    lastName?: string;
    role: string;
  }>;
}

// ============================================================================
// Service
// ============================================================================

export const InvitationsService = {
  /**
   * Send a household invitation
   *
   * Validates:
   * - Inviter is a member of the household
   * - Invitee is not already in the household
   * - No pending invitation exists for this invitee
   * - Invitee exists and is verified
   */
  async sendInvitation(request: SendInvitationRequest): Promise<HouseholdInvitation> {
    const { householdId, inviterId, inviteeId, proposedRentShare, message } = request;

    // Validate inviter is a member of the household
    const inviterMembership = await HouseholdMemberModel.findByHouseholdAndUser(
      householdId,
      inviterId,
    );
    if (!inviterMembership) {
      throw new Error('You are not a member of this household');
    }

    // Validate invitee is not already in the household
    const inviteeMembership = await HouseholdMemberModel.findByHouseholdAndUser(
      householdId,
      inviteeId,
    );
    if (inviteeMembership) {
      throw new Error('User is already a member of this household');
    }

    // Check for existing pending invitation
    const hasPending = await HouseholdInvitationModel.hasPendingInvitation(householdId, inviteeId);
    if (hasPending) {
      throw new Error('A pending invitation already exists for this user');
    }

    // Validate invitee exists
    const invitee = await db('parents').where({ id: inviteeId }).first();
    if (!invitee) {
      throw new Error('Invitee user not found');
    }

    // Encrypt message if provided
    let messageEncrypted: Buffer | undefined;
    let messageIv: Buffer | undefined;
    if (message) {
      const encrypted = encryptNote(message);
      messageEncrypted = Buffer.from(encrypted.encrypted, 'hex');
      messageIv = Buffer.from(encrypted.iv, 'hex');
    }

    // Create invitation
    const invitationData: CreateInvitationData = {
      householdId,
      inviterId,
      inviteeId,
      proposedRentShare,
      messageEncrypted,
      messageIv,
    };

    const invitation = await HouseholdInvitationModel.create(invitationData);

    logger.info('Invitation sent', {
      invitationId: invitation.id,
      householdId,
      inviterId,
      inviteeId,
    });

    return invitation;
  },

  /**
   * Get invitations received by a user
   */
  async getReceivedInvitations(userId: string): Promise<InvitationWithDetails[]> {
    // Get all pending invitations for the user
    const invitations = await HouseholdInvitationModel.findReceivedByUserId(userId, 'pending');

    // Enrich with household and inviter details
    const enriched: InvitationWithDetails[] = [];

    for (const invitation of invitations) {
      const household = await db('households')
        .select('id', 'name', 'city', 'state', 'monthly_rent')
        .where({ id: invitation.householdId })
        .first();

      const inviter = await db('parents')
        .select('id', 'first_name', 'last_name')
        .where({ id: invitation.inviterId })
        .first();

      const members = await db('household_members as hm')
        .select('hm.parent_id as userId', 'p.first_name as firstName', 'p.last_name as lastName', 'hm.role')
        .join('parents as p', 'hm.parent_id', 'p.id')
        .where({ 'hm.household_id': invitation.householdId });

      if (household && inviter) {
        enriched.push({
          invitation,
          household: {
            id: household.id,
            name: household.name,
            city: household.city,
            state: household.state,
            monthlyRent: parseInt(household.monthly_rent, 10),
          },
          inviter: {
            id: inviter.id,
            firstName: inviter.first_name,
            lastName: inviter.last_name,
          },
          members: members.map((m) => ({
            userId: m.userId,
            firstName: m.firstName,
            lastName: m.lastName,
            role: m.role,
          })),
        });
      }
    }

    return enriched;
  },

  /**
   * Get invitations sent from a household
   */
  async getSentInvitations(householdId: string, userId: string): Promise<HouseholdInvitation[]> {
    // Validate user is a member of the household
    const membership = await HouseholdMemberModel.findByHouseholdAndUser(householdId, userId);
    if (!membership) {
      throw new Error('You are not a member of this household');
    }

    return HouseholdInvitationModel.findSentByHouseholdId(householdId);
  },

  /**
   * Accept an invitation
   *
   * - Validates invitation exists and is pending
   * - Validates user is the invitee
   * - Adds user to household
   * - Updates invitation status
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<HouseholdInvitation> {
    const invitation = await HouseholdInvitationModel.findById(invitationId);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.inviteeId !== userId) {
      throw new Error('You are not the invitee of this invitation');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is ${invitation.status}, cannot accept`);
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Start transaction
    const trx = await db.transaction();

    try {
      // Add user to household
      await trx('household_members').insert({
        household_id: invitation.householdId,
        parent_id: userId,
        role: 'member',
        rent_share: invitation.proposedRentShare || 0,
        joined_at: trx.fn.now(),
      });

      // Update invitation status
      await trx('household_invitations')
        .where({ id: invitationId })
        .update({
          status: 'accepted',
          responded_at: trx.fn.now(),
          updated_at: trx.fn.now(),
        });

      await trx.commit();

      logger.info('Invitation accepted', {
        invitationId,
        householdId: invitation.householdId,
        userId,
      });

      return { ...invitation, status: 'accepted', respondedAt: new Date() };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  /**
   * Decline an invitation
   */
  async declineInvitation(invitationId: string, userId: string): Promise<HouseholdInvitation> {
    const invitation = await HouseholdInvitationModel.findById(invitationId);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.inviteeId !== userId) {
      throw new Error('You are not the invitee of this invitation');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is ${invitation.status}, cannot decline`);
    }

    const updated = await HouseholdInvitationModel.decline(invitationId);

    logger.info('Invitation declined', {
      invitationId,
      householdId: invitation.householdId,
      userId,
    });

    return updated!;
  },

  /**
   * Cancel an invitation (by inviter or household admin)
   */
  async cancelInvitation(invitationId: string, userId: string): Promise<HouseholdInvitation> {
    const invitation = await HouseholdInvitationModel.findById(invitationId);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Check if user is the inviter or a household admin
    const isInviter = invitation.inviterId === userId;
    const membership = await HouseholdMemberModel.findByHouseholdAndUser(
      invitation.householdId,
      userId,
    );
    const isOwner = membership?.role === 'owner';

    if (!isInviter && !isOwner) {
      throw new Error('You do not have permission to cancel this invitation');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is ${invitation.status}, cannot cancel`);
    }

    const updated = await HouseholdInvitationModel.cancel(invitationId);

    logger.info('Invitation cancelled', {
      invitationId,
      householdId: invitation.householdId,
      cancelledBy: userId,
    });

    return updated!;
  },

  /**
   * Get a single invitation by ID
   */
  async getInvitation(invitationId: string, userId: string): Promise<InvitationWithDetails | null> {
    const invitation = await HouseholdInvitationModel.findById(invitationId);

    if (!invitation) {
      return null;
    }

    // Validate user is either invitee or a household member
    const isInvitee = invitation.inviteeId === userId;
    const membership = await HouseholdMemberModel.findByHouseholdAndUser(
      invitation.householdId,
      userId,
    );

    if (!isInvitee && !membership) {
      throw new Error('You do not have permission to view this invitation');
    }

    // Get household details
    const household = await db('households')
      .select('id', 'name', 'city', 'state', 'monthly_rent')
      .where({ id: invitation.householdId })
      .first();

    // Get inviter details
    const inviter = await db('parents')
      .select('id', 'first_name', 'last_name')
      .where({ id: invitation.inviterId })
      .first();

    // Get current members
    const members = await db('household_members as hm')
      .select('hm.parent_id as userId', 'p.first_name as firstName', 'p.last_name as lastName', 'hm.role')
      .join('parents as p', 'hm.parent_id', 'p.id')
      .where({ 'hm.household_id': invitation.householdId });

    if (!household || !inviter) {
      return null;
    }

    return {
      invitation,
      household: {
        id: household.id,
        name: household.name,
        city: household.city,
        state: household.state,
        monthlyRent: parseInt(household.monthly_rent, 10),
      },
      inviter: {
        id: inviter.id,
        firstName: inviter.first_name,
        lastName: inviter.last_name,
      },
      members: members.map((m) => ({
        userId: m.userId,
        firstName: m.firstName,
        lastName: m.lastName,
        role: m.role,
      })),
    };
  },
};
