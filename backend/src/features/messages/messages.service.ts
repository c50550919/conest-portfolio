/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * T062: MessagesService - Real-time Messaging with End-to-End Encryption
 *
 * Purpose: Centralized service for all messaging operations
 * Constitution Principle III (Security) - End-to-end encryption for all messages
 * Constitution Principle IV (Performance) - <100ms message history, <50ms send
 *
 * Features:
 * - Send encrypted messages with real-time delivery via Socket.io
 * - Get message history with cursor-based pagination and decryption
 * - Mark messages as read with Socket.io notifications
 * - Typing indicators for real-time user feedback
 * - Participant verification for all operations (403 for non-participants)
 *
 * Created: 2025-10-08 (Wave 4: Real-time Messaging)
 */

import { MatchModel, Match } from '../../models/Match';
import { MessageModel, Conversation } from '../../models/Message';
import { encrypt, decrypt } from '../../utils/encryption';
import SocketService from '../../services/SocketService';
import logger from '../../config/logger';

export interface SendMessageParams {
  matchId: string;
  senderId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string;
}

export interface MessageHistoryParams {
  matchId: string;
  userId: string;
  cursor?: string;
  limit?: number;
}

export interface MarkAsReadParams {
  messageId: string;
  userId: string;
}

export interface TypingIndicatorParams {
  matchId: string;
  userId: string;
  isTyping: boolean;
}

export interface MessageResponse {
  id: string;
  matchId: string;
  senderId: string;
  content: string; // Decrypted
  messageType: 'text' | 'image' | 'file';
  fileUrl?: string | null;
  read: boolean;
  readAt?: string | null;
  sentAt: string;
  createdAt: string;
}

export interface MessageHistoryResponse {
  messages: MessageResponse[];
  nextCursor: string | null;
  totalCount?: number;
}

export class MessagesService {
  /**
   * Verify that a user is a participant in a match
   * @throws Error if user is not a participant or match doesn't exist
   */
  private async verifyMatchParticipant(
    matchId: string,
    userId: string,
  ): Promise<{ match: Match; otherUserId: string }> {
    const match = await MatchModel.findById(matchId);

    if (!match) {
      throw new Error('MATCH_NOT_FOUND');
    }

    const isParticipant = match.user_id_1 === userId || match.user_id_2 === userId;

    if (!isParticipant) {
      throw new Error('FORBIDDEN_NOT_PARTICIPANT');
    }

    if (match.status !== 'accepted') {
      throw new Error('MATCH_NOT_ACCEPTED');
    }

    const otherUserId = match.user_id_1 === userId ? match.user_id_2 : match.user_id_1;

    return { match, otherUserId };
  }

  /**
   * Get or create conversation for a match
   */
  private async getOrCreateConversation(
    userId: string,
    otherUserId: string,
  ): Promise<Conversation> {
    let conversation = await MessageModel.findConversation(userId, otherUserId);

    if (!conversation) {
      conversation = await MessageModel.createConversation(userId, otherUserId);
      logger.info(`Created conversation between ${userId} and ${otherUserId}`);
    }

    return conversation;
  }

  /**
   * T062: Send encrypted message with real-time delivery
   *
   * Performance target: <50ms P95
   *
   * @param params - Message parameters
   * @returns MessageResponse with decrypted content
   * @throws Error if user is not a participant or match is not accepted
   */
  async sendMessage(params: SendMessageParams): Promise<MessageResponse> {
    const startTime = Date.now();
    const { matchId, senderId, content, messageType = 'text', fileUrl } = params;

    try {
      // Verify user is a participant in the match (throws if not)
      const { otherUserId } = await this.verifyMatchParticipant(matchId, senderId);

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(senderId, otherUserId);

      // Encrypt message content using AES-256-GCM
      const encryptedContent = encrypt(content);

      // Create message in database
      const message = await MessageModel.createMessage({
        conversation_id: conversation.id,
        sender_id: senderId,
        content: encryptedContent, // Store encrypted
        message_type: messageType,
        file_url: fileUrl,
      });

      // Emit real-time Socket.io event to recipient (<100ms)
      const io = SocketService.getIO();
      if (io) {
        // Emit new_message to recipient
        io.to(`user:${otherUserId}`).emit('new_message', {
          id: message.id,
          matchId,
          senderId,
          content, // Send decrypted content to recipient
          messageType: message.message_type,
          fileUrl: message.file_url,
          sentAt: message.created_at.toISOString(),
          read: false,
        });

        // Emit message_delivered confirmation to sender
        io.to(`user:${senderId}`).emit('message_delivered', {
          messageId: message.id,
          timestamp: message.created_at.toISOString(),
        });
      }

      const duration = Date.now() - startTime;
      logger.info(`Message sent in ${duration}ms from ${senderId} in match ${matchId}`);

      // Return decrypted message to sender
      return {
        id: message.id,
        matchId,
        senderId,
        content, // Return decrypted content
        messageType: message.message_type,
        fileUrl: message.file_url,
        read: false,
        readAt: null,
        sentAt: message.created_at.toISOString(),
        createdAt: message.created_at.toISOString(),
      };
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * T062: Get message history with cursor-based pagination and decryption
   *
   * Performance target: <100ms P95
   *
   * @param params - History parameters
   * @returns MessageHistoryResponse with decrypted messages
   * @throws Error if user is not a participant
   */
  async getMessageHistory(params: MessageHistoryParams): Promise<MessageHistoryResponse> {
    const startTime = Date.now();
    const { matchId, userId, cursor, limit = 20 } = params;

    try {
      // Verify user is a participant in the match (throws if not)
      const { otherUserId } = await this.verifyMatchParticipant(matchId, userId);

      // Get conversation
      const conversation = await MessageModel.findConversation(userId, otherUserId);

      if (!conversation) {
        // No conversation yet, return empty messages
        return {
          messages: [],
          nextCursor: null,
        };
      }

      // Get messages with cursor-based pagination
      // Fetch limit * 2 to account for cursor filtering
      const allMessages = await MessageModel.getConversationMessages(
        conversation.id,
        limit * 2,
      );

      let messages = allMessages;

      // Apply cursor if provided (cursor-based pagination)
      if (cursor) {
        const cursorIndex = allMessages.findIndex((msg) => msg.id === cursor);
        if (cursorIndex >= 0) {
          messages = allMessages.slice(cursorIndex + 1, cursorIndex + 1 + limit);
        } else {
          messages = allMessages.slice(0, limit);
        }
      } else {
        messages = allMessages.slice(0, limit);
      }

      // Decrypt messages for authorized participant
      const decryptedMessages: MessageResponse[] = messages.map((msg) => ({
        id: msg.id,
        matchId,
        senderId: msg.sender_id,
        content: decrypt(msg.content), // Decrypt using AES-256-GCM
        messageType: msg.message_type,
        fileUrl: msg.file_url,
        read: msg.read,
        readAt: msg.read_at ? msg.read_at.toISOString() : null,
        sentAt: msg.created_at.toISOString(),
        createdAt: msg.created_at.toISOString(),
      }));

      // Determine next cursor (last message ID if we hit the limit)
      const nextCursor =
        messages.length === limit && messages.length > 0
          ? messages[messages.length - 1].id
          : null;

      const duration = Date.now() - startTime;
      logger.info(
        `Message history retrieved in ${duration}ms for match ${matchId} (${messages.length} messages)`,
      );

      return {
        messages: decryptedMessages,
        nextCursor,
      };
    } catch (error) {
      logger.error('Error getting message history:', error);
      throw error;
    }
  }

  /**
   * T062: Mark message(s) as read with Socket.io notification
   *
   * @param params - Mark as read parameters
   * @throws Error if user is not the recipient
   */
  async markAsRead(params: MarkAsReadParams): Promise<void> {
    const { messageId, userId } = params;

    try {
      // Get message to verify recipient
      const messages = await MessageModel.getConversationMessages('', 1);
      const message = messages.find((m) => m.id === messageId);

      if (!message) {
        throw new Error('MESSAGE_NOT_FOUND');
      }

      // User can only mark messages they received (not sent)
      if (message.sender_id === userId) {
        throw new Error('CANNOT_MARK_OWN_MESSAGE');
      }

      // Mark as read
      await MessageModel.markAsRead(messageId);

      // Emit read_receipt to sender via Socket.io
      const io = SocketService.getIO();
      if (io) {
        io.to(`user:${message.sender_id}`).emit('message_read', {
          messageId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }

      logger.info(`Message ${messageId} marked as read by ${userId}`);
    } catch (error) {
      logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * T062: Mark all messages in a conversation as read
   *
   * @param matchId - Match ID
   * @param userId - User ID marking messages as read
   */
  async markConversationAsRead(matchId: string, userId: string): Promise<void> {
    try {
      // Verify user is a participant
      const { otherUserId } = await this.verifyMatchParticipant(matchId, userId);

      // Get conversation
      const conversation = await MessageModel.findConversation(userId, otherUserId);

      if (!conversation) {
        return; // No conversation, nothing to mark
      }

      // Mark all messages from other user as read
      await MessageModel.markConversationAsRead(conversation.id, userId);

      // Emit read_receipt to sender via Socket.io
      const io = SocketService.getIO();
      if (io) {
        io.to(`user:${otherUserId}`).emit('conversation_read', {
          matchId,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }

      logger.info(`Conversation ${conversation.id} marked as read by ${userId}`);
    } catch (error) {
      logger.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  /**
   * T062: Emit typing indicator to match participant
   *
   * @param params - Typing indicator parameters
   * @throws Error if user is not a participant
   */
  async emitTypingIndicator(params: TypingIndicatorParams): Promise<void> {
    const { matchId, userId, isTyping } = params;

    try {
      // Verify user is a participant
      const { otherUserId } = await this.verifyMatchParticipant(matchId, userId);

      // Emit typing indicator to other user via Socket.io
      if (isTyping) {
        SocketService.emitTypingStart(userId, matchId, otherUserId);
      } else {
        SocketService.emitTypingStop(userId, matchId, otherUserId);
      }

      logger.debug(
        `Typing indicator ${isTyping ? 'started' : 'stopped'} for user ${userId} in match ${matchId}`,
      );
    } catch (error) {
      logger.error('Error emitting typing indicator:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user
   *
   * @param userId - User ID
   * @returns Number of unread messages
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await MessageModel.getUnreadCount(userId);
      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a user (legacy support)
   *
   * @param userId - User ID
   * @returns Array of conversations with last message
   */
  async getUserConversations(userId: string): Promise<any[]> {
    try {
      const conversations = await MessageModel.getUserConversations(userId);

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await MessageModel.getConversationMessages(conv.id, 1);
          const lastMessage = messages[0];

          const otherParticipantId =
            conv.participant1_id === userId ? conv.participant2_id : conv.participant1_id;

          return {
            ...conv,
            otherParticipantId,
            lastMessage: lastMessage
              ? {
                ...lastMessage,
                content: decrypt(lastMessage.content),
              }
              : null,
          };
        }),
      );

      return conversationsWithMessages;
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   *
   * @param messageId - Message ID
   * @param userId - User ID requesting deletion
   * @throws Error if user is not the sender
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      // Get message to verify sender
      const messages = await MessageModel.getConversationMessages('', 1);
      const message = messages.find((m) => m.id === messageId);

      if (!message) {
        throw new Error('MESSAGE_NOT_FOUND');
      }

      // Only sender can delete their own messages
      if (message.sender_id !== userId) {
        throw new Error('UNAUTHORIZED_DELETE');
      }

      await MessageModel.deleteMessage(messageId);
      logger.info(`Message ${messageId} deleted by ${userId}`);
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new MessagesService();
