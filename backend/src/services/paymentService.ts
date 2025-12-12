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

import Stripe from 'stripe';
import stripe, { createConnectedAccount, createAccountLink } from '../config/stripe';
import { PaymentModel, HouseholdModel } from '../models/Payment';
import { UserModel } from '../models/User';
import logger from '../config/logger';

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
        const isMember = members.some(m => m.user_id === payerId);
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
    const isMember = members.some(m => m.user_id === payerId);
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
  async splitRent(params: SplitRentParams): Promise<Array<{
    userId: string;
    amount: number;
    percentage: number;
  }>> {
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
      const splitAmounts = members.map(member => ({
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
   * Legacy splitRentPayment method
   * Kept for backward compatibility
   */
  async splitRentPayment(householdId: string): Promise<any[]> {
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
      members.map(member =>
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

      return payments.map(payment => ({
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

  /**
   * Webhook Handler for Stripe Events
   * Processes Stripe webhook events with signature validation
   *
   * @param event - Stripe webhook event
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    logger.info(`Received Stripe webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.processPayment(event.data.object.id);
          logger.info(`Payment intent succeeded: ${event.data.object.id}`);
          break;

        case 'payment_intent.payment_failed':
          const paymentIntentFailed = event.data.object;
          const paymentId = paymentIntentFailed.metadata.payment_id;
          if (paymentId) {
            await PaymentModel.updatePayment(paymentId, { status: 'failed' });
            logger.warn(`Payment failed: ${paymentId}`);
          }
          break;

        case 'payment_intent.canceled':
          const paymentIntentCanceled = event.data.object;
          const canceledPaymentId = paymentIntentCanceled.metadata.payment_id;
          if (canceledPaymentId) {
            await PaymentModel.updatePayment(canceledPaymentId, { status: 'failed' });
            logger.info(`Payment canceled: ${canceledPaymentId}`);
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
    } catch (error: any) {
      logger.error(`Error processing webhook ${event.type}:`, error);
      throw error;
    }
  },
};
