/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { MessagingService } from '../features/messages/messaging.service';
import logger from '../config/logger';

export const initializeWebSocket = (server: HTTPServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:19006',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('JWT_SECRET environment variable is not configured');
        return next(new Error('Server configuration error'));
      }
      const decoded = jwt.verify(token, secret) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    logger.info(`User ${userId} connected via WebSocket`);

    // Join user's personal room
    void socket.join(`user:${userId}`);

    // Handle message sending
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, content, messageType, fileUrl } = data;

        const message = await MessagingService.sendMessage(
          userId,
          recipientId,
          content,
          messageType,
          fileUrl,
        );

        // Emit to recipient via MessagingService
        await MessagingService.handleRealtimeMessage(io, userId, recipientId, message);
      } catch (error: any) {
        socket.emit('error', { message: error.message });
        logger.error('Error sending message:', error);
      }
    });

    // T067: Handle typing:start indicator
    socket.on('typing:start', (data) => {
      const { matchId, recipientId } = data;

      // Validate data (basic validation, full validation in controller if needed)
      if (!matchId || !recipientId) {
        socket.emit('error', { message: 'matchId and recipientId are required for typing events' });
        return;
      }

      // Emit to recipient via SocketService
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SocketServiceModule = require('../services/SocketService').default;
      SocketServiceModule.emitTypingStart(userId, matchId, recipientId);
    });

    // T067: Handle typing:stop indicator
    socket.on('typing:stop', (data) => {
      const { matchId, recipientId } = data;

      // Validate data
      if (!matchId || !recipientId) {
        socket.emit('error', { message: 'matchId and recipientId are required for typing events' });
        return;
      }

      // Emit to recipient via SocketService
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SocketServiceModule = require('../services/SocketService').default;
      SocketServiceModule.emitTypingStop(userId, matchId, recipientId);
    });

    // Legacy typing indicator (backward compatibility)
    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      io.to(`user:${recipientId}`).emit('user_typing', {
        userId,
        isTyping,
      });
    });

    // Handle message read receipts
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;
        await MessagingService.markAsRead(conversationId, userId);

        // Notify other participant
        io.to(`conversation:${conversationId}`).emit('messages_read', {
          userId,
          conversationId,
        });
      } catch (error: any) {
        socket.emit('error', { message: error.message });
        logger.error('Error marking messages as read:', error);
      }
    });

    // Handle join conversation (for real-time updates)
    socket.on('join_conversation', (data) => {
      const { conversationId } = data;
      void socket.join(`conversation:${conversationId}`);
      logger.info(`User ${userId} joined conversation ${conversationId}`);
    });

    // Handle leave conversation
    socket.on('leave_conversation', (data) => {
      const { conversationId } = data;
      void socket.leave(`conversation:${conversationId}`);
      logger.info(`User ${userId} left conversation ${conversationId}`);
    });

    // Handle presence updates
    socket.on('presence_update', (data) => {
      const { status } = data; // 'online', 'away', 'busy'
      io.emit('user_presence', {
        userId,
        status,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User ${userId} disconnected from WebSocket`);
      io.emit('user_presence', {
        userId,
        status: 'offline',
        timestamp: new Date(),
      });
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('WebSocket server initialized');

  return io;
};
