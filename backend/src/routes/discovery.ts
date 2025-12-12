import express from 'express';
import DiscoveryController from '../controllers/DiscoveryController';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * Discovery Routes
 *
 * Purpose: Route definitions for Browse Discovery feature
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * All routes require authentication
 *
 * Note: This is a browse-based discovery system. Users express interest
 * via connection requests (/api/connection-requests), not swipes.
 *
 * Updated: 2025-11-29 - Removed swipe endpoint (using connection requests instead)
 */

const router = express.Router();

// All discovery routes require authentication
router.use(authenticateToken);

/**
 * GET /api/discovery/profiles
 * Get discovery profiles with cursor-based pagination
 *
 * Query params:
 * - limit (optional): Number of profiles (1-50, default 10)
 * - cursor (optional): Cursor for pagination (UUID)
 *
 * Response:
 * - profiles: Array of ProfileCard objects
 * - nextCursor: Cursor for next page (null if no more)
 *
 * Filtering:
 * - Excludes users with existing connection requests (any status)
 * - Excludes already matched users
 * - Does NOT exclude saved profiles (users can still browse saved)
 */
router.get('/profiles', DiscoveryController.getProfiles.bind(DiscoveryController));

// NOTE: Swipe endpoint removed (2025-11-29)
// Users express interest via POST /api/connection-requests instead

/**
 * POST /api/discovery/screenshot
 * Report screenshot detection (child safety feature)
 *
 * Body:
 * - targetUserId: UUID of user whose profile was screenshot
 *
 * Response:
 * - success: boolean
 * - message: string
 *
 * Security: Logs screenshot event, notifies profile owner via Socket.io
 */
router.post('/screenshot', DiscoveryController.reportScreenshot.bind(DiscoveryController));

export default router;
