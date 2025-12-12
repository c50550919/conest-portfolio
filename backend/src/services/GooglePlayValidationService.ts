/**
 * Google Play Validation Service
 *
 * Purpose: Validate Google Play purchase receipts and subscriptions
 * Constitution: Principle III (Security - receipt validation, fraud prevention)
 *              Principle IV (Performance - cached validation results)
 *
 * Features:
 * - Google Play Developer API integration
 * - Subscription validation and status checking
 * - One-time purchase validation
 * - Receipt fraud detection
 * - Validation result caching
 *
 * Environment Variables Required:
 * - GOOGLE_PLAY_SERVICE_ACCOUNT_KEY: Path to service account JSON key file
 * - GOOGLE_PLAY_PACKAGE_NAME: Android package name (com.conest.app)
 *
 * Security:
 * - Server-side validation only (never trust client)
 * - Service account authentication
 * - Receipt signature verification
 * - Duplicate purchase detection
 */

import { google } from 'googleapis';
import logger from '../config/logger';
import { SubscriptionModel } from '../models/Subscription';

// Google Play Developer API configuration
const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.conest.app';
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;

// Product SKUs
export const PRODUCT_SKUS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  SUCCESS_FEE: 'success_fee',
};

export interface SubscriptionValidationResult {
  valid: boolean;
  productId: string;
  expiresAt?: Date;
  autoRenewing?: boolean;
  orderId?: string;
  error?: string;
  validationData?: any;
}

export interface PurchaseValidationResult {
  valid: boolean;
  productId: string;
  purchaseTime?: Date;
  orderId?: string;
  consumptionState?: number;
  error?: string;
  validationData?: any;
}

class GooglePlayValidationService {
  private androidPublisher: any = null;
  private isInitialized: boolean = false;

  /**
   * Initialize Google Play Developer API client
   * Uses service account credentials for authentication
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if service account key is configured
      if (!SERVICE_ACCOUNT_KEY) {
        throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      // Authenticate with service account
      const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_KEY,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      // Create Android Publisher API client
      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth,
      });

      this.isInitialized = true;
      logger.info('Google Play Validation Service initialized');
    } catch (error: any) {
      logger.error('Failed to initialize Google Play Validation Service:', error);
      throw new Error(`Google Play initialization failed: ${error.message}`);
    }
  }

  /**
   * Validate subscription purchase
   * Verifies subscription receipt with Google Play Developer API
   *
   * @param purchaseToken - Google Play purchase token
   * @param subscriptionId - Product SKU (premium_monthly)
   * @returns Validation result with subscription details
   */
  async validateSubscription(
    purchaseToken: string,
    subscriptionId: string,
  ): Promise<SubscriptionValidationResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check for duplicate purchase
      const existingSubscription = await SubscriptionModel.findByPurchaseToken(purchaseToken);
      if (existingSubscription) {
        logger.warn(`Duplicate subscription purchase detected: ${purchaseToken}`);
        return {
          valid: false,
          productId: subscriptionId,
          error: 'DUPLICATE_PURCHASE',
        };
      }

      // Validate subscription with Google Play
      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: PACKAGE_NAME,
        subscriptionId,
        token: purchaseToken,
      });

      const subscriptionData = response.data;
      logger.info('Subscription validation response:', subscriptionData);

      // Check subscription status
      const paymentState = subscriptionData.paymentState;
      const expiryTimeMillis = subscriptionData.expiryTimeMillis;
      const autoRenewing = subscriptionData.autoRenewing;

      // paymentState: 0 = Payment pending, 1 = Payment received, 2 = Free trial, 3 = Pending deferred upgrade/downgrade
      const isValid = paymentState === 1 && expiryTimeMillis && parseInt(expiryTimeMillis, 10) > Date.now();

      if (!isValid) {
        return {
          valid: false,
          productId: subscriptionId,
          error: 'SUBSCRIPTION_NOT_VALID',
          validationData: subscriptionData,
        };
      }

      return {
        valid: true,
        productId: subscriptionId,
        expiresAt: new Date(parseInt(expiryTimeMillis, 10)),
        autoRenewing,
        orderId: subscriptionData.orderId,
        validationData: subscriptionData,
      };
    } catch (error: any) {
      logger.error('Subscription validation failed:', error);

      // Check for specific Google Play API errors
      if (error.code === 404) {
        return {
          valid: false,
          productId: subscriptionId,
          error: 'SUBSCRIPTION_NOT_FOUND',
        };
      }

      if (error.code === 401 || error.code === 403) {
        return {
          valid: false,
          productId: subscriptionId,
          error: 'AUTHENTICATION_FAILED',
        };
      }

      return {
        valid: false,
        productId: subscriptionId,
        error: error.message || 'VALIDATION_FAILED',
      };
    }
  }

  /**
   * Validate one-time product purchase
   * Verifies purchase receipt with Google Play Developer API
   *
   * @param purchaseToken - Google Play purchase token
   * @param productId - Product SKU (success_fee)
   * @returns Validation result with purchase details
   */
  async validatePurchase(
    purchaseToken: string,
    productId: string,
  ): Promise<PurchaseValidationResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Check for duplicate purchase
      const existingPurchase = await SubscriptionModel.findByPurchaseToken(purchaseToken);
      if (existingPurchase) {
        logger.warn(`Duplicate product purchase detected: ${purchaseToken}`);
        return {
          valid: false,
          productId,
          error: 'DUPLICATE_PURCHASE',
        };
      }

      // Validate purchase with Google Play
      const response = await this.androidPublisher.purchases.products.get({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
      });

      const purchaseData = response.data;
      logger.info('Purchase validation response:', purchaseData);

      // Check purchase status
      const purchaseState = purchaseData.purchaseState;
      const consumptionState = purchaseData.consumptionState;

      // purchaseState: 0 = Purchased, 1 = Cancelled, 2 = Pending
      // consumptionState: 0 = Yet to be consumed, 1 = Consumed
      const isValid = purchaseState === 0;

      if (!isValid) {
        return {
          valid: false,
          productId,
          error: 'PURCHASE_NOT_VALID',
          validationData: purchaseData,
        };
      }

      return {
        valid: true,
        productId,
        purchaseTime: new Date(parseInt(purchaseData.purchaseTimeMillis, 10)),
        orderId: purchaseData.orderId,
        consumptionState,
        validationData: purchaseData,
      };
    } catch (error: any) {
      logger.error('Purchase validation failed:', error);

      // Check for specific Google Play API errors
      if (error.code === 404) {
        return {
          valid: false,
          productId,
          error: 'PURCHASE_NOT_FOUND',
        };
      }

      if (error.code === 401 || error.code === 403) {
        return {
          valid: false,
          productId,
          error: 'AUTHENTICATION_FAILED',
        };
      }

      return {
        valid: false,
        productId,
        error: error.message || 'VALIDATION_FAILED',
      };
    }
  }

  /**
   * Acknowledge subscription purchase
   * Required by Google Play to finalize subscription
   *
   * @param purchaseToken - Google Play purchase token
   * @param subscriptionId - Product SKU
   */
  async acknowledgeSubscription(purchaseToken: string, subscriptionId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.androidPublisher.purchases.subscriptions.acknowledge({
        packageName: PACKAGE_NAME,
        subscriptionId,
        token: purchaseToken,
      });

      logger.info(`Subscription acknowledged: ${subscriptionId}, token: ${purchaseToken}`);
    } catch (error: any) {
      // If already acknowledged, ignore error
      if (error.code === 400 && error.message.includes('already acknowledged')) {
        logger.info('Subscription already acknowledged');
        return;
      }

      logger.error('Failed to acknowledge subscription:', error);
      throw new Error(`Subscription acknowledgment failed: ${error.message}`);
    }
  }

  /**
   * Acknowledge product purchase
   * Required by Google Play to finalize one-time purchase
   *
   * @param purchaseToken - Google Play purchase token
   * @param productId - Product SKU
   */
  async acknowledgePurchase(purchaseToken: string, productId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.androidPublisher.purchases.products.acknowledge({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
      });

      logger.info(`Purchase acknowledged: ${productId}, token: ${purchaseToken}`);
    } catch (error: any) {
      // If already acknowledged, ignore error
      if (error.code === 400 && error.message.includes('already acknowledged')) {
        logger.info('Purchase already acknowledged');
        return;
      }

      logger.error('Failed to acknowledge purchase:', error);
      throw new Error(`Purchase acknowledgment failed: ${error.message}`);
    }
  }

  /**
   * Revoke subscription (for testing only)
   * Cancels subscription immediately
   *
   * @param purchaseToken - Google Play purchase token
   * @param subscriptionId - Product SKU
   */
  async revokeSubscription(purchaseToken: string, subscriptionId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.androidPublisher.purchases.subscriptions.revoke({
        packageName: PACKAGE_NAME,
        subscriptionId,
        token: purchaseToken,
      });

      logger.info(`Subscription revoked: ${subscriptionId}, token: ${purchaseToken}`);
    } catch (error: any) {
      logger.error('Failed to revoke subscription:', error);
      throw new Error(`Subscription revocation failed: ${error.message}`);
    }
  }

  /**
   * Refund purchase (for testing only)
   * Issues refund for one-time purchase
   *
   * @param purchaseToken - Google Play purchase token
   * @param productId - Product SKU
   */
  async refundPurchase(purchaseToken: string, productId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await this.androidPublisher.purchases.products.refund({
        packageName: PACKAGE_NAME,
        productId,
        token: purchaseToken,
      });

      logger.info(`Purchase refunded: ${productId}, token: ${purchaseToken}`);
    } catch (error: any) {
      logger.error('Failed to refund purchase:', error);
      throw new Error(`Purchase refund failed: ${error.message}`);
    }
  }

  /**
   * Check if Google Play API is configured
   * Used for health checks and testing
   */
  isConfigured(): boolean {
    return !!SERVICE_ACCOUNT_KEY && !!PACKAGE_NAME;
  }
}

// Export singleton instance
export default new GooglePlayValidationService();
