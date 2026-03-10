/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Payment Service (Stripe Connect Integration)
 *
 * Purpose: Stripe payment processing and Connect account management
 * Constitution: Principle III (Security - PCI compliance, no card data storage)
 *              Principle IV (Performance - idempotency keys, optimized queries)
 *
 * Features:
 * - Stripe Connect account creation for households
 * - Payment intent creation with idempotency
 * - Rent splitting among household members
 * - Payment refunds and history
 * - Webhook event handling
 *
 * Security:
 * - PCI DSS compliance (no card data storage)
 * - Webhook signature validation
 * - Idempotency keys for payment intents
 * - Secure payment metadata
 */

import type Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import stripe, { createConnectedAccount, createAccountLink } from '../../config/stripe';
import { PaymentModel, HouseholdModel } from '../../models/Payment';
import { UserModel } from '../../models/User';
import { VerificationPaymentModel } from '../../models/VerificationPayment';
import { VerificationService } from '../verification/verification.service';
import { WebhookEventModel } from '../../models/WebhookEvent';
import {
  PaymentCompensationService,
  SplitRentSagaResult,
  RollbackResult,
  CompensationResult,
} from './paymentCompensation.service';
import logger from '../../config/logger';

// Constants for verification payments
const VERIFICATION_PAYMENT_AMOUNT = 3900; // $39.00 in cents

export interface CreatePaymentIntentParams {
  amount: number;
  householdId: string;
  description: string;
  payerId?: string;
  idempotencyKey?: string;
}

export interface SplitRentParams {
  householdId: string;
  totalAmount: number;
}

export interface RefundParams {
  paymentIntentId: string;
  amount?: number;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  type: string;
  description?: string;
  createdAt: Date;
  paidAt?: Date;
}

export const PaymentService = {
  /**
   * Create Stripe Connected Account for user
   * Used for Stripe Connect integration (household payment collection)
   */
  async createStripeAccount(userId: string): Promise<{ accountId: string; onboardingUrl: string }> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Create Stripe Connected Account
      const account = await createConnectedAccount(user.email);

      // Generate onboarding link
      const accountLink = await createAccountLink(
        account.id,
        `${process.env.API_URL}/api/payments/stripe/refresh`,
        `${process.env.API_URL}/api/payments/stripe/return`,
      );

      logger.info(`Created Stripe account ${account.id} for user ${userId}`);

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error: any) {
      logger.error('Error creating Stripe account:', error);
      throw new Error(`STRIPE_ACCOUNT_CREATION_FAILED: ${error.message}`);
    }
  },

  /**
   * Create Stripe Connected Account for household
   * Legacy method - kept for backward compatibility
   */
  async createHouseholdStripeAccount(userId: string, householdId: string): Promise<string> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const household = await HouseholdModel.findById(householdId);
    if (!household) {
      throw new Error('Household not found');
    }

    // Create Stripe Connected Account
    const account = await createConnectedAccount(user.email);

    // Update household with Stripe account ID
    await HouseholdModel.update(householdId, {
      stripe_account_id: account.id,
    });

    logger.info(`Created Stripe account ${account.id} for household ${householdId}`);

    return account.id;
  },

  /**
   * Generate onboarding link for connected account
   */
  async getOnboardingLink(householdId: string): Promise<string> {
    const household = await HouseholdModel.findById(householdId);
    if (!household?.stripe_account_id) {
      throw new Error('Household Stripe account not found');
    }

    const accountLink = await createAccountLink(
      household.stripe_account_id,
      `${process.env.API_URL}/stripe/refresh`,
      `${process.env.API_URL}/stripe/return`,
    );

    return accountLink.url;
  },

  /**
   * Create Payment Intent
   * Creates a Stripe Payment Intent with idempotency support
   *
   * @param params - Payment intent parameters
   * @returns Payment intent with client secret for frontend
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
  }> {
    try {
      const { amount, householdId, description, payerId, idempotencyKey } = params;

      // Validate amount (must be positive, in cents)
      if (amount <= 0) {
        throw new Error('INVALID_AMOUNT');
      }

      // Verify household exists
      const household = await HouseholdModel.findById(householdId);
      if (!household) {
        throw new Error('HOUSEHOLD_NOT_FOUND');
      }

      // If payerId provided, verify membership
      if (payerId) {
        const members = await HouseholdModel.getMembers(householdId);
        const isMember = members.some((m) => m.user_id === payerId);
        if (!isMember) {
          throw new Error('USER_NOT_HOUSEHOLD_MEMBER');
        }
      }

      // Create Stripe Payment Intent with idempotency
      const createParams: Stripe.PaymentIntentCreateParams = {
        amount,
        currency: 'usd',
        description,
        metadata: {
          household_id: householdId,
          ...(payerId && { payer_id: payerId }),
        },
        // If household has connected account, use it
        ...(household.stripe_account_id && {
          transfer_data: {
            destination: household.stripe_account_id,
          },
        }),
      };

      const paymentIntent = await stripe.paymentIntents.create(
        createParams,
        idempotencyKey ? { idempotencyKey } : undefined,
      );

      logger.info(`Created payment intent ${paymentIntent.id} for household ${householdId}`);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: paymentIntent.amount,
      };
    } catch (error: any) {
      logger.error('Error creating payment intent:', error);
      throw new Error(`PAYMENT_INTENT_CREATION_FAILED: ${error.message}`);
    }
  },

  /**
   * Legacy createPayment method
   * Kept for backward compatibility with existing code
   */
  async createPayment(
    householdId: string,
    payerId: string,
    amount: number,
    type: 'rent' | 'utilities' | 'deposit' | 'other',
    description?: string,
  ): Promise<any> {
    const household = await HouseholdModel.findById(householdId);
    if (!household) {
      throw new Error('Household not found');
    }

    // Verify user is a member of the household
    const members = await HouseholdModel.getMembers(householdId);
    const isMember = members.some((m) => m.user_id === payerId);
    if (!isMember) {
      throw new Error('User is not a member of this household');
    }

    // Create payment record
    const payment = await PaymentModel.createPayment({
      household_id: householdId,
      payer_id: payerId,
      amount,
      type,
      description,
    });

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency: 'usd',
      metadata: {
        payment_id: payment.id,
        household_id: householdId,
        payer_id: payerId,
        type,
      },
      // If household has connected account, use it
      ...(household.stripe_account_id && {
        transfer_data: {
          destination: household.stripe_account_id,
        },
      }),
    });

    // Update payment with Stripe intent ID
    await PaymentModel.updatePayment(payment.id, {
      stripe_payment_intent_id: paymentIntent.id,
      status: 'processing',
    });

    logger.info(`Created payment intent ${paymentIntent.id} for payment ${payment.id}`);

    return {
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  },

  // Process payment (called by webhook or client confirmation)
  async processPayment(paymentIntentId: string): Promise<void> {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const paymentId = paymentIntent.metadata.payment_id;
    if (!paymentId) {
      throw new Error('Payment ID not found in metadata');
    }

    if (paymentIntent.status === 'succeeded') {
      await PaymentModel.updatePayment(paymentId, {
        status: 'completed',
        stripe_charge_id: paymentIntent.latest_charge as string,
      });

      logger.info(`Payment ${paymentId} completed successfully`);
    } else if (paymentIntent.status === 'canceled') {
      await PaymentModel.updatePayment(paymentId, {
        status: 'failed',
      });

      logger.warn(`Payment ${paymentId} failed or was canceled`);
    }
  },

  /**
   * Split Rent Among Household Members
   * Calculates and splits rent payment based on household member shares
   *
   * @param params - Split rent parameters
   * @returns Array of split amounts for each member
   */
  async splitRent(params: SplitRentParams): Promise<
    Array<{
      userId: string;
      amount: number;
      percentage: number;
    }>
  > {
    try {
      const { householdId, totalAmount } = params;

      // Validate amount
      if (totalAmount <= 0) {
        throw new Error('INVALID_AMOUNT');
      }

      // Verify household exists
      const household = await HouseholdModel.findById(householdId);
      if (!household) {
        throw new Error('HOUSEHOLD_NOT_FOUND');
      }

      // Get household members
      const members = await HouseholdModel.getMembers(householdId);
      if (members.length === 0) {
        throw new Error('NO_HOUSEHOLD_MEMBERS');
      }

      // Calculate total rent shares
      const totalShares = members.reduce((sum, member) => sum + member.rent_share, 0);

      if (totalShares <= 0) {
        throw new Error('INVALID_RENT_SHARES');
      }

      // Calculate split amounts
      const splitAmounts = members.map((member) => ({
        userId: member.user_id,
        amount: Math.round((member.rent_share / totalShares) * totalAmount),
        percentage: (member.rent_share / totalShares) * 100,
      }));

      logger.info(`Split rent for household ${householdId}: ${splitAmounts.length} members`);

      return splitAmounts;
    } catch (error: any) {
      logger.error('Error splitting rent:', error);
      throw new Error(`RENT_SPLIT_FAILED: ${error.message}`);
    }
  },

  /**
   * Split Rent Payment with Saga Pattern
   *
   * TASK-W2-02: Uses PaymentCompensationService for atomic operations
   * - Wraps operations in database transaction
   * - Implements Saga pattern with compensation on failure
   * - Provides rollback capability
   *
   * @param householdId - Household ID
   * @returns SplitRentSagaResult with operation details
   */
  async splitRentPayment(householdId: string): Promise<SplitRentSagaResult> {
    return PaymentCompensationService.executeSplitRentSaga(householdId);
  },

  /**
   * Legacy splitRentPayment method (deprecated)
   * Use splitRentPayment with saga pattern instead
   *
   * @deprecated Use splitRentPayment instead
   */
  async splitRentPaymentLegacy(householdId: string): Promise<any[]> {
    const household = await HouseholdModel.findById(householdId);
    if (!household) {
      throw new Error('Household not found');
    }

    const members = await HouseholdModel.getMembers(householdId);
    if (members.length === 0) {
      throw new Error('No members in household');
    }

    // Calculate due date (1st of next month)
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(1);

    // Create payment for each member
    const payments = await Promise.all(
      members.map((member) =>
        PaymentModel.createPayment({
          household_id: householdId,
          payer_id: member.user_id,
          amount: member.rent_share,
          type: 'rent',
          description: `Rent for ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          due_date: dueDate,
        }),
      ),
    );

    logger.info(`Created ${payments.length} rent payments for household ${householdId}`);

    return payments;
  },

  /**
   * Rollback a single payment
   *
   * TASK-W2-02: Cancels or refunds a payment based on its state
   * - Pending/processing: cancels Stripe intent
   * - Completed: refunds the charge
   *
   * @param paymentId - Payment ID to rollback
   * @param reason - Optional reason for rollback
   * @returns RollbackResult
   */
  async rollbackPayment(paymentId: string, reason?: string): Promise<RollbackResult> {
    return PaymentCompensationService.rollbackPayment(paymentId, reason);
  },

  /**
   * Compensate a failed split rent operation
   *
   * TASK-W2-02: Cancels/refunds all payments created as part of the operation
   *
   * @param operationId - Operation ID to compensate
   * @returns CompensationResult
   */
  async compensateFailedSplit(operationId: string): Promise<CompensationResult> {
    return PaymentCompensationService.compensateFailedSplit(operationId);
  },

  /**
   * Get operation status
   *
   * TASK-W2-02: Returns operation details including saga status and compensations
   *
   * @param operationId - Operation ID to query
   */
  async getOperationStatus(operationId: string) {
    return PaymentCompensationService.getOperationStatus(operationId);
  },

  /**
   * Process Refund
   * Creates a refund for a payment intent or charge
   *
   * @param params - Refund parameters
   * @returns Refund ID and status
   */
  async processRefund(params: RefundParams): Promise<{
    refundId: string;
    amount: number;
    status: string;
  }> {
    try {
      const { paymentIntentId, amount } = params;

      // Retrieve payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        throw new Error('PAYMENT_INTENT_NOT_FOUND');
      }

      // Check if payment intent has been charged
      if (!paymentIntent.latest_charge) {
        throw new Error('PAYMENT_NOT_CHARGED');
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount || paymentIntent.amount,
      });

      logger.info(`Created refund ${refund.id} for payment intent ${paymentIntentId}`);

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status as string,
      };
    } catch (error: any) {
      logger.error('Error processing refund:', error);
      throw new Error(`REFUND_FAILED: ${error.message}`);
    }
  },

  /**
   * Legacy refundPayment method
   * Kept for backward compatibility
   */
  async refundPayment(paymentId: string, amount?: number): Promise<void> {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!payment.stripe_charge_id) {
      throw new Error('No charge ID found for this payment');
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      charge: payment.stripe_charge_id,
      amount: amount || payment.amount,
    });

    // Update payment status
    await PaymentModel.updatePayment(paymentId, {
      status: 'refunded',
    });

    logger.info(`Refunded payment ${paymentId}, refund ID: ${refund.id}`);
  },

  /**
   * Get Payment History
   * Retrieves payment history for a specific user
   *
   * @param userId - User ID
   * @returns Array of payment history records
   */
  async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    try {
      const payments = await PaymentModel.findByUser(userId);

      return payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        type: payment.type,
        description: payment.description,
        createdAt: payment.created_at,
        paidAt: payment.paid_at,
      }));
    } catch (error: any) {
      logger.error('Error getting payment history:', error);
      throw new Error(`PAYMENT_HISTORY_FAILED: ${error.message}`);
    }
  },

  /**
   * Legacy getUserPayments method
   * Kept for backward compatibility
   */
  async getUserPayments(userId: string): Promise<any[]> {
    return await PaymentModel.findByUser(userId);
  },

  /**
   * Get payment history for a household
   */
  async getHouseholdPayments(householdId: string): Promise<any[]> {
    return await PaymentModel.findByHousehold(householdId);
  },

  /**
   * Get overdue payments
   */
  async getOverduePayments(householdId?: string): Promise<any[]> {
    return await PaymentModel.getOverduePayments(householdId);
  },

  // ========================================
  // Verification Payment Methods
  // ========================================

  /**
   * Create Verification Payment Intent
   * Creates a $39 payment intent for user verification
   *
   * Flow:
   * 1. Check if user already has a pending/succeeded verification payment
   * 2. Create Stripe PaymentIntent with verification metadata
   * 3. Create VerificationPayment record in database
   * 4. Return client secret for frontend payment flow
   *
   * @param userId - Authenticated user ID
   * @param connectionRequestId - Optional connection request to link payment to
   * @param idempotencyKey - Optional key for duplicate prevention
   */
  async createVerificationPaymentIntent(params: {
    userId: string;
    connectionRequestId?: string;
    idempotencyKey?: string;
  }): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
    verificationPaymentId: string;
  }> {
    const { userId, connectionRequestId } = params;

    // Auto-generate idempotency key if not provided
    // Format: verification_payment_{userId}_{timestamp}_{random}
    const idempotencyKey =
      params.idempotencyKey ||
      `verification_payment_${userId}_${Date.now()}_${uuidv4().slice(0, 8)}`;

    try {
      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check for existing successful verification payment
      const hasExistingPayment = await VerificationPaymentModel.hasSuccessfulPayment(userId);
      if (hasExistingPayment) {
        throw new Error('VERIFICATION_ALREADY_PAID');
      }

      // Create Stripe PaymentIntent with verification metadata and mandatory idempotency key
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: VERIFICATION_PAYMENT_AMOUNT,
          currency: 'usd',
          description: 'CoNest Verification Fee - ID & Background Check',
          metadata: {
            type: 'verification',
            user_id: userId,
            idempotency_key: idempotencyKey,
            ...(connectionRequestId && { connection_request_id: connectionRequestId }),
          },
        },
        { idempotencyKey },
      );

      // Create verification payment record in database
      const verificationPayment = await VerificationPaymentModel.create({
        user_id: userId,
        connection_request_id: connectionRequestId || null,
        amount: VERIFICATION_PAYMENT_AMOUNT,
        stripe_payment_intent_id: paymentIntent.id,
      });

      logger.info(`Created verification payment intent for user ${userId}`, {
        paymentIntentId: paymentIntent.id,
        verificationPaymentId: verificationPayment.id,
        amount: VERIFICATION_PAYMENT_AMOUNT,
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: VERIFICATION_PAYMENT_AMOUNT,
        verificationPaymentId: verificationPayment.id,
      };
    } catch (error: any) {
      logger.error('Error creating verification payment intent:', error);

      if (error.message === 'USER_NOT_FOUND') {
        throw error;
      }
      if (error.message === 'VERIFICATION_ALREADY_PAID') {
        throw error;
      }

      throw new Error(`VERIFICATION_PAYMENT_CREATION_FAILED: ${error.message}`);
    }
  },

  /**
   * Get Verification Payment Status
   * Returns the current verification payment status for a user
   *
   * @param userId - User ID to check
   */
  async getVerificationPaymentStatus(userId: string): Promise<{
    hasPaid: boolean;
    status: 'none' | 'pending' | 'succeeded' | 'failed' | 'refunded';
    payment?: {
      id: string;
      amount: number;
      paidAt: Date | null;
      refundAmount: number;
      refundReason: string | null;
    };
  }> {
    try {
      const payments = await VerificationPaymentModel.findByUserId(userId, 1);
      const latestPayment = payments[0];

      if (!latestPayment) {
        return { hasPaid: false, status: 'none' };
      }

      return {
        hasPaid: latestPayment.status === 'succeeded',
        status: latestPayment.status,
        payment: {
          id: latestPayment.id,
          amount: latestPayment.amount,
          paidAt: latestPayment.paid_at,
          refundAmount: latestPayment.refund_amount,
          refundReason: latestPayment.refund_reason,
        },
      };
    } catch (error: any) {
      logger.error('Error getting verification payment status:', error);
      throw new Error(`VERIFICATION_STATUS_FAILED: ${error.message}`);
    }
  },

  /**
   * Handle Verification Payment Success
   * Called when a verification payment succeeds via webhook
   *
   * Flow:
   * 1. Find verification payment by Stripe PaymentIntent ID
   * 2. Mark payment as succeeded
   * 3. Trigger ID verification flow (user must complete ID first)
   *
   * @param paymentIntentId - Stripe PaymentIntent ID
   */
  async handleVerificationPaymentSuccess(paymentIntentId: string): Promise<void> {
    try {
      // Find verification payment record
      const verificationPayment =
        await VerificationPaymentModel.findByStripePaymentIntentId(paymentIntentId);

      if (!verificationPayment) {
        logger.warn(`No verification payment found for PaymentIntent: ${paymentIntentId}`);
        return;
      }

      // Mark payment as succeeded
      await VerificationPaymentModel.markAsSucceeded(verificationPayment.id);

      logger.info(`Verification payment succeeded for user ${verificationPayment.user_id}`, {
        paymentId: verificationPayment.id,
        paymentIntentId,
      });

      // Note: Background check is triggered AFTER ID verification completes
      // The ID verification webhook will call initiateBackgroundCheck()
      // This ensures we have verified identity before running background check
    } catch (error: any) {
      logger.error('Error handling verification payment success:', error);
      throw error;
    }
  },

  /**
   * Handle Verification Payment Failure
   * Called when a verification payment fails via webhook
   *
   * @param paymentIntentId - Stripe PaymentIntent ID
   */
  async handleVerificationPaymentFailure(paymentIntentId: string): Promise<void> {
    try {
      const verificationPayment =
        await VerificationPaymentModel.findByStripePaymentIntentId(paymentIntentId);

      if (!verificationPayment) {
        logger.warn(`No verification payment found for failed PaymentIntent: ${paymentIntentId}`);
        return;
      }

      await VerificationPaymentModel.markAsFailed(verificationPayment.id);

      logger.info(`Verification payment failed for user ${verificationPayment.user_id}`, {
        paymentId: verificationPayment.id,
        paymentIntentId,
      });
    } catch (error: any) {
      logger.error('Error handling verification payment failure:', error);
      throw error;
    }
  },

  /**
   * Trigger Background Check After Payment
   * Called after successful verification payment AND ID verification
   *
   * @param userId - User ID to run background check for
   */
  async triggerVerificationAfterPayment(userId: string): Promise<void> {
    try {
      // Verify payment exists and is successful
      const hasPayment = await VerificationPaymentModel.hasSuccessfulPayment(userId);
      if (!hasPayment) {
        throw new Error('VERIFICATION_PAYMENT_REQUIRED');
      }

      // Initiate background check via VerificationService
      await VerificationService.initiateBackgroundCheck(userId);

      logger.info(`Background check initiated after payment for user ${userId}`);
    } catch (error: any) {
      logger.error('Error triggering verification after payment:', error);
      throw error;
    }
  },

  /**
   * Webhook Handler for Stripe Events
   * Processes Stripe webhook events with signature validation and deduplication
   *
   * Deduplication:
   * - Checks if event has already been processed
   * - Tracks event processing status in database
   * - Prevents duplicate processing of the same event
   *
   * @param event - Stripe webhook event
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    logger.info(`Received Stripe webhook: ${event.type}`, { eventId: event.id });

    // Check for duplicate events using WebhookEventModel
    const { event: webhookEvent, isNew } = await WebhookEventModel.createOrGet({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as Record<string, unknown>,
    });

    // Skip if event already processed
    if (!isNew && ['completed', 'processing'].includes(webhookEvent.processing_status)) {
      logger.info(`Skipping duplicate webhook event: ${event.id}`);
      await WebhookEventModel.markAsSkipped(webhookEvent.id);
      return;
    }

    // Mark event as processing
    await WebhookEventModel.markAsProcessing(webhookEvent.id);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const succeededIntent = event.data.object;

          // Check if this is a verification payment
          if (succeededIntent.metadata.type === 'verification') {
            await this.handleVerificationPaymentSuccess(succeededIntent.id);
            logger.info(`Verification payment succeeded: ${succeededIntent.id}`);
          } else {
            // Handle regular payment
            await this.processPayment(succeededIntent.id);
            logger.info(`Payment intent succeeded: ${succeededIntent.id}`);
          }
          break;

        case 'payment_intent.payment_failed':
          const paymentIntentFailed = event.data.object;

          // Check if this is a verification payment
          if (paymentIntentFailed.metadata.type === 'verification') {
            await this.handleVerificationPaymentFailure(paymentIntentFailed.id);
            logger.warn(`Verification payment failed: ${paymentIntentFailed.id}`);
          } else {
            // Handle regular payment
            const paymentId = paymentIntentFailed.metadata.payment_id;
            if (paymentId) {
              await PaymentModel.updatePayment(paymentId, { status: 'failed' });
              logger.warn(`Payment failed: ${paymentId}`);
            }
          }
          break;

        case 'payment_intent.canceled':
          const paymentIntentCanceled = event.data.object;

          // Check if this is a verification payment
          if (paymentIntentCanceled.metadata.type === 'verification') {
            await this.handleVerificationPaymentFailure(paymentIntentCanceled.id);
            logger.info(`Verification payment canceled: ${paymentIntentCanceled.id}`);
          } else {
            // Handle regular payment
            const canceledPaymentId = paymentIntentCanceled.metadata.payment_id;
            if (canceledPaymentId) {
              await PaymentModel.updatePayment(canceledPaymentId, { status: 'failed' });
              logger.info(`Payment canceled: ${canceledPaymentId}`);
            }
          }
          break;

        case 'charge.refunded':
          const chargeRefunded = event.data.object;
          logger.info(`Charge refunded: ${chargeRefunded.id}`);
          break;

        case 'account.updated':
          // Handle connected account updates
          const account = event.data.object;
          logger.info(`Connected account updated: ${account.id}`, {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          });
          break;

        case 'account.application.deauthorized':
          // Handle when a user deauthorizes the connected account
          const deauthorizedApp = event.data.object;
          logger.warn(`Account application deauthorized: ${deauthorizedApp.id}`);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      // Mark event as completed
      await WebhookEventModel.markAsCompleted(webhookEvent.id);
    } catch (error: any) {
      // Mark event as failed
      await WebhookEventModel.markAsFailed(webhookEvent.id, error.message);
      logger.error(`Error processing webhook ${event.type}:`, error);
      throw error;
    }
  },
};

export default PaymentService;
