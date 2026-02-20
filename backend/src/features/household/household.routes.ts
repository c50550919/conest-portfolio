/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import express from 'express';
import { HouseholdController } from './household.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

/**
 * Household Routes
 *
 * Purpose: Route definitions for Household Management features
 * Constitution: Principle I (Child Safety), Principle III (Security)
 *
 * All routes require authentication
 * Membership verification enforced at controller level
 *
 * T073: Household Router
 * - POST /api/household - Create household
 * - GET /api/household/:id - Get household details
 * - PATCH /api/household/:id - Update household (admin only)
 * - DELETE /api/household/:id - Deactivate household (admin only)
 * - GET /api/household/:id/members - Get household members
 * - POST /api/household/:id/members - Add member (admin only)
 * - DELETE /api/household/:id/members/:userId - Remove member (admin only)
 * - PATCH /api/household/:id/members/:userId/rent-share - Update rent share (admin only)
 * - GET /api/household/:id/expenses - Get expenses
 * - POST /api/household/:id/expenses - Create expense (admin only)
 *
 * CRITICAL CHILD SAFETY: NO child PII in any responses
 */

const router = express.Router();

// All household routes require authentication
router.use(authMiddleware);

/**
 * POST /api/household
 * Create new household with authenticated user as admin
 *
 * Body:
 * - name: Household name
 * - address: Street address
 * - city: City
 * - state: 2-letter state code
 * - zipCode: 5-digit zip code
 * - monthlyRent: Monthly rent in cents
 * - leaseStartDate (optional): ISO date YYYY-MM-DD
 * - leaseEndDate (optional): ISO date YYYY-MM-DD
 *
 * Response:
 * - household: Created household object
 * - member: Creator's membership record with admin role
 *
 * Security: Authenticated user automatically becomes household admin
 */
router.post('/', HouseholdController.createHousehold);

/**
 * GET /api/household/me
 * Get current user's household
 *
 * Response:
 * - household: User's active household object
 *
 * Returns 404 if user is not in any household
 * Security: Authenticated user can only access their own household
 */
router.get('/me', HouseholdController.getMyHousehold);

/**
 * GET /api/household/:id
 * Get household details
 *
 * Params:
 * - id: Household UUID
 *
 * Response:
 * - household: Household object with full details
 *
 * Security: Only household members can view details (403 for non-members)
 */
router.get('/:id', HouseholdController.getHousehold);

/**
 * PATCH /api/household/:id
 * Update household details (admin only)
 *
 * Params:
 * - id: Household UUID
 *
 * Body: (all optional, at least one required)
 * - name: Household name
 * - address: Street address
 * - city: City
 * - state: 2-letter state code
 * - zipCode: 5-digit zip code
 * - monthlyRent: Monthly rent in cents
 * - leaseStartDate: ISO date YYYY-MM-DD
 * - leaseEndDate: ISO date YYYY-MM-DD
 *
 * Response:
 * - household: Updated household object
 *
 * Security: Only household admins can update (403 for non-admins)
 */
router.patch('/:id', HouseholdController.updateHousehold);

/**
 * GET /api/household/:id/members
 * Get household members with profile info
 *
 * Params:
 * - id: Household UUID
 *
 * Response:
 * - members: Array of member objects with user profile info
 *   Each member contains:
 *   - id: Membership ID
 *   - userId: User UUID
 *   - firstName: User's first name
 *   - profilePhotoUrl: User's profile photo URL
 *   - role: 'admin' or 'member'
 *   - rentShare: Rent share amount in cents
 *   - joinedAt: Timestamp
 *   - status: 'active' or 'inactive'
 *
 * CRITICAL CHILD SAFETY: Contains ONLY childrenCount, childrenAgeGroups (NO child PII)
 * Security: Only household members can view members (403 for non-members)
 */
router.get('/:id/members', HouseholdController.getMembers);

/**
 * POST /api/household/:id/members
 * Add member to household (admin only)
 *
 * Params:
 * - id: Household UUID
 *
 * Body:
 * - userId: UUID of user to add
 * - rentShare: Rent share amount in cents
 * - role (optional): 'admin' or 'member' (defaults to 'member')
 *
 * Response:
 * - member: Created membership record
 *
 * Security: Only household admins can add members (403 for non-admins)
 * Validation: Prevents duplicate memberships, validates user exists
 */
router.post('/:id/members', HouseholdController.addMember);

/**
 * DELETE /api/household/:id/members/:userId
 * Remove member from household (admin only)
 *
 * Params:
 * - id: Household UUID
 * - userId: UUID of user to remove
 *
 * Response:
 * - success: boolean
 * - message: Confirmation message
 *
 * Security: Only household admins can remove members (403 for non-admins)
 * Protection: Cannot remove last admin from household
 */
router.delete(
  '/:id/members/:userId',
  HouseholdController.removeMember,
);

/**
 * GET /api/household/:id/expenses
 * Get household expenses
 *
 * Params:
 * - id: Household UUID
 *
 * Query params (optional):
 * - status: Filter by status (pending, processing, completed, failed, refunded)
 * - type: Filter by type (rent, utilities, deposit, other)
 *
 * Response:
 * - expenses: Array of expense objects with payer info
 *   Each expense contains:
 *   - id: Expense UUID
 *   - householdId: Household UUID
 *   - payerId: Payer user UUID
 *   - payerName: Payer's first name
 *   - amount: Amount in cents
 *   - type: Expense type
 *   - status: Payment status
 *   - description: Optional description
 *   - dueDate: Optional due date
 *   - paidAt: Optional payment timestamp
 *   - createdAt: Creation timestamp
 * - total: Total amount (all expenses)
 * - pending: Pending amount
 * - overdue: Overdue amount
 *
 * Security: Only household members can view expenses (403 for non-members)
 */
router.get('/:id/expenses', HouseholdController.getExpenses);

export default router;
