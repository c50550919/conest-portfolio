/**
 * Subscription Model
 *
 * Purpose: Database model for Google Play subscriptions and purchases
 * Constitution: Principle III (Security - receipt validation, fraud prevention)
 *              Principle IV (Performance - indexed queries, optimized lookups)
 *
 * Schema:
 * - id: UUID primary key
 * - user_id: Foreign key to users table
 * - product_id: Google Play product SKU (premium_monthly, success_fee)
 * - purchase_token: Google Play purchase token (for validation)
 * - transaction_id: Google Play transaction ID
 * - status: active, expired, cancelled, refunded
 * - purchase_type: subscription, one_time
 * - expires_at: Subscription expiration timestamp
 * - auto_renewing: Boolean for subscription auto-renewal status
 * - created_at: Purchase timestamp
 * - updated_at: Last update timestamp
 *
 * Indexes:
 * - user_id + status (for active subscription lookup)
 * - purchase_token (for validation)
 * - expires_at (for expiration checking)
 */

import db from '../config/database';

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  purchase_token: string;
  transaction_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'refunded';
  purchase_type: 'subscription' | 'one_time';
  expires_at?: Date;
  auto_renewing?: boolean;
  platform: 'google_play' | 'app_store'; // For future iOS support
  receipt_data?: string; // Encrypted receipt data
  validation_data?: any; // Validation response from Google
  created_at: Date;
  updated_at: Date;
}

export interface CreateSubscriptionData {
  user_id: string;
  product_id: string;
  purchase_token: string;
  transaction_id: string;
  purchase_type: 'subscription' | 'one_time';
  expires_at?: Date;
  auto_renewing?: boolean;
  platform?: 'google_play' | 'app_store';
  receipt_data?: string;
  validation_data?: any;
}

export const SubscriptionModel = {
  /**
   * Create new subscription record
   * Called after successful purchase validation
   */
  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    const [subscription] = await db('subscriptions')
      .insert({
        ...data,
        status: 'active',
        platform: data.platform || 'google_play',
      })
      .returning('*');
    return subscription;
  },

  /**
   * Find subscription by ID
   */
  async findById(id: string): Promise<Subscription | undefined> {
    return await db('subscriptions').where({ id }).first();
  },

  /**
   * Find subscription by purchase token
   * Used for duplicate purchase prevention
   */
  async findByPurchaseToken(purchaseToken: string): Promise<Subscription | undefined> {
    return await db('subscriptions').where({ purchase_token: purchaseToken }).first();
  },

  /**
   * Find active subscription for user
   * Returns the most recent active subscription
   */
  async findActiveSubscription(userId: string): Promise<Subscription | undefined> {
    return await db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .whereIn('product_id', ['premium_monthly']) // Only subscription products
      .orderBy('created_at', 'desc')
      .first();
  },

  /**
   * Find all subscriptions for user
   * Includes expired and cancelled subscriptions
   */
  async findByUserId(userId: string): Promise<Subscription[]> {
    return await db('subscriptions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },

  /**
   * Find all one-time purchases for user
   * Used to check if success fee has been paid
   */
  async findOneTimePurchases(userId: string): Promise<Subscription[]> {
    return await db('subscriptions')
      .where({ user_id: userId, purchase_type: 'one_time' })
      .orderBy('created_at', 'desc');
  },

  /**
   * Check if user has paid success fee
   */
  async hasUserPaidSuccessFee(userId: string): Promise<boolean> {
    const purchase = await db('subscriptions')
      .where({
        user_id: userId,
        product_id: 'success_fee',
        status: 'active',
      })
      .first();
    return !!purchase;
  },

  /**
   * Update subscription status
   * Called when subscription expires, cancels, or renews
   */
  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const [subscription] = await db('subscriptions')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return subscription;
  },

  /**
   * Update subscription by purchase token
   * Used for webhook updates
   */
  async updateByPurchaseToken(
    purchaseToken: string,
    data: Partial<Subscription>
  ): Promise<Subscription> {
    const [subscription] = await db('subscriptions')
      .where({ purchase_token: purchaseToken })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return subscription;
  },

  /**
   * Cancel subscription
   * Marks subscription as cancelled but keeps it active until expiration
   */
  async cancelSubscription(userId: string): Promise<Subscription | null> {
    const activeSubscription = await this.findActiveSubscription(userId);
    if (!activeSubscription) {
      return null;
    }

    const [subscription] = await db('subscriptions')
      .where({ id: activeSubscription.id })
      .update({
        auto_renewing: false,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return subscription;
  },

  /**
   * Expire subscription
   * Called by cron job to check and expire subscriptions
   */
  async expireSubscription(id: string): Promise<Subscription> {
    const [subscription] = await db('subscriptions')
      .where({ id })
      .update({
        status: 'expired',
        auto_renewing: false,
        updated_at: db.fn.now(),
      })
      .returning('*');
    return subscription;
  },

  /**
   * Renew subscription
   * Called when subscription auto-renews
   */
  async renewSubscription(
    userId: string,
    expiresAt: Date,
    validationData?: any
  ): Promise<Subscription | null> {
    const activeSubscription = await this.findActiveSubscription(userId);
    if (!activeSubscription) {
      return null;
    }

    const [subscription] = await db('subscriptions')
      .where({ id: activeSubscription.id })
      .update({
        expires_at: expiresAt,
        auto_renewing: true,
        validation_data: validationData,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return subscription;
  },

  /**
   * Get expiring subscriptions
   * Used by cron job to check subscriptions that are about to expire
   * @param hoursBeforeExpiry - Number of hours before expiration to check (default: 24)
   */
  async getExpiringSubscriptions(hoursBeforeExpiry: number = 24): Promise<Subscription[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setHours(expiryThreshold.getHours() + hoursBeforeExpiry);

    return await db('subscriptions')
      .where({ status: 'active', purchase_type: 'subscription' })
      .where('expires_at', '<=', expiryThreshold)
      .where('expires_at', '>', db.fn.now())
      .orderBy('expires_at', 'asc');
  },

  /**
   * Get expired subscriptions
   * Used by cron job to expire subscriptions
   */
  async getExpiredSubscriptions(): Promise<Subscription[]> {
    return await db('subscriptions')
      .where({ status: 'active', purchase_type: 'subscription' })
      .where('expires_at', '<', db.fn.now())
      .orderBy('expires_at', 'asc');
  },

  /**
   * Get subscription statistics for user
   */
  async getSubscriptionStats(userId: string): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    totalPurchases: number;
  }> {
    const stats = await db('subscriptions')
      .where({ user_id: userId })
      .select(
        db.raw('COUNT(*) as total_subscriptions'),
        db.raw("COUNT(CASE WHEN status = 'active' AND purchase_type = 'subscription' THEN 1 END) as active_subscriptions"),
        db.raw("COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_subscriptions"),
        db.raw("COUNT(CASE WHEN purchase_type = 'one_time' THEN 1 END) as total_purchases")
      )
      .first();

    return {
      totalSubscriptions: parseInt(stats.total_subscriptions, 10),
      activeSubscriptions: parseInt(stats.active_subscriptions, 10),
      expiredSubscriptions: parseInt(stats.expired_subscriptions, 10),
      totalPurchases: parseInt(stats.total_purchases, 10),
    };
  },

  /**
   * Delete subscription (for testing only)
   * Should not be used in production
   */
  async deleteSubscription(id: string): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Delete operation only allowed in test environment');
    }
    await db('subscriptions').where({ id }).delete();
  },
};
