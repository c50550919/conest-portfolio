/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Socket.io Server Configuration
 *
 * Configures Socket.io with Redis adapter for horizontal scaling,
 * JWT authentication, and real-time event handling.
 *
 * Constitution Principles:
 * - Principle III: Security (JWT authentication required)
 * - Principle IV: Performance (<100ms message delivery, Redis pub/sub scaling)
 *
 * Features:
 * - Match notifications (mutual swipe detection)
 * - Typing indicators
 * - Presence updates (online/offline status)
 * - Message delivery
 */

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import logger from './logger';

// Redis clients for Socket.io adapter (pub/sub pattern)
const pubClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
});

const subClient = pubClient.duplicate();

// JWT secret for authentication - MUST be set in environment
if (!process.env.JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is required for WebSocket authentication',
  );
}
const JWT_SECRET: string = process.env.JWT_SECRET;

/**
 * Extended Socket interface with authenticated user data
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

/**
 * Singleton Socket.io instance
 * Initialized by initializeSocketIO() and accessible via getSocketIO()
 */
let ioInstance: Server | null = null;

/**
 * Get the Socket.io instance
 * @throws Error if Socket.io not initialized
 */
export function getSocketIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO() first.');
  }
  return ioInstance;
}

/**
 * Initialize Socket.io server with authentication and event handlers
 */
export function initializeSocketIO(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:19006',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Attach Redis adapter for horizontal scaling
  io.adapter(createAdapter(pubClient, subClient));

  // JWT authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      socket.userId = decoded.userId;
      socket.email = decoded.email;

      logger.info('Socket authenticated', { email: decoded.email, userId: decoded.userId });
      next();
    } catch (err) {
      logger.error('Socket authentication failed', { error: err });
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const { userId, email } = socket;
    logger.info('Client connected', { email, userId });

    // Join user-specific room for targeted notifications
    void socket.join(`user:${userId}`);

    // Emit presence update
    socket.broadcast.emit('user:online', { userId });

    // ========================================
    // CONNECTION REQUEST EVENTS
    // ========================================

    /**
     * Server emits when connection request received
     * Triggered by ConnectionRequestService.sendRequest()
     */
    // io.to(`user:${recipientId}`).emit('connection_request:received', { id, sender_id, sent_at })

    /**
     * Server emits when connection request accepted
     * Triggered by ConnectionRequestService.acceptRequest()
     */
    // io.to(`user:${senderId}`).emit('connection_request:accepted', { id, recipient_id, responded_at })

    /**
     * Server emits when connection request declined
     * Triggered by ConnectionRequestService.declineRequest()
     */
    // io.to(`user:${senderId}`).emit('connection_request:declined', { id, recipient_id, responded_at })

    /**
     * Server emits when connection request cancelled
     * Triggered by ConnectionRequestService.cancelRequest()
     */
    // io.to(`user:${recipientId}`).emit('connection_request:cancelled', { id, sender_id })

    // ========================================
    // MATCH EVENTS
    // ========================================

    /**
     * Server emits to both users when mutual match detected
     * Triggered by ConnectionRequestService when a request is accepted
     */
    // io.to(`user:${userId}`).emit('match:new', { matchId, otherUserId, compatibilityScore })

    // ========================================
    // MESSAGING EVENTS
    // ========================================

    /**
     * Client → Server: Typing indicator
     */
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
        userId,
        conversationId: data.conversationId,
      });
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        userId,
        conversationId: data.conversationId,
      });
    });

    /**
     * Client → Server: Join conversation room
     */
    socket.on('conversation:join', (data: { conversationId: string }) => {
      void socket.join(`conversation:${data.conversationId}`);
      logger.debug('User joined conversation', { userId, conversationId: data.conversationId });
    });

    /**
     * Client → Server: Leave conversation room
     */
    socket.on('conversation:leave', (data: { conversationId: string }) => {
      void socket.leave(`conversation:${data.conversationId}`);
      logger.debug('User left conversation', { userId, conversationId: data.conversationId });
    });

    /**
     * Server emits to conversation room when new message received
     * Triggered by MessagesService after POST /api/messages
     */
    // io.to(`conversation:${conversationId}`).emit('message:new', { messageId, senderId, content, timestamp })

    // ========================================
    // HOUSEHOLD EVENTS
    // ========================================

    /**
     * Client → Server: Join household room
     */
    socket.on('household:join', (data: { householdId: string }) => {
      void socket.join(`household:${data.householdId}`);
      logger.debug('User joined household', { userId, householdId: data.householdId });
    });

    /**
     * Server emits to household room when expense added/updated
     * Triggered by HouseholdService
     */
    // io.to(`household:${householdId}`).emit('expense:new', { expenseId, amount, payerId, type })

    // ========================================
    // DISCONNECTION
    // ========================================

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { email, userId });
      socket.broadcast.emit('user:offline', { userId });
    });

    // Error handler
    socket.on('error', (err: Error) => {
      logger.error('Socket error', { userId, error: err.message, stack: err.stack });
    });
  });

  // Redis adapter error handlers
  pubClient.on('error', (err) => {
    logger.error('Redis pub client error', { error: err.message });
  });

  subClient.on('error', (err) => {
    logger.error('Redis sub client error', { error: err.message });
  });

  logger.info('Socket.io server initialized with Redis adapter');

  // Store singleton instance
  ioInstance = io;

  return io;
}

/**
 * Graceful shutdown for Socket.io and Redis clients
 */
export async function closeSocketIO(io: Server): Promise<void> {
  await io.close();
  logger.info('Socket.io server closed');
  void pubClient.quit();
  void subClient.quit();
  ioInstance = null; // Clear singleton instance
}

export default initializeSocketIO;
