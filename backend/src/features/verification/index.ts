/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Verification Feature Module
 *
 * Barrel file exporting all verification feature components.
 */

export { VerificationService } from './verification.service';
export { verificationController } from './verification.controller';
export { verificationReviewController, calculateSLARemaining } from './verification-review.controller';
export { webhookController } from './webhook.controller';
export { default as verificationRoutes } from './verification.routes';
export { default as verificationWebhookRoutes } from './webhook.routes';

// Veriff client exports
export { default as VeriffClient } from './veriff/VeriffClient';
export type { VeriffSession, VeriffDecision, CreateSessionRequest } from './veriff/VeriffClient';

// Certn client exports
export { default as CertnClient } from './certn/CertnClient';
export type {
  CertnApplicant,
  CertnApplication,
  CertnReport,
  CertnRecord,
  CreateApplicantRequest,
  CreateApplicationRequest,
} from './certn/CertnClient';

// Telnyx client exports (phone verification - 40% cheaper than Twilio)
export { default as TelnyxVerifyClient } from './telnyx/TelnyxVerifyClient';
export type {
  TelnyxVerification,
  TelnyxVerifyResponse,
  SendCodeResult,
  VerifyCodeResult,
} from './telnyx/TelnyxVerifyClient';
