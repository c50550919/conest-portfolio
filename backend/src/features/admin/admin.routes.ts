/**
 * Admin Routes
 *
 * All routes require:
 * - Authentication (JWT token)
 * - Admin role
 * - Rate limiting
 *
 * Features:
 * - Verification review queue
 * - Manual verification approval/rejection
 * - Verification statistics
 * - User verification status lookup
 * - AI Content Moderation review queue
 * - Account actions (warn, suspend, ban)
 */

import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticateToken, requireAdmin } from '../../middleware/auth.middleware';
import { generalLimiter } from '../../middleware/rateLimit';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);
router.use(generalLimiter);

/**
 * Verification Review Queue
 */

// Get verifications requiring admin review
router.get('/verifications/queue', adminController.getReviewQueue);

// Get verification details for review
router.get('/verifications/:userId', adminController.getVerificationDetails);

// Approve verification after review
router.post('/verifications/:userId/approve', adminController.approveVerification);

// Reject verification after review
router.post('/verifications/:userId/reject', adminController.rejectVerification);

/**
 * Verification Statistics
 */

// Get overall verification statistics
router.get('/verifications/stats/overview', adminController.getVerificationStats);

// Get verifications by status
router.get('/verifications/status/:status', adminController.getVerificationsByStatus);

/**
 * User Management
 */

// Search users by email or ID
router.get('/users/search', adminController.searchUsers);

// Get user verification history
router.get('/users/:userId/verification-history', adminController.getUserVerificationHistory);

// ==========================================
// AI CONTENT MODERATION ROUTES
// ==========================================

/**
 * Moderation Queue
 */

// Get AI moderation queue (messages flagged by AI)
router.get('/moderation/queue', adminController.getModerationQueue);

// Get urgent moderation queue only (high-priority items)
router.get('/moderation/queue/urgent', adminController.getUrgentModerationQueue);

// Get AI moderation statistics
router.get('/moderation/stats', adminController.getModerationStats);

// Get message context for review (with surrounding conversation)
router.get('/moderation/:messageId/context', adminController.getMessageContext);

/**
 * Moderation Actions
 */

// Approve a flagged message (false positive)
router.post('/moderation/:messageId/approve', adminController.approveMessage);

// Confirm a message violation
router.post('/moderation/:messageId/confirm-violation', adminController.confirmViolation);

// Mark as false positive (for AI improvement)
router.post('/moderation/:messageId/false-positive', adminController.markFalsePositive);

/**
 * Pattern Analysis
 */

// Get user's moderation patterns
router.get('/moderation/patterns/:userId', adminController.getUserPatterns);

/**
 * Account Actions
 */

// Issue warning to a user
router.post('/users/:userId/warn', adminController.warnUser);

// Suspend a user
router.post('/users/:userId/suspend', adminController.suspendUser);

// Ban a user permanently
router.post('/users/:userId/ban', adminController.banUser);

export default router;
