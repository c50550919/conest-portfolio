import { z } from 'zod';

/**
 * Household Validation Schemas
 *
 * Purpose: Request validation for Household endpoints
 * Constitution: Principle I (Child Safety - NO child PII in household data)
 *
 * CRITICAL CHILD SAFETY RULES:
 * - NO child PII in household or member data
 * - Only parent/user profile info exposed
 * - Strict validation on all inputs
 */

/**
 * POST /api/household - Create household request schema
 *
 * Fields:
 * - name: Household name (min 1 char, max 100)
 * - address: Street address (min 1 char, max 200)
 * - city: City name (min 1 char, max 100)
 * - state: 2-letter state code
 * - zipCode: 5-digit US zip code
 * - monthlyRent: Monthly rent in cents (positive integer)
 * - leaseStartDate: Optional ISO date format (YYYY-MM-DD)
 * - leaseEndDate: Optional ISO date format (YYYY-MM-DD)
 */
export const CreateHouseholdSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Household name is required')
      .max(100, 'Household name cannot exceed 100 characters'),
    address: z
      .string()
      .min(1, 'Address is required')
      .max(200, 'Address cannot exceed 200 characters'),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100, 'City cannot exceed 100 characters'),
    state: z.string().length(2, 'State must be a 2-letter code (e.g., CA, NY)'),
    zipCode: z.string().regex(/^\d{5}$/, 'Zip code must be exactly 5 digits'),
    monthlyRent: z
      .number()
      .int('Monthly rent must be an integer (cents)')
      .positive('Monthly rent must be positive')
      .max(99999999, 'Monthly rent cannot exceed $999,999.99'),
    leaseStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lease start date must be in YYYY-MM-DD format')
      .optional(),
    leaseEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lease end date must be in YYYY-MM-DD format')
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If both dates provided, end date must be after start date
      if (data.leaseStartDate && data.leaseEndDate) {
        return new Date(data.leaseEndDate) > new Date(data.leaseStartDate);
      }
      return true;
    },
    {
      message: 'Lease end date must be after start date',
    },
  );

/**
 * POST /api/household/:id/members - Add member request schema
 *
 * Fields:
 * - userId: UUID of user to add
 * - rentShare: Member's rent share in cents (positive integer)
 * - role: Optional role (admin or member), defaults to member
 */
export const AddMemberSchema = z
  .object({
    userId: z.string().uuid('User ID must be a valid UUID'),
    rentShare: z
      .number()
      .int('Rent share must be an integer (cents)')
      .positive('Rent share must be positive')
      .max(99999999, 'Rent share cannot exceed $999,999.99'),
    role: z.enum(['admin', 'member'], {
      errorMap: () => ({ message: 'Role must be either "admin" or "member"' }),
    }).optional(),
  })
  .strict();

/**
 * PATCH /api/household/:id - Update household request schema
 *
 * Fields: All optional, at least one required
 * - name: Household name
 * - address: Street address
 * - city: City name
 * - state: 2-letter state code
 * - zipCode: 5-digit US zip code
 * - monthlyRent: Monthly rent in cents
 * - leaseStartDate: ISO date format
 * - leaseEndDate: ISO date format
 */
export const UpdateHouseholdSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Household name cannot be empty')
      .max(100, 'Household name cannot exceed 100 characters')
      .optional(),
    address: z
      .string()
      .min(1, 'Address cannot be empty')
      .max(200, 'Address cannot exceed 200 characters')
      .optional(),
    city: z
      .string()
      .min(1, 'City cannot be empty')
      .max(100, 'City cannot exceed 100 characters')
      .optional(),
    state: z
      .string()
      .length(2, 'State must be a 2-letter code')
      .optional(),
    zipCode: z
      .string()
      .regex(/^\d{5}$/, 'Zip code must be exactly 5 digits')
      .optional(),
    monthlyRent: z
      .number()
      .int('Monthly rent must be an integer (cents)')
      .positive('Monthly rent must be positive')
      .max(99999999, 'Monthly rent cannot exceed $999,999.99')
      .optional(),
    leaseStartDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lease start date must be in YYYY-MM-DD format')
      .optional(),
    leaseEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Lease end date must be in YYYY-MM-DD format')
      .optional(),
  })
  .strict()
  .refine(
    (data) => 
      // At least one field must be provided
      Object.keys(data).length > 0
    ,
    {
      message: 'At least one field must be provided for update',
    },
  );

/**
 * PATCH /api/household/:id/members/:userId/rent-share - Update rent share schema
 *
 * Fields:
 * - rentShare: New rent share amount in cents
 */
export const UpdateRentShareSchema = z
  .object({
    rentShare: z
      .number()
      .int('Rent share must be an integer (cents)')
      .positive('Rent share must be positive')
      .max(99999999, 'Rent share cannot exceed $999,999.99'),
  })
  .strict();

/**
 * POST /api/household/:id/expenses - Create expense schema
 *
 * Fields:
 * - type: Expense type (rent, utilities, deposit, other)
 * - amount: Amount in cents (positive integer)
 * - description: Optional description (max 500 chars)
 * - dueDate: Optional due date in ISO format
 */
export const CreateExpenseSchema = z
  .object({
    type: z.enum(['rent', 'utilities', 'deposit', 'other'], {
      errorMap: () => ({
        message: 'Type must be one of: rent, utilities, deposit, other',
      }),
    }),
    amount: z
      .number()
      .int('Amount must be an integer (cents)')
      .positive('Amount must be positive')
      .max(99999999, 'Amount cannot exceed $999,999.99'),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
      .optional(),
  })
  .strict();

/**
 * GET /api/household/:id/expenses - Query parameter schema
 *
 * Fields:
 * - status: Optional filter by status
 * - type: Optional filter by type
 */
export const ExpenseQuerySchema = z
  .object({
    status: z
      .enum(['pending', 'processing', 'completed', 'failed', 'refunded'], {
        errorMap: () => ({
          message:
            'Status must be one of: pending, processing, completed, failed, refunded',
        }),
      })
      .optional(),
    type: z
      .enum(['rent', 'utilities', 'deposit', 'other'], {
        errorMap: () => ({
          message: 'Type must be one of: rent, utilities, deposit, other',
        }),
      })
      .optional(),
  })
  .strict();

/**
 * Route parameter schema for household ID
 */
export const HouseholdIdParamSchema = z.object({
  id: z.string().uuid('Household ID must be a valid UUID'),
});

/**
 * Route parameter schema for user ID
 */
export const UserIdParamSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
});

// Type exports for TypeScript type inference
export type CreateHouseholdRequest = z.infer<typeof CreateHouseholdSchema>;
export type AddMemberRequest = z.infer<typeof AddMemberSchema>;
export type UpdateHouseholdRequest = z.infer<typeof UpdateHouseholdSchema>;
export type UpdateRentShareRequest = z.infer<typeof UpdateRentShareSchema>;
export type CreateExpenseRequest = z.infer<typeof CreateExpenseSchema>;
export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>;
export type HouseholdIdParam = z.infer<typeof HouseholdIdParamSchema>;
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
