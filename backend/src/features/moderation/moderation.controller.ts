/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Moderation Controller
 *
 * Handles AI content moderation operations for admin review.
 * Extracted from adminController for better separation of concerns.
 *
 * Features:
 * - AI moderation queue management
 * - Message context retrieval
 * - Approve/reject flagged content
 * - User pattern analysis
 * - Account actions (warn, suspend, ban)
 *
 * Security:
 * - All endpoints require admin role
 * - All actions are logged
 * - Supports escalation workflows
 *
 * Created: 2025-12-08
 */

import { Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import logger from '../../config/logger';
import { db } from '../../config/database';
import { ContentModerationService } from './content-moderation.service';
import { decrypt } from '../../utils/encryption';
import { getModerationStats } from './moderation.worker';
import { AccountAction } from './moderation.types';

export const moderationController = {
  /**
   * Get AI moderation queue
   * Returns messages flagged by AI for admin review
   * Sorted by severity (critical first) then oldest
   */
  getModerationQueue: asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string | undefined;

    let query = db('messages')
      .join('users', 'messages.sender_id', 'users.id')
      .leftJoin('conversations', 'messages.conversation_id', 'conversations.id')
      .where('messages.flagged_for_review', true)
      .whereIn('messages.moderation_status', ['pending', 'pending_ai_review'])
      .orderBy('messages.created_at', 'asc')
      .limit(limit)
      .select(
        'messages.id as message_id',
        'messages.conversation_id',
        'messages.sender_id',
        'messages.content',
        'messages.ai_category',
        'messages.ai_confidence_score',
        'messages.ai_moderation_result',
        'messages.moderation_status',
        'messages.created_at as flagged_at',
        'users.email as sender_email',
      );

    if (severity) {
      if (severity === 'critical') {
        query = query.where('messages.ai_category', 'child_predatory_risk');
      } else if (severity === 'high') {
        query = query.whereIn('messages.ai_category', [
          'child_predatory_risk',
          'child_safety_questionable',
        ]);
      }
    }

    const flaggedMessages = await query;

    const enrichedQueue = await Promise.all(
      flaggedMessages.map(async (msg) => {
        let decryptedContent = '';
        try {
          decryptedContent = decrypt(msg.content);
        } catch {
          decryptedContent = msg.content;
        }

        const patternSummary = await ContentModerationService.getUserPatternSummary(msg.sender_id);

        let aiResult = null;
        if (msg.ai_moderation_result) {
          try {
            aiResult = JSON.parse(msg.ai_moderation_result);
          } catch {
            aiResult = msg.ai_moderation_result;
          }
        }

        return {
          messageId: msg.message_id,
          conversationId: msg.conversation_id,
          senderId: msg.sender_id,
          senderEmail: msg.sender_email,
          content: decryptedContent,
          category: msg.ai_category,
          confidence: msg.ai_confidence_score,
          aiResult,
          flaggedAt: msg.flagged_at,
          priority:
            msg.ai_category === 'child_predatory_risk'
              ? 'urgent'
              : msg.ai_confidence_score >= 0.7
                ? 'high'
                : 'standard',
          userPatternSummary: patternSummary,
        };
      }),
    );

    const stats = await getModerationStats();

    res.json({
      success: true,
      data: {
        queue: enrichedQueue,
        total: enrichedQueue.length,
        stats,
      },
    });
  }),

  /**
   * Get urgent moderation queue only
   * High-priority items requiring immediate review
   */
  getUrgentModerationQueue: asyncHandler(async (req: AuthRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;

    const urgentMessages = await db('messages')
      .join('users', 'messages.sender_id', 'users.id')
      .where('messages.flagged_for_review', true)
      .whereIn('messages.moderation_status', ['pending', 'pending_ai_review'])
      .where((builder) => {
        void builder.where('messages.ai_category', 'child_predatory_risk').orWhere(
          'messages.ai_confidence_score',
          '>=',
          0.7,
        );
      })
      .orderBy('messages.ai_confidence_score', 'desc')
      .orderBy('messages.created_at', 'asc')
      .limit(limit)
      .select(
        'messages.id as message_id',
        'messages.sender_id',
        'messages.content',
        'messages.ai_category',
        'messages.ai_confidence_score',
        'messages.ai_moderation_result',
        'messages.created_at as flagged_at',
        'users.email as sender_email',
      );

    const enrichedQueue = await Promise.all(
      urgentMessages.map(async (msg) => {
        let decryptedContent = '';
        try {
          decryptedContent = decrypt(msg.content);
        } catch {
          decryptedContent = msg.content;
        }

        const patternSummary = await ContentModerationService.getUserPatternSummary(msg.sender_id);

        return {
          messageId: msg.message_id,
          senderId: msg.sender_id,
          senderEmail: msg.sender_email,
          content: decryptedContent,
          category: msg.ai_category,
          confidence: msg.ai_confidence_score,
          flaggedAt: msg.flagged_at,
          userPatternSummary: patternSummary,
        };
      }),
    );

    res.json({
      success: true,
      data: {
        queue: enrichedQueue,
        total: enrichedQueue.length,
      },
    });
  }),

  /**
   * Get message context for review
   * Returns the flagged message with surrounding conversation context
   */
  getMessageContext: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const contextCount = parseInt(req.query.context as string) || 10;

    const message = await db('messages')
      .join('users', 'messages.sender_id', 'users.id')
      .where('messages.id', messageId)
      .select('messages.*', 'users.email as sender_email')
      .first();

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const surroundingMessages = await db('messages')
      .where('conversation_id', message.conversation_id)
      .where('id', '!=', messageId)
      .orderBy('created_at', 'desc')
      .limit(contextCount)
      .select('id', 'sender_id', 'content', 'created_at');

    let decryptedContent = '';
    try {
      decryptedContent = decrypt(message.content);
    } catch {
      decryptedContent = message.content;
    }

    const decryptedContext = surroundingMessages.reverse().map((msg) => {
      let content = '';
      try {
        content = decrypt(msg.content);
      } catch {
        content = msg.content;
      }
      return {
        id: msg.id,
        senderId: msg.sender_id,
        content,
        createdAt: msg.created_at,
      };
    });

    const patternSummary = await ContentModerationService.getUserPatternSummary(message.sender_id);

    let aiResult = null;
    if (message.ai_moderation_result) {
      try {
        aiResult = JSON.parse(message.ai_moderation_result);
      } catch {
        aiResult = message.ai_moderation_result;
      }
    }

    const reports = await db('message_reports').where('message_id', messageId).select('*');

    res.json({
      success: true,
      data: {
        message: {
          id: message.id,
          conversationId: message.conversation_id,
          senderId: message.sender_id,
          senderEmail: message.sender_email,
          content: decryptedContent,
          category: message.ai_category,
          confidence: message.ai_confidence_score,
          signals: {
            childFocus: message.ai_child_focus,
            asksSchedule: message.ai_asks_schedule,
            asksLocation: message.ai_asks_location,
            offersAccess: message.ai_offers_access,
            probesSecurity: message.ai_probes_security,
          },
          aiResult,
          createdAt: message.created_at,
        },
        context: decryptedContext,
        userPatternSummary: patternSummary,
        reports,
      },
    });
  }),

  /**
   * Approve a flagged message
   * Clears the flag and marks as admin-approved
   */
  approveMessage: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const { notes } = req.body;
    const adminId = req.userId!;

    const message = await db('messages').where('id', messageId).first();
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    await db('messages').where('id', messageId).update({
      moderation_status: 'approved',
      flagged_for_review: false,
      reviewed_by: adminId,
      reviewed_at: db.fn.now(),
      moderation_notes: notes || 'Admin approved - false positive',
    });

    await db('message_reports').where('message_id', messageId).update({
      status: 'resolved',
      resolved_by: adminId,
      resolved_at: db.fn.now(),
      resolution_notes: notes || 'Message approved by admin',
      action_taken: 'none',
    });

    await db('admin_actions').insert({
      admin_id: adminId,
      action_type: 'message_approved',
      target_message_id: messageId,
      target_user_id: message.sender_id,
      reason: notes || 'Admin review - approved',
    });

    logger.info('Admin approved message', { messageId, adminId, notes });

    res.json({
      success: true,
      message: 'Message approved successfully',
    });
  }),

  /**
   * Confirm a message violation and optionally apply account action
   */
  confirmViolation: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const { notes, accountAction } = req.body as {
      notes?: string;
      accountAction?: AccountAction;
    };
    const adminId = req.userId!;

    const message = await db('messages').where('id', messageId).first();
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    await db('messages').where('id', messageId).update({
      moderation_status: 'rejected',
      flagged_for_review: false,
      reviewed_by: adminId,
      reviewed_at: db.fn.now(),
      moderation_notes: notes || 'Violation confirmed by admin',
      deleted: true,
    });

    await db('message_reports').where('message_id', messageId).update({
      status: 'resolved',
      resolved_by: adminId,
      resolved_at: db.fn.now(),
      resolution_notes: notes || 'Violation confirmed',
      action_taken: accountAction
        ? accountAction === 'permanent_ban'
          ? 'user_banned'
          : accountAction.startsWith('suspension')
            ? 'user_suspended'
            : 'warning_issued'
        : 'message_deleted',
    });

    if (accountAction && accountAction !== 'none') {
      await ContentModerationService.applyAccountAction(
        message.sender_id,
        accountAction,
        notes || 'Admin confirmed violation',
        adminId,
      );
    }

    await db('admin_actions').insert({
      admin_id: adminId,
      action_type: 'message_rejected',
      target_message_id: messageId,
      target_user_id: message.sender_id,
      reason: notes || 'Violation confirmed',
      metadata: JSON.stringify({ accountAction }),
    });

    logger.warn('Admin confirmed violation', {
      messageId,
      adminId,
      senderId: message.sender_id,
      accountAction,
    });

    res.json({
      success: true,
      message: 'Violation confirmed',
      accountAction: accountAction || 'none',
    });
  }),

  /**
   * Mark a flagged message as false positive
   * Helps improve AI moderation accuracy
   */
  markFalsePositive: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { messageId } = req.params;
    const { notes, feedbackCategory } = req.body;
    const adminId = req.userId!;

    const message = await db('messages').where('id', messageId).first();
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    await db('messages').where('id', messageId).update({
      moderation_status: 'approved',
      flagged_for_review: false,
      reviewed_by: adminId,
      reviewed_at: db.fn.now(),
      moderation_notes: `FALSE POSITIVE: ${notes || 'No notes provided'}`,
    });

    await db('ai_moderation_logs')
      .where('message_id', messageId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .update({
        admin_feedback: 'false_positive',
        admin_feedback_notes: notes,
        admin_feedback_category: feedbackCategory,
      });

    await db('message_reports').where('message_id', messageId).update({
      status: 'dismissed',
      resolved_by: adminId,
      resolved_at: db.fn.now(),
      resolution_notes: `False positive: ${notes || 'AI flagged incorrectly'}`,
      action_taken: 'none',
    });

    await db('admin_actions').insert({
      admin_id: adminId,
      action_type: 'message_approved',
      target_message_id: messageId,
      target_user_id: message.sender_id,
      reason: `False positive: ${notes || 'AI flagged incorrectly'}`,
      metadata: JSON.stringify({ feedbackCategory, isFalsePositive: true }),
    });

    logger.info('Admin marked false positive', { messageId, adminId, feedbackCategory });

    res.json({
      success: true,
      message: 'Marked as false positive',
    });
  }),

  /**
   * Get user's moderation patterns
   */
  getUserPatterns: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    const patternSummary = await ContentModerationService.getUserPatternSummary(userId);

    const patterns = await db('moderation_patterns').where('user_id', userId).select('*');

    const user = await db('users')
      .where('id', userId)
      .select(
        'id',
        'email',
        'moderation_strike_count',
        'moderation_status',
        'suspension_until',
        'suspension_reason',
      )
      .first();

    const flaggedMessages = await db('messages')
      .where('sender_id', userId)
      .where('flagged_for_review', true)
      .orderBy('created_at', 'desc')
      .limit(20)
      .select('id', 'ai_category', 'ai_confidence_score', 'moderation_status', 'created_at');

    res.json({
      success: true,
      data: {
        user,
        summary: patternSummary,
        patterns,
        flaggedMessages,
      },
    });
  }),

  /**
   * Issue a warning to a user
   */
  warnUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { reason, relatedMessageId } = req.body;
    const adminId = req.userId!;

    const user = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await ContentModerationService.applyAccountAction(userId, 'warning', reason, adminId);

    if (relatedMessageId) {
      await db('message_reports').where('message_id', relatedMessageId).update({
        action_taken: 'warning_issued',
      });
    }

    logger.info('Admin issued warning', { userId, adminId, reason });

    res.json({
      success: true,
      message: 'Warning issued successfully',
    });
  }),

  /**
   * Suspend a user
   */
  suspendUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { reason, duration, relatedMessageId } = req.body as {
      reason: string;
      duration: '24h' | '7d';
      relatedMessageId?: string;
    };
    const adminId = req.userId!;

    const user = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const action: AccountAction = duration === '7d' ? 'suspension_7d' : 'suspension_24h';
    await ContentModerationService.applyAccountAction(userId, action, reason, adminId);

    if (relatedMessageId) {
      await db('message_reports').where('message_id', relatedMessageId).update({
        action_taken: 'user_suspended',
      });
    }

    logger.warn('Admin suspended user', { userId, adminId, reason, duration });

    res.json({
      success: true,
      message: `User suspended for ${duration}`,
    });
  }),

  /**
   * Ban a user permanently
   */
  banUser: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { reason, relatedMessageId } = req.body;
    const adminId = req.userId!;

    const user = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await ContentModerationService.applyAccountAction(userId, 'permanent_ban', reason, adminId);

    if (relatedMessageId) {
      await db('message_reports').where('message_id', relatedMessageId).update({
        action_taken: 'user_banned',
      });
    }

    logger.warn('Admin banned user', { userId, adminId, reason });

    res.json({
      success: true,
      message: 'User banned permanently',
    });
  }),

  /**
   * Get AI moderation statistics
   */
  getModerationStats: asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stats = await getModerationStats();

    const recentActions = await db('admin_actions')
      .whereIn('action_type', [
        'message_approved',
        'message_rejected',
        'user_suspended',
        'user_banned',
      ])
      .orderBy('created_at', 'desc')
      .limit(10)
      .select('*');

    const falsePositiveRate = await db('ai_moderation_logs')
      .where('admin_feedback', 'false_positive')
      .count('* as count')
      .first();

    const totalReviewed = await db('messages')
      .whereNotNull('reviewed_by')
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        ...stats,
        falsePositives: parseInt((falsePositiveRate?.count as string) || '0'),
        totalReviewed: parseInt((totalReviewed?.count as string) || '0'),
        falsePositiveRate:
          totalReviewed?.count && parseInt(totalReviewed.count as string) > 0
            ? `${(
              (parseInt((falsePositiveRate?.count as string) || '0') /
                  parseInt(totalReviewed.count as string)) *
                100
            ).toFixed(2)  }%`
            : '0%',
        recentActions,
      },
    });
  }),
};

export default moderationController;
