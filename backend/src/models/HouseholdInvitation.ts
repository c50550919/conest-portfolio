/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Invitation Model
 *
 * Purpose: Database operations for household invitations
 * Constitution: Principle I (Child Safety - NO child PII in invitations)
 *
 * Operations:
 * - Create invitation
 * - Get invitation by ID
 * - Get received invitations for user
 * - Get sent invitations for household
 * - Update invitation status (accept/decline/cancel)
 * - Expire old invitations
 *
 * Created: 2026-01-22
 */

import { db } from '../config/database';
import logger from '../config/logger';

// ============================================================================
// Types
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

export interface HouseholdInvitation {
  id: string;
  householdId: string;
  inviterId: string;
  inviteeId: string;
  status: InvitationStatus;
  proposedRentShare: number | null; // In cents
  messageEncrypted: Buffer | null;
  messageIv: Buffer | null;
  expiresAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HouseholdInvitationDB {
  id: string;
  household_id: string;
  inviter_id: string;
  invitee_id: string;
  status: InvitationStatus;
  proposed_rent_share: string | null; // bigint as string
  message_encrypted: Buffer | null;
  message_iv: Buffer | null;
  expires_at: Date;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInvitationData {
  householdId: string;
  inviterId: string;
  inviteeId: string;
  proposedRentShare?: number; // In cents
  messageEncrypted?: Buffer;
  messageIv?: Buffer;
  expiresAt?: Date;
}

// ============================================================================
// Transformers
// ============================================================================

function dbToModel(row: HouseholdInvitationDB): HouseholdInvitation {
  return {
    id: row.id,
    householdId: row.household_id,
    inviterId: row.inviter_id,
    inviteeId: row.invitee_id,
    status: row.status,
    proposedRentShare: row.proposed_rent_share ? parseInt(row.proposed_rent_share, 10) : null,
    messageEncrypted: row.message_encrypted,
    messageIv: row.message_iv,
    expiresAt: row.expires_at,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Model
// ============================================================================

export const HouseholdInvitationModel = {
  /**
   * Create a new invitation
   */
  async create(data: CreateInvitationData): Promise<HouseholdInvitation> {
    const [row] = await db('household_invitations')
      .insert({
        household_id: data.householdId,
        inviter_id: data.inviterId,
        invitee_id: data.inviteeId,
        proposed_rent_share: data.proposedRentShare,
        message_encrypted: data.messageEncrypted,
        message_iv: data.messageIv,
        expires_at: data.expiresAt || db.raw("NOW() + INTERVAL '7 days'"),
      })
      .returning('*');

    logger.info('Invitation created', {
      invitationId: row.id,
      householdId: data.householdId,
      inviterId: data.inviterId,
      inviteeId: data.inviteeId,
    });

    return dbToModel(row);
  },

  /**
   * Get invitation by ID
   */
  async findById(id: string): Promise<HouseholdInvitation | null> {
    const row = await db('household_invitations').where({ id }).first();
    return row ? dbToModel(row) : null;
  },

  /**
   * Get all pending invitations received by a user
   */
  async findReceivedByUserId(
    userId: string,
    status: InvitationStatus = 'pending',
  ): Promise<HouseholdInvitation[]> {
    const rows = await db('household_invitations')
      .where({ invitee_id: userId, status })
      .where('expires_at', '>', db.fn.now())
      .orderBy('created_at', 'desc');

    return rows.map(dbToModel);
  },

  /**
   * Get all invitations sent from a household
   */
  async findSentByHouseholdId(
    householdId: string,
    status?: InvitationStatus,
  ): Promise<HouseholdInvitation[]> {
    let query = db('household_invitations').where({ household_id: householdId });

    if (status) {
      query = query.where({ status });
    }

    const rows = await query.orderBy('created_at', 'desc');
    return rows.map(dbToModel);
  },

  /**
   * Check if a pending invitation exists for this household+invitee
   */
  async hasPendingInvitation(householdId: string, inviteeId: string): Promise<boolean> {
    const row = await db('household_invitations')
      .where({
        household_id: householdId,
        invitee_id: inviteeId,
        status: 'pending',
      })
      .where('expires_at', '>', db.fn.now())
      .first();

    return !!row;
  },

  /**
   * Update invitation status
   */
  async updateStatus(
    id: string,
    status: InvitationStatus,
    respondedAt?: Date,
  ): Promise<HouseholdInvitation | null> {
    const [row] = await db('household_invitations')
      .where({ id })
      .update({
        status,
        responded_at: respondedAt || (status !== 'pending' ? db.fn.now() : null),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (row) {
      logger.info('Invitation status updated', {
        invitationId: id,
        newStatus: status,
      });
    }

    return row ? dbToModel(row) : null;
  },

  /**
   * Accept an invitation
   */
  async accept(id: string): Promise<HouseholdInvitation | null> {
    return this.updateStatus(id, 'accepted', new Date());
  },

  /**
   * Decline an invitation
   */
  async decline(id: string): Promise<HouseholdInvitation | null> {
    return this.updateStatus(id, 'declined', new Date());
  },

  /**
   * Cancel an invitation (by inviter)
   */
  async cancel(id: string): Promise<HouseholdInvitation | null> {
    return this.updateStatus(id, 'cancelled');
  },

  /**
   * Expire old invitations (called by cron job or on-demand)
   */
  async expireOldInvitations(): Promise<number> {
    const result = await db('household_invitations')
      .where({ status: 'pending' })
      .where('expires_at', '<=', db.fn.now())
      .update({
        status: 'expired',
        updated_at: db.fn.now(),
      });

    if (result > 0) {
      logger.info('Expired old invitations', { count: result });
    }

    return result;
  },

  /**
   * Delete an invitation (for cleanup)
   */
  async delete(id: string): Promise<boolean> {
    const result = await db('household_invitations').where({ id }).delete();
    return result > 0;
  },

  /**
   * Get invitation with household and user details
   * For display purposes
   */
  async findByIdWithDetails(id: string): Promise<{
    invitation: HouseholdInvitation;
    household: { id: string; name: string; city: string; state: string };
    inviter: { id: string; firstName: string; lastName: string };
  } | null> {
    const row = await db('household_invitations as i')
      .select(
        'i.*',
        'h.id as household_id',
        'h.name as household_name',
        'h.city as household_city',
        'h.state as household_state',
        'p.id as inviter_id',
        'p.first_name as inviter_first_name',
        'p.last_name as inviter_last_name',
      )
      .join('households as h', 'i.household_id', 'h.id')
      .join('parents as p', 'i.inviter_id', 'p.id')
      .where('i.id', id)
      .first();

    if (!row) {
      return null;
    }

    return {
      invitation: dbToModel(row),
      household: {
        id: row.household_id,
        name: row.household_name,
        city: row.household_city,
        state: row.household_state,
      },
      inviter: {
        id: row.inviter_id,
        firstName: row.inviter_first_name,
        lastName: row.inviter_last_name,
      },
    };
  },
};
