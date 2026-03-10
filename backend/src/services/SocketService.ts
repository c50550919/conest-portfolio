/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Server } from 'socket.io';

/**
 * Socket Service
 *
 * Purpose: Singleton to access Socket.io instance for real-time events
 * Constitution: Principle IV (Performance - real-time notifications)
 *
 * Events:
 * - match_created: Notify both users when mutual match occurs
 * - swipe_received: Notify user when someone swipes right on them (premium feature)
 *
 * Created: 2025-10-06
 */

class SocketService {
  private io: Server | null = null;

  /**
   * Set Socket.io instance (called during server initialization)
   * @param ioInstance - Socket.io server instance
   */
  setIO(ioInstance: Server): void {
    this.io = ioInstance;
  }

  /**
   * Get Socket.io instance
   * @returns Socket.io server instance or null if not initialized
   */
  getIO(): Server | null {
    return this.io;
  }

  /**
   * Emit match created event to both users
   * @param user1Id - First user ID
   * @param user2Id - Second user ID
   * @param matchData - Match details
   */
  emitMatchCreated(user1Id: string, user2Id: string, matchData: any): void {
    if (!this.io) {
      console.warn('Socket.io not initialized, skipping match notification');
      return;
    }

    // Notify both users
    this.io.to(`user:${user1Id}`).emit('match_created', {
      matchId: matchData.id,
      matchedUserId: user2Id,
      compatibilityScore: matchData.compatibilityScore,
      createdAt: matchData.createdAt,
    });

    this.io.to(`user:${user2Id}`).emit('match_created', {
      matchId: matchData.id,
      matchedUserId: user1Id,
      compatibilityScore: matchData.compatibilityScore,
      createdAt: matchData.createdAt,
    });
  }

  /**
   * Emit swipe received event (premium feature)
   * @param targetUserId - User who received the swipe
   * @param swiperId - User who swiped
   */
  emitSwipeReceived(targetUserId: string, swiperId: string): void {
    if (!this.io) {
      console.warn('Socket.io not initialized, skipping swipe notification');
      return;
    }

    this.io.to(`user:${targetUserId}`).emit('swipe_received', {
      swiperId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit screenshot detected event
   * @param userId - User who took screenshot
   * @param targetUserId - User whose profile was screenshot
   */
  emitScreenshotDetected(userId: string, targetUserId: string): void {
    if (!this.io) {
      console.warn('Socket.io not initialized, skipping screenshot notification');
      return;
    }

    // Notify the profile owner
    this.io.to(`user:${targetUserId}`).emit('screenshot_detected', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * T067: Emit typing:start event
   * @param userId - User who started typing
   * @param matchId - Match ID
   * @param recipientId - User who should receive the typing indicator
   */
  emitTypingStart(userId: string, matchId: string, recipientId: string): void {
    if (!this.io) {
      console.warn('Socket.io not initialized, skipping typing:start event');
      return;
    }

    this.io.to(`user:${recipientId}`).emit('typing:start', {
      userId,
      matchId,
      isTyping: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * T067: Emit typing:stop event
   * @param userId - User who stopped typing
   * @param matchId - Match ID
   * @param recipientId - User who should receive the typing indicator
   */
  emitTypingStop(userId: string, matchId: string, recipientId: string): void {
    if (!this.io) {
      console.warn('Socket.io not initialized, skipping typing:stop event');
      return;
    }

    this.io.to(`user:${recipientId}`).emit('typing:stop', {
      userId,
      matchId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    });
  }
}

export default new SocketService();
