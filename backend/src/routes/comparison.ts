/**
 * Profile Comparison Routes
 *
 * Purpose: Routes for unified profile comparison
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 *
 * Created: 2025-10-20
 */

import express from 'express';
import { compareProfiles, calculateCompatibility } from '../controllers/comparisonController';
import { authenticateJWT } from '../middleware/auth.middleware';

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
 * TODO: AUTH DISABLED FOR TESTING - Re-enable authenticateJWT once core functionality works
 */
router.post('/compare', /* authenticateJWT, */ compareProfiles);

/**
 * POST /api/compatibility/calculate
 * Calculate detailed 6-dimension compatibility breakdown
 *
 * Body: {
 *   profile1Id: string,
 *   profile2Id: string
 * }
 *
 * TODO: AUTH DISABLED FOR TESTING - Re-enable authenticateJWT once core functionality works
 */
router.post('/calculate', /* authenticateJWT, */ calculateCompatibility);

export default router;
