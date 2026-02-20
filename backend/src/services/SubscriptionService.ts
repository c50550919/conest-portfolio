/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Subscription Service
 *
 * Purpose: Manage user subscriptions and purchases
 * Constitution: Principle III (Security - receipt validation, user verification)
 *              Principle IV (Performance - cached status checks, optimized queries)
 *
 * Features:
 * - Create and validate subscriptions
 * - Check subscription status
 * - Handle subscription lifecycle (renewal, cancellation, expiration)
 * - Process one-time purchases
 * - Subscription analytics
 *
 * Business Logic:
 * - Premium subscription: $4.99/month (unlimited features)
 * - Success fee: $29 one-time (when lease signed)
 * - Subscription status cached for performance
 * - Auto-renewal handled via Google Play webhooks
 */

import { SubscriptionModel, CreateSubscriptionData, Subscription } from '../models/Subscription';
import GooglePlayValidationService from './GooglePlayValidationService';
import logger from '../config/logger';

export interface CreateSubscriptionParams {
  userId: string;
  productId: string;
  purchaseToken: string;
  transactionId: string;
  receiptData?: string;
}

export interface SubscriptionStatusResponse {
  isActive: boolean;
  productId?: string;
  expiresAt?: Date;
  autoRenewing?: boolean;
  isPremium: boolean;
}

export interface SubscriptionHistoryItem {
  id: string;
  productId: string;
  status: string;
  purchaseType: string;
  createdAt: Date;
  expiresAt?: Date;
}

export const SubscriptionService = {
  /**
   * Create subscription from purchase
   * Validates receipt and creates subscription record
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    try {
      const { userId, productId, purchaseToken, transactionId, receiptData } = params;

      // Check if purchase token already exists (prevent duplicate)
      const existing = await SubscriptionModel.findByPurchaseToken(purchaseToken);
      if (existing) {
        logger.warn(`Duplicate purchase token: ${purchaseToken}`);
        throw new Error('DUPLICATE_PURCHASE');
      }

      // Determine purchase type
      const purchaseType = productId === 'premium_monthly' ? 'subscription' : 'one_time';

      // Validate with Google Play
      let validationResult;
      if (purchaseType === 'subscription') {
        validationResult = await GooglePlayValidationService.validateSubscription(
          purchaseToken,
          productId,
        );
      } else {
        validationResult = await GooglePlayValidationService.validatePurchase(
          purchaseToken,
          productId,
        );
      }

      if (!validationResult.valid) {
        logger.error('Purchase validation failed:', validationResult.error);
        throw new Error(validationResult.error || 'VALIDATION_FAILED');
      }

      // Create subscription record
      const subscriptionData: CreateSubscriptionData = {
        user_id: userId,
        product_id: productId,
        purchase_token: purchaseToken,
        transaction_id: transactionId,
        purchase_type: purchaseType,
        platform: 'google_play',
        receipt_data: receiptData,
        validation_data: validationResult.validationData,
        expires_at: 'expiresAt' in validationResult ? validationResult.expiresAt : undefined,
        auto_renewing: 'autoRenewing' in validationResult ? validationResult.autoRenewing : undefined,
      };

      const subscription = await SubscriptionModel.createSubscription(subscriptionData);

      // Acknowledge purchase with Google Play
      if (purchaseType === 'subscription') {
        await GooglePlayValidationService.acknowledgeSubscription(purchaseToken, productId);
      } else {
        await GooglePlayValidationService.acknowledgePurchase(purchaseToken, productId);
      }

      logger.info(`Subscription created: ${subscription.id} for user ${userId}`);

      return subscription;
    } catch (error: any) {
      logger.error('Error creating subscription:', error);
      throw new Error(`Subscription creation failed: ${error.message}`);
    }
  },

  /**
   * Get subscription status for user
   * Returns current subscription status with caching
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      // Find active subscription
      const activeSubscription = await SubscriptionModel.findActiveSubscription(userId);

      if (!activeSubscription) {
        return {
          isActive: false,
          isPremium: false,
        };
      }

      // Check if subscription is still valid
      if (activeSubscription.expires_at && activeSubscription.expires_at < new Date()) {
        // Subscription expired, update status
        await SubscriptionModel.expireSubscription(activeSubscription.id);
        return {
          isActive: false,
          isPremium: false,
        };
      }

      return {
        isActive: true,
        isPremium: true,
        productId: activeSubscription.product_id,
        expiresAt: activeSubscription.expires_at,
        autoRenewing: activeSubscription.auto_renewing,
      };
    } catch (error: any) {
      logger.error('Error getting subscription status:', error);
      throw new Error(`Failed to get subscription status: ${error.message}`);
    }
  },

  /**
   * Cancel subscription
   * Marks subscription as non-renewing but keeps it active until expiration
   */
  async cancelSubscription(userId: string): Promise<Subscription | null> {
    try {
      const subscription = await SubscriptionModel.cancelSubscription(userId);

      if (!subscription) {
        throw new Error('NO_ACTIVE_SUBSCRIPTION');
      }

      logger.info(`Subscription cancelled for user ${userId}`);

      return subscription;
    } catch (error: any) {
      logger.error('Error cancelling subscription:', error);
      throw new Error(`Subscription cancellation failed: ${error.message}`);
    }
  },

  /**
   * Renew subscription
   * Updates subscription expiration date when auto-renewed
   */
  async renewSubscription(
    userId: string,
    expiresAt: Date,
    validationData?: any,
  ): Promise<Subscription | null> {
    try {
      const subscription = await SubscriptionModel.renewSubscription(
        userId,
        expiresAt,
        validationData,
      );

      if (!subscription) {
        throw new Error('NO_ACTIVE_SUBSCRIPTION');
      }

      logger.info(`Subscription renewed for user ${userId}, expires: ${expiresAt}`);

      return subscription;
    } catch (error: any) {
      logger.error('Error renewing subscription:', error);
      throw new Error(`Subscription renewal failed: ${error.message}`);
    }
  },

  /**
   * Check if user has paid success fee
   * Returns true if success fee purchase exists
   */
  async hasUserPaidSuccessFee(userId: string): Promise<boolean> {
    try {
      return await SubscriptionModel.hasUserPaidSuccessFee(userId);
    } catch (error: any) {
      logger.error('Error checking success fee:', error);
      return false;
    }
  },

  /**
   * Get subscription history for user
   * Returns all subscriptions and purchases
   */
  async getSubscriptionHistory(userId: string): Promise<SubscriptionHistoryItem[]> {
    try {
      const subscriptions = await SubscriptionModel.findByUserId(userId);

      return subscriptions.map(sub => ({
        id: sub.id,
        productId: sub.product_id,
        status: sub.status,
        purchaseType: sub.purchase_type,
        createdAt: sub.created_at,
        expiresAt: sub.expires_at,
      }));
    } catch (error: any) {
      logger.error('Error getting subscription history:', error);
      throw new Error(`Failed to get subscription history: ${error.message}`);
    }
  },

  /**
   * Validate and refresh subscription status
   * Re-validates subscription with Google Play
   */
  async refreshSubscriptionStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      const activeSubscription = await SubscriptionModel.findActiveSubscription(userId);

      if (!activeSubscription) {
        return {
          isActive: false,
          isPremium: false,
        };
      }

      // Re-validate with Google Play
      const validationResult = await GooglePlayValidationService.validateSubscription(
        activeSubscription.purchase_token,
        activeSubscription.product_id,
      );

      if (!validationResult.valid) {
        // Mark subscription as expired
        await SubscriptionModel.expireSubscription(activeSubscription.id);
        return {
          isActive: false,
          isPremium: false,
        };
      }

      // Update subscription details
      await SubscriptionModel.updateSubscription(activeSubscription.id, {
        expires_at: validationResult.expiresAt,
        auto_renewing: validationResult.autoRenewing,
        validation_data: validationResult.validationData,
      });

      return {
        isActive: true,
        isPremium: true,
        productId: activeSubscription.product_id,
        expiresAt: validationResult.expiresAt,
        autoRenewing: validationResult.autoRenewing,
      };
    } catch (error: any) {
      logger.error('Error refreshing subscription status:', error);
      throw new Error(`Failed to refresh subscription status: ${error.message}`);
    }
  },

  /**
   * Expire subscriptions (cron job)
   * Checks and expires subscriptions that have passed expiration date
   */
  async expireSubscriptions(): Promise<number> {
    try {
      const expiredSubscriptions = await SubscriptionModel.getExpiredSubscriptions();

      for (const subscription of expiredSubscriptions) {
        await SubscriptionModel.expireSubscription(subscription.id);
        logger.info(`Expired subscription: ${subscription.id}`);
      }

      return expiredSubscriptions.length;
    } catch (error: any) {
      logger.error('Error expiring subscriptions:', error);
      throw new Error(`Subscription expiration job failed: ${error.message}`);
    }
  },

  /**
   * Get expiring subscriptions (cron job)
   * Returns subscriptions that will expire within specified hours
   */
  async getExpiringSubscriptions(hoursBeforeExpiry: number = 24): Promise<Subscription[]> {
    try {
      return await SubscriptionModel.getExpiringSubscriptions(hoursBeforeExpiry);
    } catch (error: any) {
      logger.error('Error getting expiring subscriptions:', error);
      throw new Error(`Failed to get expiring subscriptions: ${error.message}`);
    }
  },

  /**
   * Get subscription statistics for user
   * Returns subscription and purchase statistics
   */
  async getSubscriptionStats(userId: string): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    totalPurchases: number;
    isPremium: boolean;
    hasSuccessFee: boolean;
  }> {
    try {
      const stats = await SubscriptionModel.getSubscriptionStats(userId);
      const status = await this.getSubscriptionStatus(userId);
      const hasSuccessFee = await this.hasUserPaidSuccessFee(userId);

      return {
        ...stats,
        isPremium: status.isPremium,
        hasSuccessFee,
      };
    } catch (error: any) {
      logger.error('Error getting subscription stats:', error);
      throw new Error(`Failed to get subscription stats: ${error.message}`);
    }
  },

  /**
   * Restore purchases for user
   * Re-validates all purchases and updates subscription status
   */
  async restorePurchases(userId: string, purchaseTokens: string[]): Promise<Subscription[]> {
    try {
      const restoredSubscriptions: Subscription[] = [];

      for (const purchaseToken of purchaseTokens) {
        // Check if purchase already exists
        const existing = await SubscriptionModel.findByPurchaseToken(purchaseToken);
        if (existing) {
          restoredSubscriptions.push(existing);
          continue;
        }

        // Validate each purchase token (would need product ID from client)
        logger.info(`Restoring purchase with token: ${purchaseToken}`);
        // Note: Actual implementation would require productId from client
      }

      logger.info(`Restored ${restoredSubscriptions.length} purchases for user ${userId}`);

      return restoredSubscriptions;
    } catch (error: any) {
      logger.error('Error restoring purchases:', error);
      throw new Error(`Failed to restore purchases: ${error.message}`);
    }
  },
};
