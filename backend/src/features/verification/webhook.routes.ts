/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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
