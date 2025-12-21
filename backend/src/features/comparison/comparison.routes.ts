/**
 * Profile Comparison Routes
 *
 * Purpose: Routes for unified profile comparison
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 *
 * Created: 2025-10-20
 */

import express from 'express';
import { compareProfiles, calculateCompatibility } from './comparison.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = express.Router();

/**
 * POST /api/profiles/compare
 * Compare 2-4 profiles from mixed sources
 *
 * Body: {
 *   profiles: [
 *     { type: 'discovery', id: 'userId' },
 *     { type: 'saved', id: 'savedProfileId' }
 *   ]
 * }
 *
 * Auth: Required - JWT Bearer token
 * Dev: Use GET /api/dev/test-token to obtain a test JWT
 */
router.post('/compare', authenticateJWT, compareProfiles);

/**
 * POST /api/compatibility/calculate
 * Calculate detailed 6-dimension compatibility breakdown
 *
 * Body: {
 *   profile1Id: string,
 *   profile2Id: string
 * }
 *
 * Auth: Required - JWT Bearer token
 * Dev: Use GET /api/dev/test-token to obtain a test JWT
 */
router.post('/calculate', authenticateJWT, calculateCompatibility);

export default router;
