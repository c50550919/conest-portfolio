/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Stripe Configuration (Payment Processing & Connect)
 *
 * Purpose: Stripe client initialization and Connect account management
 * Constitution: Principle III (Security - API key management, PCI compliance)
 *
 * Features:
 * - Stripe API v2024 client initialization
 * - Stripe Connect account creation for households
 * - Account onboarding link generation
 * - Webhook signature validation
 *
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Stripe secret key (test: sk_test_*, live: sk_live_*)
 * - STRIPE_WEBHOOK_SECRET: Webhook signing secret (whsec_*)
 * - API_URL: Base API URL for redirect URLs
 *
 * Security:
 * - PCI DSS compliance (Stripe handles card data)
 * - API keys must be kept secret
 * - Webhook signature validation for all events
 * - Test mode vs Live mode separation
 */

import Stripe from 'stripe';
import logger from './logger';

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  logger.warn('STRIPE_WEBHOOK_SECRET is not defined - webhook validation will fail');
}

// Detect test mode vs live mode
const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
if (isTestMode) {
  logger.info('Stripe initialized in TEST MODE');
} else {
  logger.info('Stripe initialized in LIVE MODE');
}

/**
 * Stripe Client Instance
 * Configured for API version 2024-10-28.acacia with TypeScript support
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia' as any,
  typescript: true,
  appInfo: {
    name: 'CoNest/SafeNest',
    version: '1.0.0',
    url: 'https://github.com/yourusername/conest',
  },
});

export default stripe;

/**
 * Stripe Connect Configuration
 */
export const STRIPE_CONNECT_CONFIG = {
  accountType: 'express' as const,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  // Business type for single parent housing platform
  businessType: 'individual' as const,
  // Default country (US)
  country: 'US',
};

/**
 * Create Stripe Connect Account
 *
 * Creates a Stripe Express Connect account for households to receive payments
 *
 * @param email - User's email address
 * @param metadata - Optional metadata for the account
 * @returns Stripe Account object
 *
 * Usage:
 * ```typescript
 * const account = await createConnectedAccount('user@example.com', {
 *   userId: 'user_123',
 *   householdId: 'household_456'
 * });
 * ```
 */
export const createConnectedAccount = async (
  email: string,
  metadata?: Record<string, string>,
): Promise<Stripe.Account> => {
  try {
    const account = await stripe.accounts.create({
      type: STRIPE_CONNECT_CONFIG.accountType,
      email,
      capabilities: STRIPE_CONNECT_CONFIG.capabilities,
      business_type: STRIPE_CONNECT_CONFIG.businessType,
      country: STRIPE_CONNECT_CONFIG.country,
      metadata: metadata || {},
    });

    logger.info(`Created Stripe Connect account: ${account.id} for email: ${email}`);

    return account;
  } catch (error: any) {
    logger.error('Error creating Stripe Connect account:', error);
    throw new Error(`Stripe Connect account creation failed: ${error.message}`);
  }
};

/**
 * Create Account Onboarding Link
 *
 * Generates a Stripe account onboarding link for Express accounts
 *
 * @param accountId - Stripe account ID
 * @param refreshUrl - URL to redirect if link expires
 * @param returnUrl - URL to redirect after onboarding completes
 * @returns Account Link object with URL
 *
 * Usage:
 * ```typescript
 * const link = await createAccountLink(
 *   'acct_123',
 *   'https://api.example.com/api/payments/stripe/refresh',
 *   'https://api.example.com/api/payments/stripe/return'
 * );
 * // Redirect user to: link.url
 * ```
 */
export const createAccountLink = async (
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<Stripe.AccountLink> => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    logger.info(`Created account onboarding link for account: ${accountId}`);

    return accountLink;
  } catch (error: any) {
    logger.error('Error creating account link:', error);
    throw new Error(`Account link creation failed: ${error.message}`);
  }
};

/**
 * Verify Webhook Signature
 *
 * Validates Stripe webhook signature to prevent unauthorized requests
 *
 * @param payload - Raw request body (Buffer or string)
 * @param signature - Stripe-Signature header value
 * @returns Verified Stripe Event object
 * @throws Error if signature is invalid
 *
 * Usage:
 * ```typescript
 * const event = verifyWebhookSignature(req.body, req.headers['stripe-signature']);
 * ```
 */
export const verifyWebhookSignature = (
  payload: Buffer | string,
  signature: string,
): Stripe.Event => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error.message);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Get Stripe Account Details
 *
 * Retrieves details for a Stripe Connect account
 *
 * @param accountId - Stripe account ID
 * @returns Stripe Account object
 */
export const getAccountDetails = async (accountId: string): Promise<Stripe.Account> => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return account;
  } catch (error: any) {
    logger.error(`Error retrieving account ${accountId}:`, error);
    throw new Error(`Account retrieval failed: ${error.message}`);
  }
};

/**
 * Stripe API Configuration Info
 */
export const STRIPE_CONFIG_INFO = {
  apiVersion: '2024-10-28.acacia',
  testMode: isTestMode,
  webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  apiKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8),
};
