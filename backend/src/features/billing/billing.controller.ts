/**
 * Billing Controller (Mobile In-App Purchases)
 *
 * Purpose: HTTP request handlers for iOS/Android billing operations
 * Constitution: Principle III (Security - receipt validation, fraud prevention)
 *              Principle IV (Performance - <100ms response time)
 *
 * Endpoints:
 * - POST /api/billing/validate-ios - Validate iOS App Store receipt
 * - POST /api/billing/validate - Validate Google Play receipt
 * - POST /api/billing/validate-bundle - Validate bundle purchase (either platform)
 * - GET /api/billing/subscription/status - Get subscription status
 *
 * Security:
 * - JWT authentication for all endpoints
 * - Receipt validation against App Store/Google Play APIs
 * - JWS signature verification for StoreKit 2
 */

import { Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { BillingService } from './billing.service';
import {
  ValidateIOSReceiptSchema,
  ValidateGooglePlayReceiptSchema,
  ValidateBundlePurchaseSchema,
} from '../payments/payment.schemas';

export const BillingController = {
  /**
   * POST /api/billing/validate-ios
   * Validate iOS App Store receipt
   */
  validateIOSReceipt: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to validate a purchase',
      });
      return;
    }

    try {
      // Validate request
      const validation = ValidateIOSReceiptSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { productId, transactionId, originalTransactionId, receipt, signedTransaction } =
        validation.data;

      const result = await BillingService.validateIOSReceipt({
        userId: req.userId,
        productId,
        transactionId,
        originalTransactionId,
        receipt,
        signedTransaction,
      });

      res.status(200).json({
        valid: result.valid,
        productId: result.productId,
        subscription: result.subscription,
        verification: result.verification,
      });
    } catch (error: any) {
      console.error('iOS receipt validation error:', error);

      if (error.message === 'INVALID_RECEIPT') {
        res.status(400).json({
          valid: false,
          error: 'Invalid receipt',
          message: 'The receipt could not be validated with the App Store',
        });
        return;
      }

      if (error.message === 'RECEIPT_ALREADY_USED') {
        res.status(409).json({
          valid: false,
          error: 'Receipt already used',
          message: 'This purchase has already been validated',
        });
        return;
      }

      res.status(500).json({
        valid: false,
        error: 'Validation failed',
        message: error.message,
      });
    }
  }),

  /**
   * POST /api/billing/validate
   * Validate Google Play receipt
   */
  validateGooglePlayReceipt: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to validate a purchase',
      });
      return;
    }

    try {
      // Validate request
      const validation = ValidateGooglePlayReceiptSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { productId, purchaseToken, transactionId, transactionReceipt } = validation.data;

      const result = await BillingService.validateGooglePlayReceipt({
        userId: req.userId,
        productId,
        purchaseToken,
        transactionId,
        transactionReceipt,
      });

      res.status(200).json({
        valid: result.valid,
        productId: result.productId,
        subscription: result.subscription,
        verification: result.verification,
      });
    } catch (error: any) {
      console.error('Google Play receipt validation error:', error);

      if (error.message === 'INVALID_RECEIPT') {
        res.status(400).json({
          valid: false,
          error: 'Invalid receipt',
          message: 'The receipt could not be validated with Google Play',
        });
        return;
      }

      if (error.message === 'RECEIPT_ALREADY_USED') {
        res.status(409).json({
          valid: false,
          error: 'Receipt already used',
          message: 'This purchase has already been validated',
        });
        return;
      }

      res.status(500).json({
        valid: false,
        error: 'Validation failed',
        message: error.message,
      });
    }
  }),

  /**
   * POST /api/billing/validate-bundle
   * Validate bundle purchase (either platform)
   * Activates both verification payment and subscription
   */
  validateBundlePurchase: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to validate a bundle purchase',
      });
      return;
    }

    try {
      // Validate request
      const validation = ValidateBundlePurchaseSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { platform, receipt, productId, transactionId, purchaseToken } = validation.data;

      const result = await BillingService.validateBundlePurchase({
        userId: req.userId,
        platform,
        receipt,
        productId,
        transactionId,
        purchaseToken,
      });

      res.status(200).json({
        valid: result.valid,
        productId: result.productId,
        verification: result.verification,
        subscription: result.subscription,
        message: result.valid
          ? 'Bundle activated: verification payment and 6-month subscription'
          : 'Bundle validation failed',
      });
    } catch (error: any) {
      console.error('Bundle validation error:', error);

      res.status(500).json({
        valid: false,
        error: 'Bundle validation failed',
        message: error.message,
      });
    }
  }),

  /**
   * GET /api/billing/subscription/status
   * Get current subscription status
   */
  getSubscriptionStatus: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to check subscription status',
      });
      return;
    }

    try {
      const status = await BillingService.getSubscriptionStatus(req.userId);

      res.status(200).json({
        isActive: status.isActive,
        expiresAt: status.expiresAt,
        productId: status.productId,
        autoRenewing: status.autoRenewing,
        platform: status.platform,
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);

      res.status(500).json({
        isActive: false,
        error: 'Failed to get subscription status',
        message: error.message,
      });
    }
  }),
};

export default BillingController;
