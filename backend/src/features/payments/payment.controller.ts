/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Payment Controller (Stripe Integration)
 *
 * Purpose: HTTP request handlers for payment operations
 * Constitution: Principle III (Security - PCI compliance, webhook validation)
 *              Principle IV (Performance - <100ms response time)
 *
 * Endpoints:
 * - POST /api/payments/stripe/connect - Create Stripe Connect account
 * - POST /api/payments/intents - Create payment intent
 * - POST /api/payments/split-rent - Split rent among household members
 * - POST /api/payments/refund - Process refund
 * - GET /api/payments/history - Get payment history
 * - POST /api/stripe/webhook - Handle Stripe webhooks
 *
 * Security:
 * - JWT authentication for all endpoints except webhook
 * - Webhook signature validation
 * - Request validation with Zod schemas
 * - PCI compliance (no card data handling)
 */

import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import stripe from '../../config/stripe';
import {
  CreateStripeAccountSchema,
  CreatePaymentIntentSchema,
  SplitRentSchema,
  RefundSchema,
  GetPaymentHistorySchema,
  CreateVerificationPaymentSchema,
  GetVerificationPaymentStatusSchema,
} from './payment.schemas';

export const PaymentController = {
  /**
   * POST /api/payments/stripe/connect
   * Create Stripe Connect account for authenticated user
   */
  createStripeAccount: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to create a Stripe account',
      });
      return;
    }

    try {
      // Validate request (empty body expected)
      const validation = CreateStripeAccountSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const result = await PaymentService.createStripeAccount(req.userId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes('USER_NOT_FOUND')) {
        res.status(404).json({
          error: 'User not found',
          message: 'The authenticated user does not exist',
        });
        return;
      }

      res.status(500).json({
        error: 'Stripe account creation failed',
        message: error.message,
      });
    }
  }),

  /**
   * POST /api/payments/intents
   * Create a payment intent for processing payments
   */
  createPaymentIntent: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to create a payment intent',
      });
      return;
    }

    try {
      // Validate request
      const validation = CreatePaymentIntentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { amount, householdId, description, idempotencyKey } = validation.data;

      const result = await PaymentService.createPaymentIntent({
        amount,
        householdId,
        description,
        payerId: req.userId,
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes('INVALID_AMOUNT')) {
        res.status(400).json({
          error: 'Invalid amount',
          message: 'Payment amount must be positive',
        });
        return;
      }

      if (error.message.includes('HOUSEHOLD_NOT_FOUND')) {
        res.status(404).json({
          error: 'Household not found',
          message: 'The specified household does not exist',
        });
        return;
      }

      if (error.message.includes('USER_NOT_HOUSEHOLD_MEMBER')) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You are not a member of this household',
        });
        return;
      }

      res.status(500).json({
        error: 'Payment intent creation failed',
        message: error.message,
      });
    }
  }),

  /**
   * POST /api/payments/split-rent
   * Split rent among household members
   */
  splitRent: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to split rent',
      });
      return;
    }

    try {
      // Validate request
      const validation = SplitRentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { householdId, totalAmount } = validation.data;

      const splitAmounts = await PaymentService.splitRent({
        householdId,
        totalAmount,
      });

      res.status(200).json({
        success: true,
        count: splitAmounts.length,
        data: splitAmounts,
      });
    } catch (error: any) {
      if (error.message.includes('HOUSEHOLD_NOT_FOUND')) {
        res.status(404).json({
          error: 'Household not found',
          message: 'The specified household does not exist',
        });
        return;
      }

      if (error.message.includes('NO_HOUSEHOLD_MEMBERS')) {
        res.status(400).json({
          error: 'No household members',
          message: 'This household has no members to split rent among',
        });
        return;
      }

      res.status(500).json({
        error: 'Rent split failed',
        message: error.message,
      });
    }
  }),

  /**
   * POST /api/payments/refund
   * Process a refund for a payment
   */
  processRefund: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to process refunds',
      });
      return;
    }

    try {
      // Validate request
      const validation = RefundSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { paymentIntentId, amount } = validation.data;

      const result = await PaymentService.processRefund({
        paymentIntentId,
        amount,
      });

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        data: result,
      });
    } catch (error: any) {
      if (error.message.includes('PAYMENT_INTENT_NOT_FOUND')) {
        res.status(404).json({
          error: 'Payment not found',
          message: 'The specified payment intent does not exist',
        });
        return;
      }

      if (error.message.includes('PAYMENT_NOT_CHARGED')) {
        res.status(400).json({
          error: 'Payment not charged',
          message: 'This payment has not been charged yet',
        });
        return;
      }

      res.status(500).json({
        error: 'Refund failed',
        message: error.message,
      });
    }
  }),

  /**
   * GET /api/payments/history
   * Get payment history for authenticated user
   */
  getPaymentHistory: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to view payment history',
      });
      return;
    }

    try {
      // Validate query params
      const validation = GetPaymentHistorySchema.safeParse(req.query);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const payments = await PaymentService.getPaymentHistory(req.userId);

      res.status(200).json({
        success: true,
        count: payments.length,
        data: payments,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to retrieve payment history',
        message: error.message,
      });
    }
  }),

  /**
   * POST /api/stripe/webhook
   * Handle Stripe webhook events
   *
   * Security: Validates webhook signature to prevent unauthorized requests
   */
  handleWebhook: asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      res.status(400).json({
        error: 'No signature',
        message: 'Stripe signature is required',
      });
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      res.status(500).json({
        error: 'Configuration error',
        message: 'Webhook secret not configured',
      });
      return;
    }

    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret,
      );
    } catch (err: any) {
      res.status(400).json({
        error: 'Webhook signature verification failed',
        message: err.message,
      });
      return;
    }

    try {
      // Process webhook event
      await PaymentService.handleStripeWebhook(event);

      res.status(200).json({ received: true });
    } catch (error: any) {
      res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message,
      });
    }
  }),

  // ========================================
  // Verification Payment Endpoints
  // ========================================

  /**
   * POST /api/payments/verification/create-intent
   * Create a verification payment intent ($39)
   */
  createVerificationPaymentIntent: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to create a verification payment',
      });
      return;
    }

    try {
      // Validate request
      const validation = CreateVerificationPaymentSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { connectionRequestId, idempotencyKey } = validation.data;

      const result = await PaymentService.createVerificationPaymentIntent({
        userId: req.userId,
        connectionRequestId,
        idempotencyKey,
      });

      res.status(201).json({
        success: true,
        data: {
          paymentIntentId: result.paymentIntentId,
          clientSecret: result.clientSecret,
          amount: result.amount,
          amountFormatted: `$${(result.amount / 100).toFixed(2)}`,
          verificationPaymentId: result.verificationPaymentId,
        },
      });
    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          error: 'User not found',
          message: 'The authenticated user does not exist',
        });
        return;
      }

      if (error.message === 'VERIFICATION_ALREADY_PAID') {
        res.status(409).json({
          error: 'Already paid',
          message: 'You have already paid for verification',
        });
        return;
      }

      res.status(500).json({
        error: 'Verification payment creation failed',
        message: error.message,
      });
    }
  }),

  /**
   * GET /api/payments/verification/status
   * Get verification payment status for current user
   */
  getVerificationPaymentStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to check verification payment status',
      });
      return;
    }

    try {
      // Validate query params
      const validation = GetVerificationPaymentStatusSchema.safeParse(req.query);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      // Use provided userId (admin) or authenticated userId
      const targetUserId = validation.data.userId || req.userId;

      // Authorization check: Only admins can access other users' payment status
      if (targetUserId !== req.userId) {
        if (!req.user || req.user.role !== 'admin') {
          res.status(403).json({
            error: 'Access denied',
            message: 'Only administrators can access payment status for other users',
          });
          return;
        }
      }

      const status = await PaymentService.getVerificationPaymentStatus(targetUserId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get verification payment status',
        message: error.message,
      });
    }
  }),

  // ========================================
  // Legacy methods for backward compatibility
  // ========================================

  /**
   * Legacy createPayment method
   * POST /api/payments/create
   */
  createPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { household_id, amount, type, description } = req.body;

    if (!household_id || !amount || !type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await PaymentService.createPayment(
      household_id,
      req.userId,
      amount,
      type,
      description,
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  getMyPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const payments = await PaymentService.getUserPayments(req.userId);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  }),

  getHouseholdPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.params;

    const payments = await PaymentService.getHouseholdPayments(householdId);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  }),


  /**
   * Legacy splitRent - kept for backward compatibility
   * Use POST /api/payments/split-rent instead
   */
  splitRentLegacy: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.params;

    const result = await PaymentService.splitRentPayment(householdId);

    res.json({
      success: result.success,
      message: result.success ? 'Rent payments created' : result.error,
      count: result.payments.length,
      operationId: result.operationId,
      data: result.payments,
    });
  }),

  getOverduePayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.query;

    const payments = await PaymentService.getOverduePayments(householdId as string);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  }),

  /**
   * Legacy createStripeAccount - kept for backward compatibility
   * Use POST /api/payments/stripe/connect instead
   */
  createHouseholdStripeAccountLegacy: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { householdId } = req.body;

    const accountId = await PaymentService.createHouseholdStripeAccount(req.userId, householdId);

    res.json({
      success: true,
      data: { accountId },
    });
  }),

  getOnboardingLink: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.params;

    const url = await PaymentService.getOnboardingLink(householdId);

    res.json({
      success: true,
      data: { url },
    });
  }),

  /**
   * Legacy refundPayment - kept for backward compatibility
   * Use POST /api/payments/refund instead
   */
  refundPaymentLegacy: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentId } = req.params;
    const { amount } = req.body;

    await PaymentService.refundPayment(paymentId, amount);

    res.json({
      success: true,
      message: 'Payment refunded successfully',
    });
  }),
};

// Export both new and legacy for backward compatibility
export const paymentController = PaymentController;
export default PaymentController;
