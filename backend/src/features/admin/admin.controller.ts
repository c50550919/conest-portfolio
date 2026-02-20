/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Admin Controller
 *
 * Coordinator for admin operations. Re-exports from specialized controllers
 * for backwards compatibility while maintaining clean separation of concerns.
 *
 * Decomposed into:
 * - verificationReviewController: Verification review queue and approvals
 * - moderationController: AI content moderation and user actions
 *
 * Created: 2025-10-XX
 * Refactored: 2025-12-08 - Decomposed into specialized controllers
 */

import { verificationReviewController, calculateSLARemaining } from '../verification';
import { moderationController } from '../moderation/moderation.controller';

/**
 * Combined admin controller that maintains backwards compatibility
 * while delegating to specialized controllers.
 */
export const adminController = {
  // ==========================================
  // VERIFICATION REVIEW ENDPOINTS
  // ==========================================

  /** Get verification review queue */
  getReviewQueue: verificationReviewController.getReviewQueue,

  /** Get verification details for review */
  getVerificationDetails: verificationReviewController.getVerificationDetails,

  /** Approve verification after manual review */
  approveVerification: verificationReviewController.approveVerification,

  /** Reject verification after manual review */
  rejectVerification: verificationReviewController.rejectVerification,

  /** Get overall verification statistics */
  getVerificationStats: verificationReviewController.getVerificationStats,

  /** Get verifications by status */
  getVerificationsByStatus: verificationReviewController.getVerificationsByStatus,

  /** Search users by email or ID */
  searchUsers: verificationReviewController.searchUsers,

  /** Get user verification history */
  getUserVerificationHistory: verificationReviewController.getUserVerificationHistory,

  // ==========================================
  // AI CONTENT MODERATION ENDPOINTS
  // ==========================================

  /** Get AI moderation queue */
  getModerationQueue: moderationController.getModerationQueue,

  /** Get urgent moderation queue only */
  getUrgentModerationQueue: moderationController.getUrgentModerationQueue,

  /** Get message context for review */
  getMessageContext: moderationController.getMessageContext,

  /** Approve a flagged message */
  approveMessage: moderationController.approveMessage,

  /** Confirm a message violation */
  confirmViolation: moderationController.confirmViolation,

  /** Mark a flagged message as false positive */
  markFalsePositive: moderationController.markFalsePositive,

  /** Get user's moderation patterns */
  getUserPatterns: moderationController.getUserPatterns,

  /** Issue a warning to a user */
  warnUser: moderationController.warnUser,

  /** Suspend a user */
  suspendUser: moderationController.suspendUser,

  /** Ban a user permanently */
  banUser: moderationController.banUser,

  /** Get AI moderation statistics */
  getModerationStats: moderationController.getModerationStats,
};

// Re-export for backwards compatibility and direct access
export { verificationReviewController } from '../verification';
export { moderationController } from '../moderation/moderation.controller';
export { calculateSLARemaining };

export default adminController;
