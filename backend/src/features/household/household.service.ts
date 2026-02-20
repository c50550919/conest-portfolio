/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { HouseholdModel, CreateHouseholdData } from '../../models/Household';
import { HouseholdMemberModel } from '../../models/HouseholdMember';
import { ExpenseModel } from '../../models/Expense';
import { UserModel } from '../../models/User';
import { ParentModel } from '../../models/Parent';
import { db } from '../../config/database';

/**
 * HouseholdService
 *
 * Business logic for household management:
 * - Household creation and management
 * - Member management with role-based access
 * - Expense tracking and summaries
 *
 * **CRITICAL CHILD SAFETY**: NO child PII in any household data
 */

export class HouseholdService {
  /**
   * Create new household with creator as owner
   */
  static async createHousehold(
    data: CreateHouseholdData,
    creatorUserId: string,
  ): Promise<{ household: any; member: any }> {
    // Verify creator user exists
    const user = await UserModel.findById(creatorUserId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create household
    const household = await HouseholdModel.create(data);

    // Add creator as owner with 100% rent share initially
    // Uses createByUserId which internally looks up parent_id
    const member = await HouseholdMemberModel.createByUserId(
      household.id,
      creatorUserId,
      {
        role: 'owner',
        rent_share: data.monthly_rent,
      },
    );

    return { household, member };
  }

  /**
   * Get household by ID
   */
  static async getHousehold(householdId: string) {
    return await HouseholdModel.findById(householdId);
  }

  /**
   * Get user's active household
   * Returns the first active household the user belongs to
   * Note: household_members table uses parent_id, not user_id
   */
  static async getMyHousehold(userId: string) {
    // First, find the parent record for this user
    const parent = await ParentModel.findByUserId(userId);

    if (!parent) {
      // User might not have a parent profile yet
      return null;
    }

    // Find household memberships by parent_id
    const memberships = await db('household_members')
      .where({ parent_id: parent.id })
      .orderBy('created_at', 'desc');

    if (!memberships || memberships.length === 0) {
      return null;
    }

    // Get the first active household
    for (const membership of memberships) {
      const household = await HouseholdModel.findById(membership.household_id);
      if (household && household.active) {
        return household;
      }
    }

    return null;
  }

  /**
   * Get household members with user profile info (NO CHILD PII)
   */
  static async getMembers(householdId: string) {
    const members = await HouseholdMemberModel.findByHousehold(householdId);

    // Enrich with parent profile data (firstName, profilePhotoUrl)
    // Note: Profile info is stored in parents table, not a separate profiles table
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        // Get parent profile info (first_name, profile_photo_url are in parents table)
        const parent = await db('parents')
          .where({ id: member.parent_id })
          .select('user_id', 'first_name', 'profile_photo_url')
          .first();

        return {
          id: member.id,
          parentId: member.parent_id,
          userId: parent?.user_id || null,
          firstName: parent?.first_name || 'Unknown',
          profilePhotoUrl: parent?.profile_photo_url || null,
          role: member.role,
          rentShare: member.rent_share,
          moveInDate: member.move_in_date,
          leaseSigned: member.lease_signed,
        };
      }),
    );

    return { members: enrichedMembers };
  }

  /**
   * Get household expenses with payer info
   */
  static async getExpenses(
    householdId: string,
    filters?: { status?: string; type?: string },
  ) {
    let expenses;

    if (filters?.status) {
      expenses = await ExpenseModel.findByStatus(householdId, filters.status as any);
    } else if (filters?.type) {
      expenses = await ExpenseModel.findByType(householdId, filters.type as any);
    } else {
      expenses = await ExpenseModel.findByHousehold(householdId);
    }

    // Enrich with payer name (from parents table)
    const enrichedExpenses = await Promise.all(
      expenses.map(async (expense) => {
        const parent = await db('parents')
          .where({ user_id: expense.payer_id })
          .select('first_name')
          .first();

        return {
          id: expense.id,
          householdId: expense.household_id,
          payerId: expense.payer_id,
          payerName: parent?.first_name || 'Unknown',
          amount: expense.amount,
          type: expense.type,
          status: expense.status,
          description: expense.description,
          dueDate: expense.due_date,
          paidAt: expense.paid_at,
          createdAt: expense.created_at,
        };
      }),
    );

    // Get summary
    const summary = await ExpenseModel.getSummary(householdId);

    return {
      expenses: enrichedExpenses,
      total: summary.total,
      pending: summary.pending,
      overdue: summary.overdue,
    };
  }

  /**
   * Add member to household (admin only)
   */
  static async addMember(
    householdId: string,
    requestingUserId: string,
    data: { userId: string; rentShare: number; role?: 'admin' | 'member' },
  ) {
    // Verify requesting user is admin
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, requestingUserId);
    if (!isAdmin) {
      throw new Error('Only admins can add members');
    }

    // Verify household exists and is active
    const household = await HouseholdModel.findById(householdId);
    if (!household) {
      throw new Error('Household not found');
    }
    if (!household.active) {
      throw new Error('Household is not active');
    }

    // Verify user to be added exists
    const userToAdd = await UserModel.findById(data.userId);
    if (!userToAdd) {
      throw new Error('User not found');
    }

    // Check if user already exists in household
    const exists = await HouseholdMemberModel.exists(householdId, data.userId);
    if (exists) {
      throw new Error('User is already a member of this household');
    }

    // Add member using createByUserId which looks up parent_id internally
    const member = await HouseholdMemberModel.createByUserId(
      householdId,
      data.userId,
      {
        rent_share: data.rentShare,
        role: data.role === 'admin' ? 'owner' : 'co-tenant',
      },
    );

    return member;
  }

  /**
   * Remove member from household (admin only)
   */
  static async removeMember(
    householdId: string,
    requestingUserId: string,
    userIdToRemove: string,
  ) {
    // Verify requesting user is admin
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, requestingUserId);
    if (!isAdmin) {
      throw new Error('Only admins can remove members');
    }

    // Cannot remove the last admin
    const admins = await HouseholdMemberModel.getAdmins(householdId);
    const memberToRemove = await HouseholdMemberModel.findByHouseholdAndUser(
      householdId,
      userIdToRemove,
    );

    if (memberToRemove?.role === 'owner' && admins.length <= 1) {
      throw new Error('Cannot remove the last owner');
    }

    await HouseholdMemberModel.removeMember(householdId, userIdToRemove);
  }

  /**
   * Update member rent share (admin only)
   */
  static async updateRentShare(
    householdId: string,
    requestingUserId: string,
    userIdToUpdate: string,
    newRentShare: number,
  ) {
    // Verify requesting user is admin
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, requestingUserId);
    if (!isAdmin) {
      throw new Error('Only admins can update rent shares');
    }

    return await HouseholdMemberModel.updateRentShare(
      householdId,
      userIdToUpdate,
      newRentShare,
    );
  }

  /**
   * Verify user is household member
   */
  static async isMember(householdId: string, userId: string): Promise<boolean> {
    return await HouseholdMemberModel.isMember(householdId, userId);
  }

  /**
   * Verify user is household admin
   */
  static async isAdmin(householdId: string, userId: string): Promise<boolean> {
    return await HouseholdMemberModel.isAdmin(householdId, userId);
  }

  /**
   * Update household details (admin only)
   */
  static async updateHousehold(
    householdId: string,
    requestingUserId: string,
    data: Partial<CreateHouseholdData>,
  ) {
    // Verify requesting user is admin
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, requestingUserId);
    if (!isAdmin) {
      throw new Error('Only admins can update household details');
    }

    return await HouseholdModel.update(householdId, data);
  }

  /**
   * Deactivate household (admin only)
   */
  static async deactivateHousehold(householdId: string, requestingUserId: string) {
    // Verify requesting user is admin
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, requestingUserId);
    if (!isAdmin) {
      throw new Error('Only admins can deactivate household');
    }

    return await HouseholdModel.deactivate(householdId);
  }
}
