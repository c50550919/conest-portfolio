/**
 * Payment Routes (Stripe Integration)
 *
 * Purpose: HTTP routing for payment-related endpoints
 * Constitution: Principle III (Security - JWT auth, webhook validation, rate limiting)
 *              Principle IV (Performance - rate limiting for fraud prevention)
 *
 * New Endpoints (with Zod validation):
 * - POST /api/payments/stripe/connect - Create Stripe Connect account
 * - POST /api/payments/intents - Create payment intent
 * - POST /api/payments/split-rent - Split rent among household members
 * - POST /api/payments/refund - Process refund
 * - GET /api/payments/history - Get payment history
 *
 * Webhook Endpoint (no auth):
 * - POST /api/stripe/webhook - Handle Stripe webhooks (signature validation)
 *
 * Legacy Endpoints (backward compatibility):
 * - POST /api/payments/create
 * - GET /api/payments/my-payments
 * - GET /api/payments/household/:householdId
 * - GET /api/payments/overdue
 * - POST /api/payments/:paymentId/refund
 * - POST /api/payments/household/:householdId/split-rent
 * - POST /api/payments/stripe/create-account
 * - GET /api/payments/stripe/onboarding/:householdId
 *
 * Security:
 * - JWT authentication for all endpoints except webhook
 * - Rate limiting (10 requests/hour for payment operations)
 * - Zod validation for all new endpoints
 */

import { Router } from 'express';
import { PaymentController, paymentController } from './payment.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { paymentLimiter } from '../../middleware/rateLimit';

const router = Router();

// ========================================
// Stripe Webhook Endpoint (No Authentication)
// ========================================

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 *
 * Auth: None (signature validation instead)
 * Rate Limit: None (Stripe controls rate)
 * Security: Webhook signature validation
 *
 * IMPORTANT: This endpoint must be mounted BEFORE authentication middleware
 * and should use raw body parsing for signature verification
 */
export const stripeWebhookRouter = Router();
stripeWebhookRouter.post('/webhook', PaymentController.handleWebhook);

// ========================================
// New Endpoints with Zod Validation
// ========================================

/**
 * POST /api/payments/stripe/connect
 * Create Stripe Connect account for authenticated user
 *
 * Auth: Required (JWT)
 * Rate Limit: 10 req/hour
 * Validation: CreateStripeAccountSchema
 */
router.post(
  '/stripe/connect',
  authenticateToken,
  paymentLimiter,
  PaymentController.createStripeAccount,
);

/**
 * POST /api/payments/intents
 * Create payment intent with idempotency support
 *
 * Auth: Required (JWT)
 * Rate Limit: 10 req/hour
 * Validation: CreatePaymentIntentSchema
 */
router.post(
  '/intents',
  authenticateToken,
  paymentLimiter,
  PaymentController.createPaymentIntent,
);

/**
 * POST /api/payments/split-rent
 * Split rent among household members
 *
 * Auth: Required (JWT)
 * Rate Limit: 10 req/hour
 * Validation: SplitRentSchema
 */
router.post(
  '/split-rent',
  authenticateToken,
  paymentLimiter,
  PaymentController.splitRent,
);

/**
 * POST /api/payments/refund
 * Process refund for a payment intent
 *
 * Auth: Required (JWT)
 * Rate Limit: 10 req/hour
 * Validation: RefundSchema
 */
router.post(
  '/refund',
  authenticateToken,
  paymentLimiter,
  PaymentController.processRefund,
);

/**
 * GET /api/payments/history
 * Get payment history for authenticated user
 *
 * Auth: Required (JWT)
 * Validation: GetPaymentHistorySchema (query params)
 */
router.get(
  '/history',
  authenticateToken,
  PaymentController.getPaymentHistory,
);

// ========================================
// Legacy Endpoints (Backward Compatibility)
// ========================================

/**
 * POST /api/payments/create
 * Legacy payment creation endpoint
 */
router.post('/create', authenticateToken, paymentLimiter, paymentController.createPayment);

/**
 * GET /api/payments/my-payments
 * Legacy get user payments endpoint
 */
router.get('/my-payments', authenticateToken, paymentController.getMyPayments);

/**
 * GET /api/payments/household/:householdId
 * Legacy get household payments endpoint
 */
router.get('/household/:householdId', authenticateToken, paymentController.getHouseholdPayments);

/**
 * GET /api/payments/overdue
 * Get overdue payments
 */
router.get('/overdue', authenticateToken, paymentController.getOverduePayments);

/**
 * POST /api/payments/:paymentId/refund
 * Legacy refund endpoint
 */
router.post('/:paymentId/refund', authenticateToken, paymentLimiter, paymentController.refundPaymentLegacy);

/**
 * POST /api/payments/household/:householdId/split-rent
 * Legacy split rent endpoint
 */
router.post('/household/:householdId/split-rent', authenticateToken, paymentLimiter, paymentController.splitRentLegacy);

/**
 * POST /api/payments/stripe/create-account
 * Legacy Stripe account creation endpoint
 */
router.post('/stripe/create-account', authenticateToken, paymentLimiter, paymentController.createHouseholdStripeAccountLegacy);

/**
 * GET /api/payments/stripe/onboarding/:householdId
 * Get Stripe onboarding link
 */
router.get('/stripe/onboarding/:householdId', authenticateToken, paymentController.getOnboardingLink);

export default router;
