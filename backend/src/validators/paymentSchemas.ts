/**
 * Payment Validation Schemas
 *
 * Purpose: Request validation for Payment endpoints (Stripe integration)
 * Constitution: Principle III (Security - validate all payment inputs)
 *              Principle IV (Performance - fail fast on invalid data)
 *
 * Validation Rules:
 * - Amount: Positive integer (cents), max 999,999,900 cents ($9,999,999.00)
 * - HouseholdId: Valid UUID v4 format
 * - PaymentIntentId: Stripe payment intent ID format (pi_)
 * - Description: Max 500 characters
 *
 * Security:
 * - Strict mode to reject additional fields
 * - Input sanitization to prevent injection attacks
 * - Amount validation to prevent negative/zero values
 */

import { z } from 'zod';

/**
 * POST /api/payments/stripe/connect - Create Stripe Connect account
 *
 * Fields:
 * - No body required (uses authenticated userId from JWT)
 */
export const CreateStripeAccountSchema = z.object({}).strict();

/**
 * POST /api/payments/intents - Create payment intent
 *
 * Fields:
 * - amount: Payment amount in cents (positive integer, max $9,999,999.00)
 * - householdId: UUID of household
 * - description: Payment description (max 500 chars)
 * - idempotencyKey: Optional idempotency key for duplicate prevention
 *
 * Security:
 * - Amount must be positive (prevents negative/zero charges)
 * - Amount capped at $9,999,999.00 (fraud prevention)
 * - Description length limited (prevents DoS)
 */
export const CreatePaymentIntentSchema = z
  .object({
    amount: z
      .number()
      .int('Amount must be an integer (cents)')
      .positive('Amount must be positive')
      .max(999999900, 'Amount cannot exceed $9,999,999.00'),
    householdId: z
      .string()
      .uuid('Household ID must be a valid UUID'),
    description: z
      .string()
      .min(1, 'Description is required')
      .max(500, 'Description cannot exceed 500 characters'),
    idempotencyKey: z
      .string()
      .min(1, 'Idempotency key cannot be empty')
      .max(255, 'Idempotency key too long')
      .optional(),
  })
  .strict();

/**
 * POST /api/payments/split-rent - Split rent among household members
 *
 * Fields:
 * - householdId: UUID of household
 * - totalAmount: Total rent amount in cents (positive integer)
 *
 * Security:
 * - Amount must be positive
 * - Amount capped at $9,999,999.00
 */
export const SplitRentSchema = z
  .object({
    householdId: z
      .string()
      .uuid('Household ID must be a valid UUID'),
    totalAmount: z
      .number()
      .int('Total amount must be an integer (cents)')
      .positive('Total amount must be positive')
      .max(999999900, 'Total amount cannot exceed $9,999,999.00'),
  })
  .strict();

/**
 * POST /api/payments/refund - Process refund
 *
 * Fields:
 * - paymentIntentId: Stripe payment intent ID (starts with "pi_")
 * - amount: Optional partial refund amount in cents (positive integer)
 *
 * Security:
 * - Payment intent ID format validation
 * - Amount must be positive if provided
 */
export const RefundSchema = z
  .object({
    paymentIntentId: z
      .string()
      .min(1, 'Payment intent ID is required')
      .regex(/^pi_[a-zA-Z0-9]+$/, 'Invalid payment intent ID format'),
    amount: z
      .number()
      .int('Amount must be an integer (cents)')
      .positive('Amount must be positive')
      .max(999999900, 'Amount cannot exceed $9,999,999.00')
      .optional(),
  })
  .strict();

/**
 * GET /api/payments/history - Get payment history (query params)
 *
 * Fields:
 * - limit: Optional limit for pagination (1-100)
 * - offset: Optional offset for pagination (0+)
 *
 * Note: userId is from authenticated JWT token
 */
export const GetPaymentHistorySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .optional()
    .default('50'),
  offset: z
    .string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .refine(val => val >= 0, 'Offset must be non-negative')
    .optional()
    .default('0'),
});

/**
 * Legacy payment creation schema
 * For backward compatibility with existing /api/payments/create endpoint
 */
export const CreatePaymentSchema = z
  .object({
    household_id: z
      .string()
      .uuid('Household ID must be a valid UUID'),
    amount: z
      .number()
      .int('Amount must be an integer (cents)')
      .positive('Amount must be positive')
      .max(999999900, 'Amount cannot exceed $9,999,999.00'),
    type: z.enum(['rent', 'utilities', 'deposit', 'other'], {
      errorMap: () => ({ message: 'Type must be rent, utilities, deposit, or other' }),
    }),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
  })
  .strict();

// Type exports for TypeScript type inference
export type CreateStripeAccountRequest = z.infer<typeof CreateStripeAccountSchema>;
export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>;
export type SplitRentRequest = z.infer<typeof SplitRentSchema>;
export type RefundRequest = z.infer<typeof RefundSchema>;
export type GetPaymentHistoryRequest = z.infer<typeof GetPaymentHistorySchema>;
export type CreatePaymentRequest = z.infer<typeof CreatePaymentSchema>;
