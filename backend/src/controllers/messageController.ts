import { Response } from 'express';
import { MessagingService } from '../services/messagingService';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const messageController = {
  sendMessage: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { recipient_id, content, message_type, file_url } = req.body;

    if (!recipient_id || !content) {
      res.status(400).json({ error: 'Recipient ID and content required' });
      return;
    }

    const message = await MessagingService.sendMessage(
      req.userId,
      recipient_id,
      content,
      message_type,
      file_url
    );

    res.status(201).json({
      success: true,
      data: message,
    });
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
