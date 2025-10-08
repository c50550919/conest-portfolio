/**
 * Message Controller (T065 & T066)
 *
 * Updated for Wave 4: Real-time Messaging System
 * - GET /api/messages/:matchId/history - Message history with encryption
 * - POST /api/messages - Send encrypted message with real-time delivery
 *
 * Constitution Principle III (Security) - End-to-end encryption
 * Constitution Principle IV (Performance) - <100ms P95 for history, <50ms P95 for send
 */

import { Response } from 'express';
import { MessagingService } from '../services/messagingService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { SendMessageSchema, GetMessageHistorySchema } from '../validators/messageSchemas';
import MessagesService from '../services/MessagesService';

export const messageController = {
  /**
   * T065: GET /api/messages/:matchId/history
   * Get message history for a match with pagination and decryption
   */
  getMessageHistory: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      // Validate params and query
      const validation = GetMessageHistorySchema.safeParse({
        params: req.params,
        query: req.query,
      });

      if (!validation.success) {
        res.status(422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { matchId } = validation.data.params;
      const { limit, cursor } = validation.data.query;

      // Use MessagesService to get message history
      const result = await MessagesService.getMessageHistory({
        matchId,
        userId: req.userId,
        cursor,
        limit,
      });

      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error getting message history:', error);

      // Handle specific errors
      if (error.message === 'MATCH_NOT_FOUND') {
        res.status(404).json({
          error: 'Match not found',
          message: 'The specified match does not exist',
        });
        return;
      }

      if (error.message === 'FORBIDDEN_NOT_PARTICIPANT') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You are not a participant in this match',
        });
        return;
      }

      if (error.message === 'MATCH_NOT_ACCEPTED') {
        res.status(403).json({
          error: 'Match not accepted',
          message: 'Messages can only be viewed in accepted matches',
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve message history',
      });
    }
  }),

  /**
   * T066: POST /api/messages
   * Send encrypted message with real-time Socket.io delivery
   * (Updated implementation, replaces legacy sendMessage)
   */
  sendMessage: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      // Validate request body
      const validation = SendMessageSchema.safeParse(req.body);

      if (!validation.success) {
        const isEmptyError =
          validation.error.errors[0].message.includes('empty') ||
          validation.error.errors[0].message.includes('whitespace');

        res.status(isEmptyError ? 400 : 422).json({
          error: 'Validation failed',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        });
        return;
      }

      const { matchId, content, messageType, fileUrl } = validation.data;

      // Use MessagesService to send message
      const message = await MessagesService.sendMessage({
        matchId,
        senderId: req.userId,
        content,
        messageType,
        fileUrl: fileUrl || undefined,
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Handle specific errors
      if (error.message === 'MATCH_NOT_FOUND') {
        res.status(404).json({
          error: 'Match not found',
          message: 'The specified match does not exist',
        });
        return;
      }

      if (error.message === 'FORBIDDEN_NOT_PARTICIPANT') {
        res.status(403).json({
          error: 'Forbidden',
          message: 'You are not a participant in this match',
        });
        return;
      }

      if (error.message === 'MATCH_NOT_ACCEPTED') {
        res.status(403).json({
          error: 'Match not accepted',
          message: 'Messages can only be sent in accepted matches',
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to send message',
      });
    }
  }),

  getConversation: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;
    const { limit } = req.query;

    const conversation = await MessagingService.getConversation(
      req.userId,
      userId,
      limit ? Number(limit) : undefined
    );

    res.json({
      success: true,
      data: conversation,
    });
  }),

  getConversations: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const conversations = await MessagingService.getUserConversations(req.userId);

    res.json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  }),

  markAsRead: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conversationId } = req.params;

    await MessagingService.markAsRead(conversationId, req.userId);

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  }),

  deleteMessage: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { messageId } = req.params;

    await MessagingService.deleteMessage(messageId, req.userId);

    res.json({
      success: true,
      message: 'Message deleted',
    });
  }),

  getUnreadCount: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const count = await MessagingService.getUnreadCount(req.userId);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  }),
};
