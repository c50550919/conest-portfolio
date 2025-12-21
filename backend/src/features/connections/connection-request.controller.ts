import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import ConnectionRequestService from './connection-request.service';

/**
 * ConnectionRequest Controller
 *
 * Feature: 003-complete-3-critical (Connection Requests)
 * Constitution Principle I: NO child PII - only parent communication
 * Constitution Principle III: Messages encrypted at rest
 * Constitution Principle IV: Rate limiting - 5/day, 15/week
 *
 * Endpoints:
 * - POST /api/connection-requests - Send a connection request
 * - GET /api/connection-requests/received - Get received requests
 * - GET /api/connection-requests/sent - Get sent requests
 * - PATCH /api/connection-requests/:id/accept - Accept a request
 * - PATCH /api/connection-requests/:id/decline - Decline a request
 * - PATCH /api/connection-requests/:id/cancel - Cancel a sent request
 * - GET /api/connection-requests/rate-limit-status - Get rate limit status
 * - GET /api/connection-requests/statistics - Get request statistics
 */

export class ConnectionRequestController {
  /**
   * Send a connection request
   * POST /api/connection-requests
   */
  async sendRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const senderId = req.userId;
      if (!senderId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { recipient_id, message } = req.body;

      const request = await ConnectionRequestService.sendRequest(
        senderId,
        recipient_id,
        message,
      );

      res.status(201).json({
        success: true,
        data: request,
        message: 'Connection request sent successfully',
      });
    } catch (error: any) {
      if (error.message === 'CONNECTION_REQUEST_ALREADY_EXISTS') {
        res.status(409).json({ error: 'You already have a pending or accepted connection with this user' });
        return;
      }
      if (error.message === 'CANNOT_SEND_REQUEST_TO_SELF') {
        res.status(400).json({ error: 'Cannot send connection request to yourself' });
        return;
      }
      if (error.message === 'RATE_LIMIT_DAILY_EXCEEDED') {
        res.status(429).json({
          error: 'Daily connection request limit reached (5 per day)',
          retry_after: 86400, // 24 hours in seconds
        });
        return;
      }
      if (error.message === 'RATE_LIMIT_WEEKLY_EXCEEDED') {
        res.status(429).json({
          error: 'Weekly connection request limit reached (15 per week)',
          retry_after: 604800, // 7 days in seconds
        });
        return;
      }
      if (error.message === 'MESSAGE_REQUIRED') {
        res.status(400).json({ error: 'Message is required' });
        return;
      }
      if (error.message === 'MESSAGE_TOO_LONG') {
        res.status(400).json({ error: 'Message must be 500 characters or less' });
        return;
      }
      next(error);
    }
  }

  /**
   * Get connection requests received by the current user
   * GET /api/connection-requests/received?status=<status>
   */
  async getReceivedRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { status } = req.query;

      const requests = await ConnectionRequestService.getReceivedRequests(
        userId,
        status as string,
      );

      res.status(200).json({
        success: true,
        data: requests,
        count: requests.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection requests sent by the current user
   * GET /api/connection-requests/sent?status=<status>
   */
  async getSentRequests(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { status } = req.query;

      const requests = await ConnectionRequestService.getSentRequests(
        userId,
        status as string,
      );

      res.status(200).json({
        success: true,
        data: requests,
        count: requests.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get decrypted message for a connection request
   * GET /api/connection-requests/:id/message
   */
  async getMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const message = await ConnectionRequestService.getMessage(id, userId);

      if (!message) {
        res.status(404).json({ error: 'Connection request not found or unauthorized' });
        return;
      }

      res.status(200).json({
        success: true,
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get decrypted response message for a connection request
   * GET /api/connection-requests/:id/response-message
   */
  async getResponseMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const responseMessage = await ConnectionRequestService.getResponseMessage(id, userId);

      if (!responseMessage) {
        res.status(404).json({ error: 'No response message found or unauthorized' });
        return;
      }

      res.status(200).json({
        success: true,
        data: { response_message: responseMessage },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept a connection request
   * PATCH /api/connection-requests/:id/accept
   */
  async acceptRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.userId;
      if (!recipientId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { response_message } = req.body;

      const request = await ConnectionRequestService.acceptRequest(
        id,
        recipientId,
        response_message,
      );

      res.status(200).json({
        success: true,
        data: request,
        message: 'Connection request accepted',
      });
    } catch (error: any) {
      if (error.message === 'CONNECTION_REQUEST_NOT_FOUND') {
        res.status(404).json({ error: 'Connection request not found' });
        return;
      }
      if (error.message === 'RESPONSE_MESSAGE_TOO_LONG') {
        res.status(400).json({ error: 'Response message must be 500 characters or less' });
        return;
      }
      next(error);
    }
  }

  /**
   * Decline a connection request
   * PATCH /api/connection-requests/:id/decline
   */
  async declineRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recipientId = req.userId;
      if (!recipientId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { response_message } = req.body;

      const request = await ConnectionRequestService.declineRequest(
        id,
        recipientId,
        response_message,
      );

      res.status(200).json({
        success: true,
        data: request,
        message: 'Connection request declined',
      });
    } catch (error: any) {
      if (error.message === 'CONNECTION_REQUEST_NOT_FOUND') {
        res.status(404).json({ error: 'Connection request not found' });
        return;
      }
      if (error.message === 'RESPONSE_MESSAGE_TOO_LONG') {
        res.status(400).json({ error: 'Response message must be 500 characters or less' });
        return;
      }
      next(error);
    }
  }

  /**
   * Cancel a sent connection request
   * PATCH /api/connection-requests/:id/cancel
   */
  async cancelRequest(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const senderId = req.userId;
      if (!senderId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const request = await ConnectionRequestService.cancelRequest(id, senderId);

      res.status(200).json({
        success: true,
        data: request,
        message: 'Connection request cancelled',
      });
    } catch (error: any) {
      if (error.message === 'CONNECTION_REQUEST_NOT_FOUND') {
        res.status(404).json({ error: 'Connection request not found or already responded to' });
        return;
      }
      next(error);
    }
  }

  /**
   * Get rate limit status for current user
   * GET /api/connection-requests/rate-limit-status
   */
  async getRateLimitStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const rateLimitStatus = await ConnectionRequestService.getRateLimitStatus(userId);

      res.status(200).json({
        success: true,
        data: rateLimitStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection request statistics for current user
   * GET /api/connection-requests/statistics
   */
  async getStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const statistics = await ConnectionRequestService.getStatistics(userId);

      res.status(200).json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ConnectionRequestController();
