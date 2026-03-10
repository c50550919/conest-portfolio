/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { db } from '../config/database';
import { ParentModel } from './Parent';

/**
 * HouseholdMember Model
 *
 * Constitution Principle I: Child Safety
 * - NO child PII in member records
 * - Only parent profile data exposed
 *
 * Security:
 * - Role-based access (owner vs. co-tenant)
 * - Rent share transparency
 *
 * IMPORTANT: This model uses parent_id (references parents table),
 * NOT user_id. Most methods accept userId for convenience and
 * internally look up the corresponding parent_id.
 */

export interface HouseholdMember {
  id: string;
  household_id: string;
  parent_id: string;
  role: 'owner' | 'co-tenant' | 'pending';
  rent_share: number; // Amount in dollars (numeric)
  move_in_date?: Date;
  move_out_date?: Date;
  security_deposit_paid?: number;
  lease_signed: boolean;
  created_at: Date;
}

export interface CreateHouseholdMemberData {
  household_id: string;
  parent_id: string;
  role?: 'owner' | 'co-tenant' | 'pending';
  rent_share: number;
  move_in_date?: Date;
}

/**
 * Helper to get parent_id from user_id
 * Most external callers pass userId, but the database uses parent_id
 */
async function getParentIdFromUserId(userId: string): Promise<string | null> {
  const parent = await ParentModel.findByUserId(userId);
  return parent?.id || null;
}

export const HouseholdMemberModel = {
  /**
   * Create a new household member
   * Note: Expects parent_id directly (not user_id)
   */
  async create(data: CreateHouseholdMemberData): Promise<HouseholdMember> {
    const [member] = await db('household_members')
      .insert({
        household_id: data.household_id,
        parent_id: data.parent_id,
        role: data.role || 'co-tenant',
        rent_share: data.rent_share,
        move_in_date: data.move_in_date || new Date(),
        lease_signed: false,
      })
      .returning('*');
    return member;
  },

  /**
   * Create a household member using userId (convenience method)
   * Looks up parent_id automatically
   */
  async createByUserId(
    householdId: string,
    userId: string,
    data: { role?: 'owner' | 'co-tenant' | 'pending'; rent_share: number; move_in_date?: Date },
  ): Promise<HouseholdMember> {
    const parentId = await getParentIdFromUserId(userId);
    if (!parentId) {
      throw new Error('Parent profile not found for user');
    }
    return await this.create({
      household_id: householdId,
      parent_id: parentId,
      role: data.role,
      rent_share: data.rent_share,
      move_in_date: data.move_in_date,
    });
  },

  async findById(id: string): Promise<HouseholdMember | undefined> {
    return await db('household_members').where({ id }).first();
  },

  async findByHousehold(householdId: string): Promise<HouseholdMember[]> {
    return await db('household_members')
      .where({ household_id: householdId })
      .whereNull('move_out_date')
      .orderBy('created_at', 'asc');
  },

  /**
   * Find household memberships by user ID
   * Converts userId to parent_id internally
   */
  async findByUser(userId: string): Promise<HouseholdMember[]> {
    const parentId = await getParentIdFromUserId(userId);
    if (!parentId) {
      return [];
    }
    return await db('household_members')
      .where({ parent_id: parentId })
      .whereNull('move_out_date')
      .orderBy('created_at', 'desc');
  },

  /**
   * Find household membership by household ID and user ID
   * Converts userId to parent_id internally
   */
  async findByHouseholdAndUser(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMember | undefined> {
    const parentId = await getParentIdFromUserId(userId);
    if (!parentId) {
      return undefined;
    }
    return await db('household_members')
      .where({ household_id: householdId, parent_id: parentId })
      .whereNull('move_out_date')
      .first();
  },

  async update(id: string, data: Partial<HouseholdMember>): Promise<HouseholdMember> {
    const [member] = await db('household_members').where({ id }).update(data).returning('*');
    return member;
  },

  async delete(id: string): Promise<void> {
    await db('household_members').where({ id }).delete();
  },

  /**
   * Soft delete: Mark member as moved out
   * Sets move_out_date to current date
   */
  async removeMember(householdId: string, userId: string): Promise<void> {
    const parentId = await getParentIdFromUserId(userId);
    if (!parentId) {
      throw new Error('Parent profile not found for user');
    }
    await db('household_members')
      .where({ household_id: householdId, parent_id: parentId })
      .update({ move_out_date: db.fn.now() });
  },

  /**
   * Check if user is member of household
   * Converts userId to parent_id internally
   */
  async isMember(householdId: string, userId: string): Promise<boolean> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    return !!member;
  },

  /**
   * Check if user is owner of household
   * (owner is equivalent to admin in the original model)
   */
  async isAdmin(householdId: string, userId: string): Promise<boolean> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    return member?.role === 'owner';
  },

  /**
   * Check if user is owner of household (alias for isAdmin)
   */
  async isOwner(householdId: string, userId: string): Promise<boolean> {
    return await this.isAdmin(householdId, userId);
  },

  /**
   * Get all owners of household
   */
  async getAdmins(householdId: string): Promise<HouseholdMember[]> {
    return await db('household_members')
      .where({ household_id: householdId, role: 'owner' })
      .whereNull('move_out_date')
      .orderBy('created_at', 'asc');
  },

  /**
   * Alias for getAdmins
   */
  async getOwners(householdId: string): Promise<HouseholdMember[]> {
    return await this.getAdmins(householdId);
  },

  /**
   * Promote member to owner
   */
  async promoteToAdmin(householdId: string, userId: string): Promise<HouseholdMember> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    return await this.update(member.id, { role: 'owner' });
  },

  /**
   * Demote owner to co-tenant (requires at least one remaining owner)
   */
  async demoteToMember(householdId: string, userId: string): Promise<HouseholdMember> {
    const owners = await this.getAdmins(householdId);
    if (owners.length <= 1) {
      throw new Error('Cannot demote last owner');
    }

    const member = await this.findByHouseholdAndUser(householdId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    return await this.update(member.id, { role: 'co-tenant' });
  },

  /**
   * Update rent share for member
   */
  async updateRentShare(
    householdId: string,
    userId: string,
    rentShare: number,
  ): Promise<HouseholdMember> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    return await this.update(member.id, { rent_share: rentShare });
  },

  /**
   * Get total rent shares for household (validation)
   */
  async getTotalRentShares(householdId: string): Promise<number> {
    const result = await db('household_members')
      .where({ household_id: householdId })
      .whereNull('move_out_date')
      .sum('rent_share as total')
      .first();
    return parseFloat((result?.total as string) || '0');
  },

  /**
   * Check if user already exists in household (including moved-out members)
   */
  async exists(householdId: string, userId: string): Promise<boolean> {
    const parentId = await getParentIdFromUserId(userId);
    if (!parentId) {
      return false;
    }
    const member = await db('household_members')
      .where({ household_id: householdId, parent_id: parentId })
      .whereNull('move_out_date')
      .first();
    return !!member;
  },
};

/**
 * HouseholdMember Model Relations:
 *
 * - belongsTo: Household (via household_id foreign key)
 * - belongsTo: Parent (via parent_id foreign key)
 */
