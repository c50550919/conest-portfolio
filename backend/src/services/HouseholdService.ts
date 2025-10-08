import { HouseholdModel, CreateHouseholdData } from '../models/Household';
import { HouseholdMemberModel, CreateHouseholdMemberData } from '../models/HouseholdMember';
import { ExpenseModel } from '../models/Expense';
import { UserModel } from '../models/User';
import { db } from '../config/database';

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
   * Create new household with creator as admin
   */
  static async createHousehold(
    data: CreateHouseholdData,
    creatorUserId: string
  ): Promise<{ household: any; member: any }> {
    // Verify creator user exists
    const user = await UserModel.findById(creatorUserId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create household
    const household = await HouseholdModel.create(data);

    // Add creator as admin with 100% rent share initially
    const member = await HouseholdMemberModel.create({
      household_id: household.id,
      user_id: creatorUserId,
      role: 'admin',
      rent_share: data.monthly_rent,
    });

    return { household, member };
  }

  /**
   * Get household by ID
   */
  static async getHousehold(householdId: string) {
    return await HouseholdModel.findById(householdId);
  }

  /**
   * Get household members with user profile info (NO CHILD PII)
   */
  static async getMembers(householdId: string) {
    const members = await HouseholdMemberModel.findByHousehold(householdId);

    // Enrich with user profile data (firstName, profilePhotoUrl)
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        const user = await UserModel.findById(member.user_id);

        // Get basic profile info from profiles table
        const profile = await db('profiles')
          .where({ user_id: member.user_id })
          .select('first_name', 'profile_photo_url')
          .first();

        return {
          id: member.id,
          userId: member.user_id,
          firstName: profile?.first_name || 'Unknown',
          profilePhotoUrl: profile?.profile_photo_url || null,
          role: member.role,
          rentShare: member.rent_share,
          joinedAt: member.joined_at,
          status: member.status,
        };
      })
    );

    return { members: enrichedMembers };
  }

  /**
   * Get household expenses with payer info
   */
  static async getExpenses(
    householdId: string,
    filters?: { status?: string; type?: string }
  ) {
    let expenses;

    if (filters?.status) {
      expenses = await ExpenseModel.findByStatus(householdId, filters.status as any);
    } else if (filters?.type) {
      expenses = await ExpenseModel.findByType(householdId, filters.type as any);
    } else {
      expenses = await ExpenseModel.findByHousehold(householdId);
    }

    // Enrich with payer name
    const enrichedExpenses = await Promise.all(
      expenses.map(async (expense) => {
        const profile = await db('profiles')
          .where({ user_id: expense.payer_id })
          .select('first_name')
          .first();

        return {
          id: expense.id,
          householdId: expense.household_id,
          payerId: expense.payer_id,
          payerName: profile?.first_name || 'Unknown',
          amount: expense.amount,
          type: expense.type,
          status: expense.status,
          description: expense.description,
          dueDate: expense.due_date,
          paidAt: expense.paid_at,
          createdAt: expense.created_at,
        };
      })
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
    data: { userId: string; rentShare: number; role?: 'admin' | 'member' }
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
    if (household.status !== 'active') {
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

    // Add member
    const member = await HouseholdMemberModel.create({
      household_id: householdId,
      user_id: data.userId,
      rent_share: data.rentShare,
      role: data.role || 'member',
    });

    return member;
  }

  /**
   * Remove member from household (admin only)
   */
  static async removeMember(
    householdId: string,
    requestingUserId: string,
    userIdToRemove: string
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
      userIdToRemove
    );

    if (memberToRemove?.role === 'admin' && admins.length <= 1) {
      throw new Error('Cannot remove the last admin');
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
    newRentShare: number
  ) {
    // Verify requesting user is admin
    const isAdmin = await HouseholdMemberModel.isAdmin(householdId, requestingUserId);
    if (!isAdmin) {
      throw new Error('Only admins can update rent shares');
    }

    return await HouseholdMemberModel.updateRentShare(
      householdId,
      userIdToUpdate,
      newRentShare
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
    data: Partial<CreateHouseholdData>
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
