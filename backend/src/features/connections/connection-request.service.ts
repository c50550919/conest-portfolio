/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { ConnectionRequestModel } from '../../models/ConnectionRequest';
import type {
  ConnectionRequest,
  CreateConnectionRequestData,
  ConnectionRequestWithProfiles,
} from '../../models/ConnectionRequest';
import { getSocketIO } from '../../config/socket';
import SocketService from '../../services/SocketService';
import { getPushService } from '../../services/pushNotificationService';

/**
 * ConnectionRequestService
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * Business logic layer for connection requests
 * - Enforces rate limits (5/day, 15/week)
 * - Validates message length
 * - Handles status transitions
 * - Sends real-time notifications via Socket.io
 * - Creates matches on acceptance
 */

export class ConnectionRequestService {
  /**
   * Send a connection request with encrypted message
   * @throws Error if rate limit exceeded or validation fails
   */
  async sendRequest(
    senderId: string,
    recipientId: string,
    message: string,
  ): Promise<ConnectionRequest> {
    // Validate message length (max 500 chars)
    if (!message || message.trim().length === 0) {
      throw new Error('MESSAGE_REQUIRED');
    }

    if (message.length > 500) {
      throw new Error('MESSAGE_TOO_LONG');
    }

    const data: CreateConnectionRequestData = {
      sender_id: senderId,
      recipient_id: recipientId,
      message,
    };

    const request = await ConnectionRequestModel.create(data);

    // Send real-time notification to recipient
    try {
      const io = getSocketIO();
      io.to(`user:${recipientId}`).emit('connection_request:received', {
        id: request.id,
        sender_id: request.sender_id,
        sent_at: request.sent_at,
      });
    } catch (err) {
      console.warn('Socket.io not available for real-time notification:', err);
    }

    // Fire-and-forget push notification to recipient
    getPushService().sendToUser(recipientId, {
      title: 'New Connection Request',
      body: 'Someone wants to connect with you',
      data: { type: 'connection_request' },
    }).catch(() => { /* fire-and-forget */ });

    return request;
  }

  /**
   * Get all connection requests received by a user
   */
  async getReceivedRequests(
    userId: string,
    status?: string,
  ): Promise<ConnectionRequestWithProfiles[]> {
    return await ConnectionRequestModel.findByRecipientId(userId, status);
  }

  /**
   * Get all connection requests sent by a user
   */
  async getSentRequests(
    userId: string,
    status?: string,
  ): Promise<ConnectionRequestWithProfiles[]> {
    return await ConnectionRequestModel.findBySenderId(userId, status);
  }

  /**
   * Get decrypted message for a connection request
   */
  async getMessage(id: string, userId: string): Promise<string | null> {
    return await ConnectionRequestModel.getDecryptedMessage(id, userId);
  }

  /**
   * Get decrypted response message for a connection request
   */
  async getResponseMessage(id: string, userId: string): Promise<string | null> {
    return await ConnectionRequestModel.getDecryptedResponseMessage(id, userId);
  }

  /**
   * Accept a connection request
   * Creates a match and sends notification to sender
   * @param responseMessage Optional response message
   */
  async acceptRequest(
    id: string,
    recipientId: string,
    responseMessage?: string,
  ): Promise<ConnectionRequest> {
    // Validate response message length if provided
    if (responseMessage && responseMessage.length > 500) {
      throw new Error('RESPONSE_MESSAGE_TOO_LONG');
    }

    const request = await ConnectionRequestModel.accept(
      id,
      recipientId,
      responseMessage,
    );

    // Send real-time notification to sender
    try {
      const io = getSocketIO();
      io.to(`user:${request.sender_id}`).emit('connection_request:accepted', {
        id: request.id,
        recipient_id: request.recipient_id,
        responded_at: request.responded_at,
      });

      // Notify both users that they're now matched and can message
      SocketService.emitMatchCreated(request.sender_id, request.recipient_id, {
        id: request.id,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Socket.io not available for real-time notification:', err);
    }

    return request;
  }

  /**
   * Decline a connection request
   * Optionally sends response message to sender
   * @param responseMessage Optional response message
   */
  async declineRequest(
    id: string,
    recipientId: string,
    responseMessage?: string,
  ): Promise<ConnectionRequest> {
    // Validate response message length if provided
    if (responseMessage && responseMessage.length > 500) {
      throw new Error('RESPONSE_MESSAGE_TOO_LONG');
    }

    const request = await ConnectionRequestModel.decline(
      id,
      recipientId,
      responseMessage,
    );

    // Send real-time notification to sender
    try {
      const io = getSocketIO();
      io.to(`user:${request.sender_id}`).emit('connection_request:declined', {
        id: request.id,
        recipient_id: request.recipient_id,
        responded_at: request.responded_at,
      });
    } catch (err) {
      console.warn('Socket.io not available for real-time notification:', err);
    }

    return request;
  }

  /**
   * Cancel a sent connection request (sender only)
   */
  async cancelRequest(id: string, senderId: string): Promise<ConnectionRequest> {
    const request = await ConnectionRequestModel.cancel(id, senderId);

    // Send real-time notification to recipient
    try {
      const io = getSocketIO();
      io.to(`user:${request.recipient_id}`).emit('connection_request:cancelled', {
        id: request.id,
        sender_id: request.sender_id,
      });
    } catch (err) {
      console.warn('Socket.io not available for real-time notification:', err);
    }

    return request;
  }

  /**
   * Get rate limit status for a user
   * Returns remaining requests for today and this week
   */
  async getRateLimitStatus(
    userId: string,
  ): Promise<{ daily: number; weekly: number }> {
    return await ConnectionRequestModel.getRateLimitStatus(userId);
  }

  /**
   * Get connection request statistics for a user
   */
  async getStatistics(userId: string): Promise<{
    sent: {
      total: number;
      pending: number;
      accepted: number;
      declined: number;
      expired: number;
      cancelled: number;
    };
    received: {
      total: number;
      pending: number;
      accepted: number;
      declined: number;
      expired: number;
    };
    rateLimit: {
      daily: number;
      weekly: number;
    };
  }> {
    const [sent, received, rateLimit] = await Promise.all([
      ConnectionRequestModel.findBySenderId(userId),
      ConnectionRequestModel.findByRecipientId(userId),
      ConnectionRequestModel.getRateLimitStatus(userId),
    ]);

    return {
      sent: {
        total: sent.length,
        pending: sent.filter((r) => r.status === 'pending').length,
        accepted: sent.filter((r) => r.status === 'accepted').length,
        declined: sent.filter((r) => r.status === 'declined').length,
        expired: sent.filter((r) => r.status === 'expired').length,
        cancelled: sent.filter((r) => r.status === 'cancelled').length,
      },
      received: {
        total: received.length,
        pending: received.filter((r) => r.status === 'pending').length,
        accepted: received.filter((r) => r.status === 'accepted').length,
        declined: received.filter((r) => r.status === 'declined').length,
        expired: received.filter((r) => r.status === 'expired').length,
      },
      rateLimit,
    };
  }
}

export default new ConnectionRequestService();
