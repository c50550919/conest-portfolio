import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import stripe from '../config/stripe';

export const paymentController = {
  createPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { household_id, amount, type, description } = req.body;

    if (!household_id || !amount || !type) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await PaymentService.createPayment(
      household_id,
      req.userId,
      amount,
      type,
      description
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  }),

  getMyPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const payments = await PaymentService.getUserPayments(req.userId);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  }),

  getHouseholdPayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.params;

    const payments = await PaymentService.getHouseholdPayments(householdId);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  }),

  refundPayment: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentId } = req.params;
    const { amount } = req.body;

    await PaymentService.refundPayment(paymentId, amount);

    res.json({
      success: true,
      message: 'Payment refunded successfully',
    });
  }),

  splitRent: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.params;

    const payments = await PaymentService.splitRentPayment(householdId);

    res.json({
      success: true,
      message: 'Rent payments created',
      count: payments.length,
      data: payments,
    });
  }),

  getOverduePayments: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.query;

    const payments = await PaymentService.getOverduePayments(householdId as string);

    res.json({
      success: true,
      count: payments.length,
      data: payments,
    });
  }),

  createStripeAccount: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { householdId } = req.body;

    const accountId = await PaymentService.createHouseholdStripeAccount(req.userId, householdId);

    res.json({
      success: true,
      data: { accountId },
    });
  }),

  getOnboardingLink: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { householdId } = req.params;

    const url = await PaymentService.getOnboardingLink(householdId);

    res.json({
      success: true,
      data: { url },
    });
  }),

  handleWebhook: asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      res.status(400).json({ error: 'No signature' });
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }

    await PaymentService.handleStripeWebhook(event);

    res.json({ received: true });
  }),
};
