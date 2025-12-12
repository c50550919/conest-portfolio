import { db } from '../config/database';

/**
 * HouseholdMember Model
 *
 * Constitution Principle I: Child Safety
 * - NO child PII in member records
 * - Only parent profile data exposed
 *
 * Security:
 * - Role-based access (admin vs. member)
 * - Rent share transparency
 */

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  rent_share: number; // Amount in cents
  joined_at: Date;
  left_at?: Date;
  status: 'active' | 'inactive';
}

export interface CreateHouseholdMemberData {
  household_id: string;
  user_id: string;
  role?: 'admin' | 'member';
  rent_share: number;
}

export const HouseholdMemberModel = {
  async create(data: CreateHouseholdMemberData): Promise<HouseholdMember> {
    const [member] = await db('household_members')
      .insert({
        household_id: data.household_id,
        user_id: data.user_id,
        role: data.role || 'member',
        rent_share: data.rent_share,
        status: 'active',
      })
      .returning('*');
    return member;
  },

  async findById(id: string): Promise<HouseholdMember | undefined> {
    return await db('household_members').where({ id }).first();
  },

  async findByHousehold(householdId: string): Promise<HouseholdMember[]> {
    return await db('household_members')
      .where({ household_id: householdId, status: 'active' })
      .orderBy('joined_at', 'asc');
  },

  async findByUser(userId: string): Promise<HouseholdMember[]> {
    return await db('household_members')
      .where({ user_id: userId, status: 'active' })
      .orderBy('joined_at', 'desc');
  },

  async findByHouseholdAndUser(
    householdId: string,
    userId: string,
  ): Promise<HouseholdMember | undefined> {
    return await db('household_members')
      .where({ household_id: householdId, user_id: userId, status: 'active' })
      .first();
  },

  async update(id: string, data: Partial<HouseholdMember>): Promise<HouseholdMember> {
    const [member] = await db('household_members')
      .where({ id })
      .update(data)
      .returning('*');
    return member;
  },

  async delete(id: string): Promise<void> {
    await db('household_members').where({ id }).delete();
  },

  /**
   * Soft delete: Mark member as inactive
   */
  async removeMember(householdId: string, userId: string): Promise<void> {
    await db('household_members')
      .where({ household_id: householdId, user_id: userId })
      .update({ status: 'inactive', left_at: db.fn.now() });
  },

  /**
   * Check if user is member of household
   */
  async isMember(householdId: string, userId: string): Promise<boolean> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    return !!member;
  },

  /**
   * Check if user is admin of household
   */
  async isAdmin(householdId: string, userId: string): Promise<boolean> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    return member?.role === 'admin';
  },

  /**
   * Get all admins of household
   */
  async getAdmins(householdId: string): Promise<HouseholdMember[]> {
    return await db('household_members')
      .where({ household_id: householdId, role: 'admin', status: 'active' })
      .orderBy('joined_at', 'asc');
  },

  /**
   * Promote member to admin
   */
  async promoteToAdmin(householdId: string, userId: string): Promise<HouseholdMember> {
    const member = await this.findByHouseholdAndUser(householdId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    return await this.update(member.id, { role: 'admin' });
  },

  /**
   * Demote admin to member (requires at least one remaining admin)
   */
  async demoteToMember(householdId: string, userId: string): Promise<HouseholdMember> {
    const admins = await this.getAdmins(householdId);
    if (admins.length <= 1) {
      throw new Error('Cannot demote last admin');
    }

    const member = await this.findByHouseholdAndUser(householdId, userId);
    if (!member) {
      throw new Error('Member not found');
    }
    return await this.update(member.id, { role: 'member' });
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
      .where({ household_id: householdId, status: 'active' })
      .sum('rent_share as total')
      .first();
    return parseInt(result?.total as string || '0', 10);
  },

  /**
   * Check if user already exists in household
   */
  async exists(householdId: string, userId: string): Promise<boolean> {
    const member = await db('household_members')
      .where({ household_id: householdId, user_id: userId })
      .first();
    return !!member;
  },
};

/**
 * HouseholdMember Model Relations:
 *
 * - belongsTo: Household (via household_id foreign key)
 * - belongsTo: User (via user_id foreign key)
 */
