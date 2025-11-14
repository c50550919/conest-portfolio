import { db } from '../config/database';

/**
 * VerificationPayment Model
 *
 * Feature: 003-complete-3-critical (Payment-First Architecture)
 * Constitution Principle III: Secure payment handling with Stripe
 *
 * Purpose: Track verification payments ($39 per connection unlock)
 * Payment Flow: Match → Pay $39 → Background Check → Unlock Connection
 * Refund Policy:
 * - 100% refund if automated_fail (background check fails)
 * - 40% refund if courtesy_30day (user requests within 30 days)
 * - No refund for disputes (Stripe handles directly)
 *
 * Performance Requirements:
 * - Payment creation: <2s (Stripe API)
 * - Status check: <100ms (database query)
 * - Refund processing: <5s (Stripe API)
 */

export interface VerificationPayment {
  id: string;
  user_id: string;
  connection_request_id: string | null;

  // Payment details
  amount: number; // In cents, default $39.00 = 3900
  stripe_payment_intent_id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';

  // Refund tracking
  refund_amount: number; // In cents
  refund_reason: 'automated_fail' | 'dispute' | 'courtesy_30day' | null;
  refunded_at: Date | null;

  // Timestamps
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVerificationPaymentData {
  user_id: string;
  connection_request_id?: string | null;
  amount?: number; // Default 3900 cents ($39.00)
  stripe_payment_intent_id: string;
}

export interface RefundVerificationPaymentData {
  reason: 'automated_fail' | 'dispute' | 'courtesy_30day';
  amount: number; // In cents (3900 for 100%, 1560 for 40%)
}

export const VerificationPaymentModel = {
  /**
   * Create a new verification payment record
   * Called after Stripe PaymentIntent is created
   *
   * @throws Error if user already has pending payment
   * @throws Error if connection_request_id already has payment
   */
  async create(data: CreateVerificationPaymentData): Promise<VerificationPayment> {
    // Check for duplicate pending payments
    if (data.connection_request_id) {
      const existingPayment = await this.findByConnectionRequestId(data.connection_request_id);
      if (existingPayment && existingPayment.status === 'pending') {
        throw new Error('CONNECTION_REQUEST_ALREADY_HAS_PENDING_PAYMENT');
      }
    }

    const paymentData = {
      user_id: data.user_id,
      connection_request_id: data.connection_request_id || null,
      amount: data.amount || 3900,
      stripe_payment_intent_id: data.stripe_payment_intent_id,
      status: 'pending' as const,
      refund_amount: 0,
      refund_reason: null,
      refunded_at: null,
      paid_at: null,
    };

    const [payment] = await db('verification_payments')
      .insert(paymentData)
      .returning('*');

    return payment;
  },

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<VerificationPayment | undefined> {
    return await db('verification_payments')
      .where({ id })
      .first();
  },

  /**
   * Find payment by Stripe PaymentIntent ID
   * Used in webhook processing
   */
  async findByStripePaymentIntentId(
    stripePaymentIntentId: string
  ): Promise<VerificationPayment | undefined> {
    return await db('verification_payments')
      .where({ stripe_payment_intent_id: stripePaymentIntentId })
      .first();
  },

  /**
   * Find payment by connection request ID
   */
  async findByConnectionRequestId(
    connectionRequestId: string
  ): Promise<VerificationPayment | undefined> {
    return await db('verification_payments')
      .where({ connection_request_id: connectionRequestId })
      .first();
  },

  /**
   * Find all payments for a user
   * Ordered by most recent first
   */
  async findByUserId(
    userId: string,
    limit: number = 50
  ): Promise<VerificationPayment[]> {
    return await db('verification_payments')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  /**
   * Update payment status to 'succeeded'
   * Called from Stripe webhook after successful payment
   * Triggers background check initiation
   */
  async markAsSucceeded(id: string): Promise<VerificationPayment> {
    const [payment] = await db('verification_payments')
      .where({ id })
      .update({
        status: 'succeeded',
        paid_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!payment) {
      throw new Error('VERIFICATION_PAYMENT_NOT_FOUND');
    }

    return payment;
  },

  /**
   * Update payment status to 'failed'
   * Called from Stripe webhook on payment failure
   */
  async markAsFailed(id: string): Promise<VerificationPayment> {
    const [payment] = await db('verification_payments')
      .where({ id })
      .update({
        status: 'failed',
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (!payment) {
      throw new Error('VERIFICATION_PAYMENT_NOT_FOUND');
    }

    return payment;
  },

  /**
   * Process refund for a verification payment
   *
   * Refund Policy:
   * - automated_fail: 100% refund (3900 cents = $39.00)
   * - courtesy_30day: 40% refund (1560 cents = $15.60)
   * - dispute: Handled by Stripe directly
   *
   * @throws Error if payment is not in 'succeeded' status
   * @throws Error if refund amount exceeds payment amount
   * @throws Error if already refunded
   */
  async processRefund(
    id: string,
    refundData: RefundVerificationPaymentData
  ): Promise<VerificationPayment> {
    const payment = await this.findById(id);

    if (!payment) {
      throw new Error('VERIFICATION_PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'succeeded') {
      throw new Error('PAYMENT_NOT_SUCCEEDED');
    }

    if (payment.status === 'refunded') {
      throw new Error('PAYMENT_ALREADY_REFUNDED');
    }

    if (refundData.amount > payment.amount) {
      throw new Error('REFUND_AMOUNT_EXCEEDS_PAYMENT');
    }

    const [refundedPayment] = await db('verification_payments')
      .where({ id })
      .update({
        status: 'refunded',
        refund_amount: refundData.amount,
        refund_reason: refundData.reason,
        refunded_at: db.fn.now(),
        updated_at: db.fn.now(),
      })
      .returning('*');

    return refundedPayment;
  },

  /**
   * Get payment statistics for a user
   * Used in admin dashboard and user payment history
   */
  async getPaymentStats(userId: string): Promise<{
    total_payments: number;
    total_amount_paid: number;
    total_refunded: number;
    successful_payments: number;
    failed_payments: number;
  }> {
    const stats = await db('verification_payments')
      .where({ user_id: userId })
      .select(
        db.raw('COUNT(*) as total_payments'),
        db.raw('SUM(CASE WHEN status = \'succeeded\' THEN amount ELSE 0 END) as total_amount_paid'),
        db.raw('SUM(refund_amount) as total_refunded'),
        db.raw('COUNT(CASE WHEN status = \'succeeded\' THEN 1 END) as successful_payments'),
        db.raw('COUNT(CASE WHEN status = \'failed\' THEN 1 END) as failed_payments')
      )
      .first();

    return {
      total_payments: parseInt(stats.total_payments) || 0,
      total_amount_paid: parseInt(stats.total_amount_paid) || 0,
      total_refunded: parseInt(stats.total_refunded) || 0,
      successful_payments: parseInt(stats.successful_payments) || 0,
      failed_payments: parseInt(stats.failed_payments) || 0,
    };
  },

  /**
   * Check if user has any successful payments
   * Used for verification status checks
   */
  async hasSuccessfulPayment(userId: string): Promise<boolean> {
    const payment = await db('verification_payments')
      .where({ user_id: userId, status: 'succeeded' })
      .first();

    return !!payment;
  },

  /**
   * Get payments requiring refund processing
   * Used in admin cron job for automated refunds
   *
   * Criteria:
   * - Status is 'succeeded'
   * - Background check failed (queried via join)
   * - Not yet refunded
   * - Created within last 90 days
   */
  async findPendingRefunds(): Promise<VerificationPayment[]> {
    return await db('verification_payments as vp')
      .join('verifications as v', 'vp.user_id', 'v.user_id')
      .where('vp.status', 'succeeded')
      .where('v.background_check_status', 'rejected')
      .whereNull('vp.refunded_at')
      .where('vp.created_at', '>', db.raw('NOW() - INTERVAL \'90 days\''))
      .select('vp.*')
      .orderBy('vp.created_at', 'asc');
  },
};

/**
 * Model Relations:
 *
 * - belongsTo: User (via user_id)
 * - belongsTo: ConnectionRequest (via connection_request_id, optional)
 * - hasOne: Verification (via user_id → background check status)
 */
