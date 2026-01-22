/**
 * Billing Routes (Mobile In-App Purchases)
 *
 * Purpose: Route definitions for iOS/Android billing endpoints
 * Constitution: Principle III (Security - authenticated endpoints)
 *
 * Routes:
 * - POST /api/billing/validate-ios - Validate iOS App Store receipt
 * - POST /api/billing/validate - Validate Google Play receipt
 * - POST /api/billing/validate-bundle - Validate bundle purchase
 * - GET /api/billing/subscription/status - Get subscription status
 */

import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All billing routes require authentication
router.use(authenticate);

/**
 * POST /api/billing/validate-ios
 * Validate iOS App Store receipt (StoreKit 2 JWS format)
 */
router.post('/validate-ios', BillingController.validateIOSReceipt);

/**
 * POST /api/billing/validate
 * Validate Google Play receipt
 */
router.post('/validate', BillingController.validateGooglePlayReceipt);

/**
 * POST /api/billing/validate-bundle
 * Validate bundle purchase (either platform)
 * Activates verification + 6-month subscription
 */
router.post('/validate-bundle', BillingController.validateBundlePurchase);

/**
 * GET /api/billing/subscription/status
 * Get current subscription status for authenticated user
 */
router.get('/subscription/status', BillingController.getSubscriptionStatus);

export default router;
