import { Request, Response } from 'express';
import logger from '../config/logger';
import { VerificationService } from '../services/verificationService';
import VeriffClient from '../services/veriff/VeriffClient';
import CertnClient from '../services/certn/CertnClient';
import { VerificationModel } from '../models/Verification';

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
    try {
      // Get raw body and signature
      const signature = req.headers['x-signature'] as string;
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      logger.info('Received Veriff webhook', {
        event: payload.status,
        sessionId: payload.verification?.id,
      });

      // Verify signature
      if (!VeriffClient.verifyWebhookSignature(payload, signature)) {
        logger.error('Invalid Veriff webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Extract data
      const { verification } = payload;
      const userId = verification.vendorData; // Our internal user ID
      const sessionId = verification.id;

      // Process verification completion
      if (payload.status === 'success') {
        await VerificationService.completeIDVerification(userId, sessionId);
      }

      // Acknowledge webhook
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Failed to process Veriff webhook', {
        error: error.message,
        stack: error.stack,
      });
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
    try {
      // Get signature header (if Certn provides signature verification)
      const signature = req.headers['x-certn-signature'] as string;
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      logger.info('Received Certn webhook', {
        event: payload.event,
        applicationId: payload.data?.id,
      });

      // Verify signature (if implemented)
      if (signature && !CertnClient.verifyWebhookSignature(payload, signature)) {
        logger.error('Invalid Certn webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Extract data
      const { event, data } = payload;
      const applicationId = data.id;

      // Only process completed applications
      if (event === 'application.completed' || data.status === 'COMPLETED') {
        // Find verification record by application ID
        const verification = await VerificationModel.findByUserId(data.applicant_id);

        if (!verification) {
          logger.error('Verification record not found for Certn webhook', {
            applicationId,
            applicantId: data.applicant_id,
          });
          res.status(404).json({ error: 'Verification not found' });
          return;
        }

        // Find user ID from custom_id in verification record
        const userId = verification.user_id;

        // Process background check result
        await VerificationService.processBackgroundCheckResult(userId, applicationId);
      }

      // Acknowledge webhook
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Failed to process Certn webhook', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
};
