import { Request, Response } from 'express';
import logger from '../../config/logger';
import { VerificationService } from './verification.service';
import VeriffClient from './veriff/VeriffClient';
import CertnClient from './certn/CertnClient';
import { VerificationModel } from '../../models/Verification';
import { VerificationWebhookEventModel } from '../../models/VerificationWebhookEvent';

/**
 * Webhook Controller
 *
 * Handles asynchronous verification results from external providers
 *
 * Security:
 * - Signature verification for each provider
 * - Idempotency handling for duplicate webhooks
 * - Error handling and retry logic
 */

export const webhookController = {
  /**
   * Handle Veriff webhook
   *
   * Event types:
   * - FINISHED: Verification session completed
   * - STARTED: Session started (optional)
   *
   * Payload structure:
   * {
   *   "status": "success",
   *   "verification": {
   *     "id": "session-id",
   *     "code": 9001,
   *     "status": "approved",
   *     "vendorData": "user-id"
   *   }
   * }
   */
  async handleVeriffWebhook(req: Request, res: Response): Promise<void> {
    let webhookEventId: string | null = null;

    try {
      // Get raw body and signature
      // Per Veriff docs: X-HMAC-SIGNATURE header contains the signature
      // https://devdocs.veriff.com/docs/hmac-authentication-and-endpoint-security
      const signature = (req.headers['x-hmac-signature'] || req.headers['x-signature']) as string;
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // Extract data early for logging
      const sessionId = payload.verification?.id;
      const userId = payload.verification?.vendorData;

      logger.info('Received Veriff webhook', {
        event: payload.status,
        sessionId,
        provider: 'veriff',
      });

      // Verify signature
      if (!VeriffClient.verifyWebhookSignature(payload, signature)) {
        logger.error('Invalid Veriff webhook signature', { sessionId });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Idempotency check - prevent duplicate processing
      const isProcessed = await VerificationWebhookEventModel.isEventProcessed('veriff', sessionId);
      if (isProcessed) {
        logger.info('Veriff webhook already processed (idempotency)', { sessionId });
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Create webhook event record
      const { event: webhookEvent, isNew } = await VerificationWebhookEventModel.createOrGet({
        provider: 'veriff',
        provider_event_id: sessionId,
        event_type: payload.status,
        user_id: userId,
        payload,
      });

      webhookEventId = webhookEvent.id;

      if (!isNew) {
        logger.info('Veriff webhook duplicate detected', { sessionId });
        await VerificationWebhookEventModel.markAsSkipped(webhookEventId);
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Mark as processing
      await VerificationWebhookEventModel.markAsProcessing(webhookEventId);

      // Process verification completion
      if (payload.status === 'success') {
        await VerificationService.completeIDVerification(userId, sessionId);
      }

      // Mark as completed
      await VerificationWebhookEventModel.markAsCompleted(webhookEventId);

      // Acknowledge webhook
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Failed to process Veriff webhook', {
        error: error.message,
        stack: error.stack,
        provider: 'veriff',
      });

      // Mark webhook event as failed
      if (webhookEventId) {
        await VerificationWebhookEventModel.markAsFailed(webhookEventId, error.message);
      }

      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },

  /**
   * Handle Certn webhook
   *
   * Event types:
   * - application.completed: Background check completed
   * - application.status_changed: Status updated
   *
   * Payload structure:
   * {
   *   "event": "application.completed",
   *   "data": {
   *     "id": "application-id",
   *     "applicant_id": "applicant-id",
   *     "status": "COMPLETED",
   *     "report_status": "CLEAR"
   *   }
   * }
   */
  async handleCertnWebhook(req: Request, res: Response): Promise<void> {
    let webhookEventId: string | null = null;

    try {
      // Get signature header (if Certn provides signature verification)
      const signature = req.headers['x-certn-signature'] as string;
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      // Extract data early for logging
      const { event, data } = payload;
      const applicationId = data?.id;

      logger.info('Received Certn webhook', {
        event,
        applicationId,
        provider: 'certn',
      });

      // Verify signature (if implemented)
      if (signature && !CertnClient.verifyWebhookSignature(payload, signature)) {
        logger.error('Invalid Certn webhook signature', { applicationId });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Idempotency check - prevent duplicate processing
      const isProcessed = await VerificationWebhookEventModel.isEventProcessed('certn', applicationId);
      if (isProcessed) {
        logger.info('Certn webhook already processed (idempotency)', { applicationId });
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Create webhook event record
      const { event: webhookEvent, isNew } = await VerificationWebhookEventModel.createOrGet({
        provider: 'certn',
        provider_event_id: applicationId,
        event_type: event || 'status_update',
        user_id: data?.applicant_id,
        payload,
      });

      webhookEventId = webhookEvent.id;

      if (!isNew) {
        logger.info('Certn webhook duplicate detected', { applicationId });
        await VerificationWebhookEventModel.markAsSkipped(webhookEventId);
        res.status(200).json({ received: true, duplicate: true });
        return;
      }

      // Mark as processing
      await VerificationWebhookEventModel.markAsProcessing(webhookEventId);

      // Only process completed applications
      if (event === 'application.completed' || data.status === 'COMPLETED') {
        // Find verification record by application ID
        const verification = await VerificationModel.findByUserId(data.applicant_id);

        if (!verification) {
          logger.error('Verification record not found for Certn webhook', {
            applicationId,
            applicantId: data.applicant_id,
          });
          await VerificationWebhookEventModel.markAsFailed(webhookEventId, 'Verification record not found');
          res.status(404).json({ error: 'Verification not found' });
          return;
        }

        // Find user ID from custom_id in verification record
        const userId = verification.user_id;

        // Process background check result
        await VerificationService.processBackgroundCheckResult(userId, applicationId);
      }

      // Mark as completed
      await VerificationWebhookEventModel.markAsCompleted(webhookEventId);

      // Acknowledge webhook
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Failed to process Certn webhook', {
        error: error.message,
        stack: error.stack,
        provider: 'certn',
      });

      // Mark webhook event as failed
      if (webhookEventId) {
        await VerificationWebhookEventModel.markAsFailed(webhookEventId, error.message);
      }

      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
};

export default webhookController;
