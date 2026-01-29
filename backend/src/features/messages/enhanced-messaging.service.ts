/**
 * Enhanced Messaging Service with Verification, Moderation & Reporting
 *
 * Extends MessagesService with:
 * - Verification enforcement (both users must be verified)
 * - Admin moderation capabilities
 * - User reporting system
 * - Message flagging and review
 */

import db from '../../config/database';
import { encrypt, decrypt } from '../../utils/encryption';
import SocketService from '../../services/SocketService';
import logger from '../../config/logger';
import crypto from 'crypto';
import { queueMessageForModeration } from '../moderation/moderation.worker';
import ContentModerationService from '../moderation/content-moderation.service';

interface VerificationStatus {
  isVerified: boolean;
  userId: string;
  verificationScore: number;
  idVerificationStatus: string;
  backgroundCheckStatus: string;
}

export interface ReportMessageParams {
  messageId: string;
  reportedBy: string;
  reportType: 'inappropriate_content' | 'harassment' | 'spam' | 'scam' | 'child_safety_concern' | 'other';
  description?: string;
}

export interface AdminModerationAction {
  messageId: string;
  adminId: string;
  action: 'approve' | 'reject' | 'delete' | 'flag';
  reason: string;
  actionTaken?: 'none' | 'warning_issued' | 'message_deleted' | 'user_suspended' | 'user_banned' | 'escalated';
}

export interface ConversationListItem {
  id: string;
  participantId: string;
  participantName: string;
  participantPhoto: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isVerified: boolean;
  isBlocked: boolean;
  isMuted: boolean;
}

export class EnhancedMessagingService {
  private knex = db;

  /**
   * Check if both participants in a conversation are verified
   */
  async checkBothVerified(userId1: string, userId2: string): Promise<boolean> {
    const verifications = await this.knex('verifications')
      .whereIn('user_id', [userId1, userId2])
      .select('user_id', 'fully_verified');

    if (verifications.length !== 2) {
      return false;
    }

    return verifications.every(v => v.fully_verified === true);
  }

  /**
   * Get verification status for a user
   */
  async getUserVerification(userId: string): Promise<VerificationStatus | null> {
    const verification = await this.knex('verifications')
      .where('user_id', userId)
      .first();

    if (!verification) {
      return null;
    }

    return {
      isVerified: verification.fully_verified,
      userId,
      verificationScore: verification.verification_score,
      idVerificationStatus: verification.id_verification_status,
      backgroundCheckStatus: verification.background_check_status,
    };
  }

  /**
   * Send message with verification enforcement
   *
   * @throws Error if either participant is not verified
   */
  async sendVerifiedMessage(params: {
    conversationId: string;
    senderId: string;
    recipientId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
    fileUrl?: string;
    metadata?: any;
  }): Promise<any> {
    const { conversationId, senderId, recipientId, content, messageType = 'text', fileUrl, metadata } = params;

    // Enforce verification requirement for SENDER only
    // Verified users can message anyone, but unverified recipients must verify to VIEW/REPLY
    const senderVerification = await this.getUserVerification(senderId);

    if (!senderVerification || !senderVerification.isVerified) {
      throw new Error('SENDER_NOT_VERIFIED: You must complete verification to send messages');
    }

    // NOTE: Recipient verification NOT required for sending
    // Unverified recipients can receive messages but must verify to view/reply
    // This is enforced in getMessagesGated() method

    // Check if conversation is blocked
    const conversation = await this.knex('conversations')
      .where('id', conversationId)
      .first();

    if (!conversation) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    if (conversation.blocked) {
      throw new Error('CONVERSATION_BLOCKED: This conversation has been blocked');
    }

    // Encrypt message content
    const encryptedContent = encrypt(content);
    const iv = crypto.randomBytes(16).toString('base64');
    const salt = crypto.randomBytes(32).toString('base64');

    // Determine initial moderation status based on AI moderation config
    const aiModerationEnabled = ContentModerationService.isEnabled();
    const initialModerationStatus = aiModerationEnabled ? 'pending_ai_review' : 'auto_approved';

    // Create message with encryption metadata
    const [message] = await this.knex('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: encryptedContent,
        message_type: messageType,
        file_url: fileUrl,
        encryption_iv: iv,
        encryption_salt: salt,
        encryption_version: 'aes-256-gcm-v1',
        metadata: metadata ? JSON.stringify(metadata) : null,
        moderation_status: initialModerationStatus,
      })
      .returning('*');

    // Queue message for AI moderation (async - doesn't block message delivery)
    if (aiModerationEnabled) {
      queueMessageForModeration(message.id, content, senderId, conversationId).catch((err) => {
        logger.error('Failed to queue message for moderation', { messageId: message.id, error: err });
      });
    }

    // Update conversation metadata
    const isParticipant1 = conversation.participant1_id === senderId;
    await this.knex('conversations')
      .where('id', conversationId)
      .update({
        last_message_at: new Date(),
        last_message_sender_id: senderId,
        last_message_preview: content.substring(0, 100),
        [isParticipant1 ? 'unread_count_p2' : 'unread_count_p1']: this.knex.raw('?? + 1', [
          isParticipant1 ? 'unread_count_p2' : 'unread_count_p1',
        ]),
      });

    // Emit real-time event via Socket.io
    const io = SocketService.getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('new_message', {
        id: message.id,
        conversationId,
        senderId,
        content, // Send decrypted to recipient
        messageType,
        fileUrl,
        sentAt: message.created_at,
      });

      io.to(`user:${senderId}`).emit('message_delivered', {
        messageId: message.id,
        timestamp: message.created_at,
      });
    }

    logger.info(`Verified message sent: ${message.id} from ${senderId} to ${recipientId}`);

    return {
      id: message.id,
      conversationId,
      senderId,
      content,
      messageType,
      fileUrl,
      sentAt: message.created_at,
      moderationStatus: message.moderation_status,
    };
  }

  /**
   * Report a message for moderation review
   */
  async reportMessage(params: ReportMessageParams): Promise<void> {
    const { messageId, reportedBy, reportType, description } = params;

    // Get message and determine reported user
    const message = await this.knex('messages')
      .where('id', messageId)
      .first();

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    // Get conversation to verify reporter is a participant
    const conversation = await this.knex('conversations')
      .where('id', message.conversation_id)
      .first();

    if (!conversation) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    const isParticipant =
      conversation.participant1_id === reportedBy ||
      conversation.participant2_id === reportedBy;

    if (!isParticipant) {
      throw new Error('UNAUTHORIZED: Only conversation participants can report messages');
    }

    const reportedUserId = message.sender_id;

    // Determine severity based on report type
    const severity = reportType === 'child_safety_concern' ? 'critical' :
      reportType === 'harassment' || reportType === 'scam' ? 'high' :
        reportType === 'inappropriate_content' ? 'medium' : 'low';

    // Create report
    await this.knex('message_reports').insert({
      message_id: messageId,
      reported_by: reportedBy,
      reported_user_id: reportedUserId,
      report_type: reportType,
      description,
      status: 'pending',
      severity,
    });

    // Flag message for review
    await this.knex('messages')
      .where('id', messageId)
      .update({
        flagged_for_review: true,
        moderation_status: severity === 'critical' ? 'pending' : 'auto_approved',
      });

    logger.warn(`Message reported: ${messageId} by ${reportedBy} (${reportType})`);

    // For critical reports, notify admins immediately
    if (severity === 'critical') {
      const io = SocketService.getIO();
      if (io) {
        io.to('admin').emit('critical_report', {
          messageId,
          reportType,
          severity,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Admin: Review and take action on a flagged message
   */
  async moderateMessage(params: AdminModerationAction): Promise<void> {
    const { messageId, adminId, action, reason, actionTaken = 'none' } = params;

    // Verify admin privileges
    const admin = await this.knex('users')
      .where('id', adminId)
      .first();

    if (!admin || admin.status !== 'active') {
      throw new Error('UNAUTHORIZED: Invalid admin credentials');
    }

    const message = await this.knex('messages')
      .where('id', messageId)
      .first();

    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    // Update message moderation status
    const moderationStatus = action === 'approve' ? 'approved' :
      action === 'reject' || action === 'delete' ? 'rejected' : 'pending';

    await this.knex('messages')
      .where('id', messageId)
      .update({
        moderation_status: moderationStatus,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        moderation_notes: reason,
        deleted: action === 'delete',
      });

    // Update related reports
    await this.knex('message_reports')
      .where('message_id', messageId)
      .update({
        status: 'resolved',
        resolved_by: adminId,
        resolved_at: new Date(),
        resolution_notes: reason,
        action_taken: actionTaken,
      });

    // Create admin action audit log
    await this.knex('admin_actions').insert({
      admin_id: adminId,
      action_type: action === 'delete' ? 'message_deleted' :
        action === 'approve' ? 'message_approved' : 'message_rejected',
      target_message_id: messageId,
      target_user_id: message.sender_id,
      reason,
      metadata: JSON.stringify({ actionTaken }),
    });

    logger.info(`Message ${messageId} moderated by admin ${adminId}: ${action}`);

    // Notify involved users if message was deleted
    if (action === 'delete') {
      const io = SocketService.getIO();
      if (io) {
        io.to(`user:${message.sender_id}`).emit('message_deleted', {
          messageId,
          reason: 'Content removed by moderation',
        });
      }
    }
  }

  /**
   * Get conversation list for a user with verification status
   */
  async getUserConversations(userId: string): Promise<ConversationListItem[]> {
    const conversations = await this.knex('conversations')
      .where((builder) => {
        void builder.where('participant1_id', userId)
          .orWhere('participant2_id', userId);
      })
      .where('archived', false)
      .orderBy('last_message_at', 'desc')
      .select('*');

    const conversationList = await Promise.all(
      conversations.map(async (conv) => {
        const participantId = conv.participant1_id === userId
          ? conv.participant2_id
          : conv.participant1_id;

        const isParticipant1 = conv.participant1_id === userId;
        const unreadCount = isParticipant1 ? conv.unread_count_p1 : conv.unread_count_p2;
        const isMuted = isParticipant1 ? conv.muted_by_p1 : conv.muted_by_p2;

        // Get participant info
        const participant = await this.knex('users')
          .join('parents', 'users.id', 'parents.user_id')
          .where('users.id', participantId)
          .select('users.id', 'parents.first_name', 'parents.photos')
          .first();

        // Get verification status
        const verification = await this.getUserVerification(participantId);

        return {
          id: conv.id,
          participantId,
          participantName: participant?.first_name || 'Unknown',
          participantPhoto: participant?.photos?.[0] || '',
          lastMessage: conv.last_message_preview || '',
          lastMessageAt: conv.last_message_at,
          unreadCount,
          isVerified: verification?.isVerified || false,
          isBlocked: conv.blocked || false,
          isMuted: isMuted || false,
        };
      }),
    );

    return conversationList;
  }

  /**
   * Get pending moderation reports for admin review
   */
  async getPendingReports(adminId: string, severity?: string): Promise<any[]> {
    let query = this.knex('message_reports')
      .join('messages', 'message_reports.message_id', 'messages.id')
      .join('users as reporter', 'message_reports.reported_by', 'reporter.id')
      .join('users as reported', 'message_reports.reported_user_id', 'reported.id')
      .where('message_reports.status', 'pending')
      .orderBy('message_reports.severity', 'desc')
      .orderBy('message_reports.created_at', 'asc')
      .select(
        'message_reports.*',
        'messages.content as encrypted_content',
        'messages.encryption_iv',
        'messages.encryption_salt',
        'reporter.email as reporter_email',
        'reported.email as reported_user_email',
      );

    if (severity) {
      query = query.where('message_reports.severity', severity);
    }

    const reports = await query;

    // Decrypt message content for review
    return reports.map(report => ({
      ...report,
      decrypted_content: decrypt(report.encrypted_content),
    }));
  }

  /**
   * Block a conversation
   */
  async blockConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.knex('conversations')
      .where('id', conversationId)
      .first();

    if (!conversation) {
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    const isParticipant =
      conversation.participant1_id === userId ||
      conversation.participant2_id === userId;

    if (!isParticipant) {
      throw new Error('UNAUTHORIZED');
    }

    await this.knex('conversations')
      .where('id', conversationId)
      .update({
        blocked: true,
        blocked_by: userId,
        blocked_at: new Date(),
      });

    logger.info(`Conversation ${conversationId} blocked by ${userId}`);
  }

  /**
   * Get messages with verification gating
   *
   * Verified users: Return full message content
   * Unverified users: Return locked response with unread count only
   *
   * This enables asymmetric messaging:
   * - Verified users can send to anyone
   * - Unverified users can receive but must verify to view/reply
   */
  async getMessagesGated(conversationId: string, userId: string): Promise<{
    locked: boolean;
    unreadCount?: number;
    message?: string;
    messages?: any[];
    nextCursor?: string | null;
  }> {
    // Check if user is verified
    const verification = await this.getUserVerification(userId);

    if (!verification || !verification.isVerified) {
      // User not verified - return locked response with count only
      const unreadResult = await this.knex('messages')
        .where('conversation_id', conversationId)
        .where('sender_id', '!=', userId)
        .where('read', false)
        .count('id as count')
        .first();

      const unreadCount = parseInt(unreadResult?.count?.toString() || '0', 10);

      logger.info(`Unverified user ${userId} attempted to view messages. Returning locked response.`);

      return {
        locked: true,
        unreadCount,
        message: 'Complete verification to view your messages',
      };
    }

    // User is verified - return full messages
    const messages = await this.knex('messages')
      .where('conversation_id', conversationId)
      .where('deleted', false)
      .orderBy('created_at', 'desc')
      .limit(50)
      .select('*');

    // Decrypt message content for verified user
    const decryptedMessages = messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: decrypt(msg.content),
      messageType: msg.message_type,
      fileUrl: msg.file_url,
      read: msg.read,
      readAt: msg.read_at,
      createdAt: msg.created_at,
      moderationStatus: msg.moderation_status,
    }));

    return {
      locked: false,
      messages: decryptedMessages.reverse(), // Return in chronological order
      nextCursor: null,
    };
  }

  /**
   * Get total unread message count for a user (verification-gated)
   * Unverified users still see the count to encourage verification
   */
  async getTotalUnreadCount(userId: string): Promise<{
    locked: boolean;
    unreadCount: number;
    message?: string;
  }> {
    // Get total unread count across all conversations
    const result = await this.knex('conversations')
      .where((builder) => {
        void builder.where('participant1_id', userId)
          .orWhere('participant2_id', userId);
      })
      .select(
        this.knex.raw(`
          SUM(CASE
            WHEN participant1_id = ? THEN unread_count_p1
            ELSE unread_count_p2
          END) as total_unread
        `, [userId]),
      )
      .first();

    const unreadCount = parseInt(result?.total_unread?.toString() || '0', 10);

    // Check verification status
    const verification = await this.getUserVerification(userId);

    if (!verification || !verification.isVerified) {
      return {
        locked: true,
        unreadCount,
        message: 'Verify your account to view messages',
      };
    }

    return {
      locked: false,
      unreadCount,
    };
  }
}

export default new EnhancedMessagingService();
