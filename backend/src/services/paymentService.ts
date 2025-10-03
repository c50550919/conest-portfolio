import stripe, { createConnectedAccount, createAccountLink } from '../config/stripe';
import { PaymentModel, HouseholdModel } from '../models/Payment';
import { UserModel } from '../models/User';
import logger from '../config/logger';

export const PaymentService = {
  // Create Stripe Connected Account for household
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

  // Generate onboarding link for connected account
  async getOnboardingLink(householdId: string): Promise<string> {
    const household = await HouseholdModel.findById(householdId);
    if (!household || !household.stripe_account_id) {
      throw new Error('Household Stripe account not found');
    }

    const accountLink = await createAccountLink(
      household.stripe_account_id,
      `${process.env.API_URL}/stripe/refresh`,
      `${process.env.API_URL}/stripe/return`
    );

    return accountLink.url;
  },

  // Create a payment intent
  async createPayment(
    householdId: string,
    payerId: string,
    amount: number,
    type: 'rent' | 'utilities' | 'deposit' | 'other',
    description?: string
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

  // Split rent payment among household members
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
        })
      )
    );

    logger.info(`Created ${payments.length} rent payments for household ${householdId}`);

    return payments;
  },

  // Refund a payment
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

  // Get payment history for a user
  async getUserPayments(userId: string): Promise<any[]> {
    return await PaymentModel.findByUser(userId);
  },

  // Get payment history for a household
  async getHouseholdPayments(householdId: string): Promise<any[]> {
    return await PaymentModel.findByHousehold(householdId);
  },

  // Get overdue payments
  async getOverduePayments(householdId?: string): Promise<any[]> {
    return await PaymentModel.getOverduePayments(householdId);
  },

  // Webhook handler for Stripe events
  async handleStripeWebhook(event: any): Promise<void> {
    logger.info(`Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.processPayment(event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        const paymentId = event.data.object.metadata.payment_id;
        if (paymentId) {
          await PaymentModel.updatePayment(paymentId, { status: 'failed' });
        }
        break;

      case 'account.updated':
        // Handle connected account updates
        logger.info('Connected account updated:', event.data.object.id);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  },
};
