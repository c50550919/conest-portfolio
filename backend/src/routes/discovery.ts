import express from 'express';
import DiscoveryController from '../controllers/DiscoveryController';
import { authenticateToken } from '../middleware/auth';

/**
 * Discovery Routes
 *
 * Purpose: Route definitions for Discovery Screen feature
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * All routes require authentication
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
 */
router.get('/profiles', DiscoveryController.getProfiles.bind(DiscoveryController));

/**
 * POST /api/discovery/swipe
 * Record a swipe action (left or right)
 *
 * Body:
 * - targetUserId: UUID of user being swiped on
 * - direction: "left" or "right"
 *
 * Response:
 * - swipeId: UUID of created swipe
 * - matchCreated: boolean
 * - match (optional): Match object if mutual match created
 *
 * Note: Swipes are FINAL (no undo in MVP - clarification 2025-10-06)
 */
router.post('/swipe', DiscoveryController.swipe.bind(DiscoveryController));

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
