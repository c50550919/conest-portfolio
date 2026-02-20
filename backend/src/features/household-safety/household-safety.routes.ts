/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Safety Disclosure Routes
 *
 * All routes require authentication.
 * Submit endpoint has rate limiting to prevent abuse.
 */

import { Router } from 'express';
import { householdSafetyController } from './household-safety.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { verificationLimiter } from '../../middleware/rateLimit';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/household-safety/questions
 * Get the attestation questions to display to the user
 */
router.get('/questions', householdSafetyController.getQuestions);

/**
 * GET /api/household-safety/status
 * Get the current disclosure status for the authenticated user
 */
router.get('/status', householdSafetyController.getStatus);

/**
 * POST /api/household-safety/submit
 * Submit a signed attestation
 * Rate limited to prevent abuse
 */
router.post(
  '/submit',
  verificationLimiter,
  householdSafetyController.submitAttestation,
);

export default router;
