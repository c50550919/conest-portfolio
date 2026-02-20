/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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

/**
 * POST /api/payments/verification/create-intent - Create verification payment intent
 *
 * Fields:
 * - connectionRequestId: Optional UUID of connection request (links payment to match)
 * - idempotencyKey: Optional idempotency key for duplicate prevention
 *
 * Security:
 * - Fixed amount of $39.00 (3900 cents) - not user-controllable
 * - User ID from authenticated JWT token
 */
export const CreateVerificationPaymentSchema = z
  .object({
    connectionRequestId: z
      .string()
      .uuid('Connection request ID must be a valid UUID')
      .optional(),
    idempotencyKey: z
      .string()
      .min(1, 'Idempotency key cannot be empty')
      .max(255, 'Idempotency key too long')
      .optional(),
  })
  .strict();

/**
 * GET /api/payments/verification/status - Get verification payment status
 *
 * Query params:
 * - userId: Optional UUID to check (admin only), defaults to authenticated user
 */
export const GetVerificationPaymentStatusSchema = z.object({
  userId: z
    .string()
    .uuid('User ID must be a valid UUID')
    .optional(),
});

/**
 * POST /api/billing/validate-ios - Validate iOS App Store receipt
 *
 * Fields:
 * - productId: Product identifier from App Store
 * - transactionId: Transaction ID from StoreKit
 * - originalTransactionId: Original transaction ID (for subscriptions)
 * - receipt: Base64-encoded receipt data
 * - signedTransaction: JWS signed transaction for StoreKit 2
 *
 * Security:
 * - All transactions validated against App Store Server API
 * - JWS signature verification for StoreKit 2 transactions
 */
export const ValidateIOSReceiptSchema = z
  .object({
    productId: z
      .string()
      .min(1, 'Product ID is required')
      .max(255, 'Product ID too long'),
    transactionId: z
      .string()
      .min(1, 'Transaction ID is required')
      .max(255, 'Transaction ID too long'),
    originalTransactionId: z
      .string()
      .max(255, 'Original transaction ID too long')
      .optional(),
    receipt: z
      .string()
      .min(1, 'Receipt is required'),
    signedTransaction: z
      .string()
      .optional(),
  })
  .strict();

/**
 * POST /api/billing/validate - Validate Google Play receipt
 *
 * Fields:
 * - productId: Product identifier from Google Play
 * - purchaseToken: Purchase token from Google Play Billing
 * - transactionId: Transaction ID
 * - transactionReceipt: Transaction receipt data
 *
 * Security:
 * - All transactions validated against Google Play Developer API
 */
export const ValidateGooglePlayReceiptSchema = z
  .object({
    productId: z
      .string()
      .min(1, 'Product ID is required')
      .max(255, 'Product ID too long'),
    purchaseToken: z
      .string()
      .min(1, 'Purchase token is required'),
    transactionId: z
      .string()
      .max(255, 'Transaction ID too long')
      .optional(),
    transactionReceipt: z
      .string()
      .optional(),
  })
  .strict();

/**
 * POST /api/billing/validate-bundle - Validate bundle purchase
 *
 * Fields:
 * - platform: 'ios' or 'android'
 * - receipt: Platform-specific receipt data
 * - productId: Bundle product ID
 *
 * Security:
 * - Validates receipt with respective app store
 * - Activates both verification and subscription on success
 */
export const ValidateBundlePurchaseSchema = z
  .object({
    platform: z.enum(['ios', 'android'], {
      errorMap: () => ({ message: 'Platform must be ios or android' }),
    }),
    receipt: z.string().min(1, 'Receipt is required'),
    productId: z.string().min(1, 'Product ID is required'),
    transactionId: z.string().optional(),
    purchaseToken: z.string().optional(),
  })
  .strict();

// Type exports for TypeScript type inference
export type CreateStripeAccountRequest = z.infer<typeof CreateStripeAccountSchema>;
export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>;
export type SplitRentRequest = z.infer<typeof SplitRentSchema>;
export type RefundRequest = z.infer<typeof RefundSchema>;
export type GetPaymentHistoryRequest = z.infer<typeof GetPaymentHistorySchema>;
export type CreatePaymentRequest = z.infer<typeof CreatePaymentSchema>;
export type CreateVerificationPaymentRequest = z.infer<typeof CreateVerificationPaymentSchema>;
export type GetVerificationPaymentStatusRequest = z.infer<typeof GetVerificationPaymentStatusSchema>;
export type ValidateIOSReceiptRequest = z.infer<typeof ValidateIOSReceiptSchema>;
export type ValidateGooglePlayReceiptRequest = z.infer<typeof ValidateGooglePlayReceiptSchema>;
export type ValidateBundlePurchaseRequest = z.infer<typeof ValidateBundlePurchaseSchema>;
