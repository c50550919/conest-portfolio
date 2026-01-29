/**
 * Enhanced Messages Routes
 *
 * Features:
 * - Verification-enforced messaging
 * - Message reporting system
 * - Admin moderation endpoints
 * - Conversation management
 *
 * Security: All routes require JWT authentication
 * Admin routes require admin role verification
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth.middleware';
import { messageRateLimit, adminRateLimiter } from '../../middleware/rateLimit';
import EnhancedMessagingService from './enhanced-messaging.service';
import logger from '../../config/logger';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/messages/verified
 * Send a message with verification enforcement
 *
 * Body:
 * - conversationId: string
 * - recipientId: string
 * - content: string
 * - messageType?: 'text' | 'image' | 'file'
 * - fileUrl?: string
 * - metadata?: object
 */
router.post('/verified', messageRateLimit, async (req, res) => {
  try {
    const { conversationId, recipientId, content, messageType, fileUrl, metadata } = req.body;
    const senderId = req.user!.userId;

    if (!conversationId || !recipientId || !content) {
      return res.status(400).json({
        error: 'Missing required fields: conversationId, recipientId, content',
      });
    }

    const message = await EnhancedMessagingService.sendVerifiedMessage({
      conversationId,
      senderId,
      recipientId,
      content,
      messageType,
      fileUrl,
      metadata,
    });

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    logger.error('Error sending verified message:', error);

    if (error.message.includes('NOT_VERIFIED')) {
      return res.status(403).json({
        error: 'Verification required',
        message: error.message,
        requiresVerification: true,
      });
    }

    if (error.message.includes('BLOCKED')) {
      return res.status(403).json({
        error: 'Conversation blocked',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to send message',
      message: error.message,
    });
  }
});

/**
 * POST /api/messages/:messageId/report
 * Report a message for moderation review
 *
 * Body:
 * - reportType: 'inappropriate_content' | 'harassment' | 'spam' | 'scam' | 'child_safety_concern' | 'other'
 * - description?: string
 */
router.post('/:messageId/report', messageRateLimit, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reportType, description } = req.body;
    const reportedBy = req.user!.userId;

    const validReportTypes = [
      'inappropriate_content',
      'harassment',
      'spam',
      'scam',
      'child_safety_concern',
      'other',
    ];

    if (!reportType || !validReportTypes.includes(reportType)) {
      return res.status(400).json({
        error: 'Invalid report type',
        validTypes: validReportTypes,
      });
    }

    await EnhancedMessagingService.reportMessage({
      messageId,
      reportedBy,
      reportType,
      description,
    });

    return res.status(200).json({
      success: true,
      message: 'Message reported successfully',
    });
  } catch (error: any) {
    logger.error('Error reporting message:', error);

    if (error.message.includes('UNAUTHORIZED')) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only conversation participants can report messages',
      });
    }

    return res.status(500).json({
      error: 'Failed to report message',
      message: error.message,
    });
  }
});

/**
 * GET /api/messages/conversations
 * Get all conversations for the authenticated user
 * Includes verification status and unread counts
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const conversations = await EnhancedMessagingService.getUserConversations(userId);

    return res.status(200).json({
      success: true,
      data: conversations,
      count: conversations.length,
    });
  } catch (error: any) {
    logger.error('Error getting conversations:', error);

    return res.status(500).json({
      error: 'Failed to get conversations',
      message: error.message,
    });
  }
});

/**
 * POST /api/messages/conversations/:conversationId/block
 * Block a conversation
 */
router.post('/conversations/:conversationId/block', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;

    await EnhancedMessagingService.blockConversation(conversationId, userId);

    return res.status(200).json({
      success: true,
      message: 'Conversation blocked successfully',
    });
  } catch (error: any) {
    logger.error('Error blocking conversation:', error);

    if (error.message.includes('UNAUTHORIZED')) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this conversation',
      });
    }

    return res.status(500).json({
      error: 'Failed to block conversation',
      message: error.message,
    });
  }
});

/**
 * GET /api/messages/verification-status/:userId
 * Check verification status of a user (for messaging eligibility)
 */
router.get('/verification-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const verification = await EnhancedMessagingService.getUserVerification(userId);

    if (!verification) {
      return res.status(404).json({
        error: 'Verification not found',
        message: 'User verification status not available',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        isVerified: verification.isVerified,
        verificationScore: verification.verificationScore,
        canMessage: verification.isVerified,
      },
    });
  } catch (error: any) {
    logger.error('Error getting verification status:', error);

    return res.status(500).json({
      error: 'Failed to get verification status',
      message: error.message,
    });
  }
});

/**
 * GET /api/messages/conversations/:conversationId/gated
 * Get messages with verification gating
 *
 * Verified users: Returns full message content
 * Unverified users: Returns locked response with unread count only
 *
 * This enables asymmetric messaging:
 * - Verified users can send to anyone
 * - Unverified users can receive but must verify to view/reply
 */
router.get('/conversations/:conversationId/gated', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;

    const result = await EnhancedMessagingService.getMessagesGated(conversationId, userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Error getting gated messages:', error);

    return res.status(500).json({
      error: 'Failed to get messages',
      message: error.message,
    });
  }
});

/**
 * GET /api/messages/unread-count
 * Get total unread message count with verification gating
 *
 * Both verified and unverified users can see the count
 * Unverified users get a prompt to verify to view messages
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const result = await EnhancedMessagingService.getTotalUnreadCount(userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    logger.error('Error getting unread count:', error);

    return res.status(500).json({
      error: 'Failed to get unread count',
      message: error.message,
    });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/messages/admin/reports/pending
 * Get all pending moderation reports
 *
 * Query params:
 * - severity?: 'low' | 'medium' | 'high' | 'critical'
 *
 * Admin only
 */
router.get('/admin/reports/pending', requireAdmin, adminRateLimiter, async (req, res) => {
  try {
    const adminId = req.user!.userId;
    const { severity } = req.query;

    const reports = await EnhancedMessagingService.getPendingReports(
      adminId,
      severity as string | undefined,
    );

    return res.status(200).json({
      success: true,
      data: reports,
      count: reports.length,
    });
  } catch (error: any) {
    logger.error('Error getting pending reports:', error);

    return res.status(500).json({
      error: 'Failed to get pending reports',
      message: error.message,
    });
  }
});

/**
 * POST /api/messages/admin/moderate/:messageId
 * Moderate a flagged message
 *
 * Body:
 * - action: 'approve' | 'reject' | 'delete' | 'flag'
 * - reason: string
 * - actionTaken?: 'none' | 'warning_issued' | 'message_deleted' | 'user_suspended' | 'user_banned' | 'escalated'
 *
 * Admin only
 */
router.post('/admin/moderate/:messageId', requireAdmin, adminRateLimiter, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { action, reason, actionTaken } = req.body;
    const adminId = req.user!.userId;

    const validActions = ['approve', 'reject', 'delete', 'flag'];
    if (!action || !validActions.includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        validActions,
      });
    }

    if (!reason) {
      return res.status(400).json({
        error: 'Reason is required for moderation actions',
      });
    }

    await EnhancedMessagingService.moderateMessage({
      messageId,
      adminId,
      action,
      reason,
      actionTaken,
    });

    return res.status(200).json({
      success: true,
      message: `Message ${action}d successfully`,
    });
  } catch (error: any) {
    logger.error('Error moderating message:', error);

    if (error.message.includes('UNAUTHORIZED')) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Admin privileges required',
      });
    }

    return res.status(500).json({
      error: 'Failed to moderate message',
      message: error.message,
    });
  }
});

export default router;
