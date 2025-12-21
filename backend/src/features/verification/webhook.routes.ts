import { Router } from 'express';
import { webhookController } from './webhook.controller';
import express from 'express';

const router = Router();

/**
 * Verification Webhook Routes
 *
 * Security:
 * - Signature verification for each provider
 * - Raw body parsing for signature validation
 * - No authentication required (webhooks use signatures)
 *
 * Providers:
 * - Veriff: ID verification webhooks
 * - Certn: Background check webhooks
 */

// Raw body parsing for webhook signature verification
router.use(express.raw({ type: 'application/json' }));

// Veriff webhooks
router.post('/veriff', webhookController.handleVeriffWebhook);

// Certn webhooks
router.post('/certn', webhookController.handleCertnWebhook);

export default router;
