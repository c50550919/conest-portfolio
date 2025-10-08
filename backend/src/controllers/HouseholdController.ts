/**
 * Household Controller
 *
 * Purpose: HTTP request handlers for household management endpoints
 * Constitution: Principle I (Child Safety - NO child PII)
 *
 * T074: HouseholdController endpoint implementations
 * - getMembers(): GET /api/household/:id/members
 * - getExpenses(): GET /api/household/:id/expenses
 * - addMember(): POST /api/household/:id/members
 * - createHousehold(): POST /api/household
 * - getHousehold(): GET /api/household/:id
 * - updateHousehold(): PATCH /api/household/:id
 */

import { Response } from 'express';
import { HouseholdService } from '../services/HouseholdService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const HouseholdController = {
  /**
   * GET /api/household/:id/members
   * Fetch all members of a household
   *
   * Authorization: User must be household member
   * Child Safety: NO child PII in member profiles
   */
  getMembers: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      // Verify user is household member
      const isMember = await HouseholdService.isMember(householdId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'You are not authorized to view this household members',
          statusCode: 403,
        });
        return;
      }

      const result = await HouseholdService.getMembers(householdId);

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Household not found',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * GET /api/household/:id/expenses
   * Fetch all expenses for a household
   *
   * Authorization: User must be household member
   * Query params: status, type (optional filters)
   */
  getExpenses: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const userId = req.user?.userId;
      const { status, type } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      // Verify user is household member
      const isMember = await HouseholdService.isMember(householdId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'You are not authorized to view this household expenses',
          statusCode: 403,
        });
        return;
      }

      const result = await HouseholdService.getExpenses(householdId, {
        status: status as string | undefined,
        type: type as string | undefined,
      });

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Household not found',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * POST /api/household/:id/members
   * Add a new member to household
   *
   * Authorization: User must be household admin
   * Body: userId, rentShare, role (optional)
   */
  addMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const requestingUserId = req.user?.userId;
      const { userId, rentShare, role } = req.body;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      const member = await HouseholdService.addMember(householdId, requestingUserId, {
        userId,
        rentShare,
        role,
      });

      res.status(201).json(member);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          res.status(403).json({
            success: false,
            error: 'Only household admins can add members',
          });
          return;
        }

        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }

        if (error.message.includes('already a member') || error.message.includes('duplicate')) {
          res.status(400).json({
            success: false,
            error: 'User is already a member of this household',
          });
          return;
        }

        if (error.message.includes('not active')) {
          res.status(400).json({
            success: false,
            error: 'Household is not active',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * POST /api/household
   * Create a new household
   *
   * Authorization: Authenticated user
   * Body: name, address, city, state, zipCode, monthlyRent, leaseStartDate, leaseEndDate
   */
  createHousehold: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      const result = await HouseholdService.createHousehold(req.body, userId);

      res.status(201).json(result.household);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'User not found',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * GET /api/household/:id
   * Fetch household details
   *
   * Authorization: User must be household member
   */
  getHousehold: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      // Verify user is household member
      const isMember = await HouseholdService.isMember(householdId, userId);
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'You are not authorized to view this household',
          statusCode: 403,
        });
        return;
      }

      const household = await HouseholdService.getHousehold(householdId);

      if (!household) {
        res.status(404).json({
          success: false,
          error: 'Household not found',
        });
        return;
      }

      res.status(200).json(household);
    } catch (error) {
      throw error;
    }
  }),

  /**
   * PATCH /api/household/:id
   * Update household details
   *
   * Authorization: User must be household admin
   */
  updateHousehold: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const requestingUserId = req.user?.userId;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      const household = await HouseholdService.updateHousehold(
        householdId,
        requestingUserId,
        req.body
      );

      res.status(200).json(household);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          res.status(403).json({
            success: false,
            error: 'Only household admins can update household details',
          });
          return;
        }

        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Household not found',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * DELETE /api/household/:id/members/:userId
   * Remove member from household
   *
   * Authorization: User must be household admin
   */
  removeMember: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId, userId: userIdToRemove } = req.params;
      const requestingUserId = req.user?.userId;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      await HouseholdService.removeMember(householdId, requestingUserId, userIdToRemove);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          res.status(403).json({
            success: false,
            error: 'Only household admins can remove members',
          });
          return;
        }

        if (error.message.includes('last admin')) {
          res.status(400).json({
            success: false,
            error: 'Cannot remove the last admin',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * PATCH /api/household/:id/members/:userId/rent-share
   * Update member's rent share
   *
   * Authorization: User must be household admin
   * Body: rentShare (number in cents)
   */
  updateRentShare: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId, userId: userIdToUpdate } = req.params;
      const requestingUserId = req.user?.userId;
      const { rentShare } = req.body;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      const member = await HouseholdService.updateRentShare(
        householdId,
        requestingUserId,
        userIdToUpdate,
        rentShare
      );

      res.status(200).json(member);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          res.status(403).json({
            success: false,
            error: 'Only household admins can update rent shares',
          });
          return;
        }

        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Member not found',
          });
          return;
        }
      }
      throw error;
    }
  }),

  /**
   * POST /api/household/:id/expenses
   * Create expense for household
   *
   * Authorization: User must be household admin
   * Body: type, amount, description (optional), dueDate (optional)
   */
  createExpense: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const userId = req.user?.userId;
      const { type, amount, description, dueDate } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      // Verify user is household admin
      const isAdmin = await HouseholdService.isAdmin(householdId, userId);
      if (!isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Only household admins can create expenses',
        });
        return;
      }

      // Import ExpenseModel to create expense
      const { ExpenseModel } = await import('../models/Expense');

      const expenseData: any = {
        household_id: householdId,
        payer_id: userId,
        amount,
        type,
        description,
      };

      if (dueDate) {
        expenseData.due_date = new Date(dueDate);
      }

      const expense = await ExpenseModel.create(expenseData);

      res.status(201).json(expense);
    } catch (error) {
      throw error;
    }
  }),

  /**
   * DELETE /api/household/:id
   * Deactivate household (soft delete)
   *
   * Authorization: User must be household admin
   */
  deactivateHousehold: asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const { id: householdId } = req.params;
      const requestingUserId = req.user?.userId;

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          statusCode: 401,
        });
        return;
      }

      await HouseholdService.deactivateHousehold(householdId, requestingUserId);

      res.status(200).json({
        success: true,
        message: 'Household deactivated successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Only admins')) {
          res.status(403).json({
            success: false,
            error: 'Only household admins can deactivate household',
          });
          return;
        }

        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Household not found',
          });
          return;
        }
      }
      throw error;
    }
  }),
};
