import { Response } from 'express';
import DiscoveryService from '../services/DiscoveryService';
import SwipeService from '../services/SwipeService';
import {
  GetProfilesQuerySchema,
  SwipeBodySchema,
  ScreenshotBodySchema,
} from '../validators/discoverySchemas';
import { z } from 'zod';
import SocketService from '../services/SocketService';
import logger from '../config/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

/**
 * DiscoveryController
 *
 * Purpose: HTTP handlers for Discovery Screen endpoints
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * T057-T059: Discovery API Controller implementations
 * - getProfiles(): GET /api/discovery/profiles (<100ms P95, Redis cached)
 * - swipe(): POST /api/discovery/swipe (<50ms P95, Socket.io integration)
 * - reportScreenshot(): POST /api/discovery/screenshot (child safety)
 *
 * CRITICAL: ProfileCard contains ONLY childrenCount, childrenAgeGroups (NO child PII)
 *
 * Updated: 2025-10-06 (removed undo functionality)
 * Updated: 2025-10-08 (T057-T059 implementation with enhanced error handling)
 */

export class DiscoveryController {
  /**
   * T058: GET /api/discovery/profiles
   * Get discovery profiles with cursor-based pagination
   *
   * Performance: <100ms P95 (Redis cached)
   * Child Safety: 100% compliance - NO child PII in responses
   */
  getProfiles = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validate query params
      const query = GetProfilesQuerySchema.parse(req.query);

      // Get authenticated user ID from JWT
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
        return;
      }

      // Get profiles from service
      // FHA COMPLIANCE: Pass request context for audit logging
      const result = await DiscoveryService.getProfiles(
        userId,
        query.limit,
        query.cursor,
        {
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown'
        }
      );

      // Success response with ProfileCard[] + nextCursor
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      if (error instanceof Error) {
        // User not found or profile issues
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'User profile not found',
          });
          return;
        }
      }

      logger.error('Error getting profiles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profiles'
      });
    }
  });

  /**
   * T059: POST /api/discovery/swipe
   * Record a swipe action (left or right)
   *
   * Performance: <50ms P95
   * Socket.io: Emits match_created event to both users on mutual match
   * Rate Limit: 100 swipes per hour (enforced by swipeRateLimit middleware)
   */
  swipe = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validate request body
      const body = SwipeBodySchema.parse(req.body);

      // Get authenticated user ID from JWT
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
        return;
      }

      // Record swipe via SwipeService
      const result = await SwipeService.swipe(
        userId,
        body.targetUserId,
        body.direction
      );

      // Success response: { swipeId, matchCreated, match? }
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      if (error instanceof Error) {
        // Business logic errors
        if (
          error.message.includes('already swiped') ||
          error.message.includes('Cannot swipe on yourself')
        ) {
          res.status(400).json({
            success: false,
            error: error.message
          });
          return;
        }

        // Rate limit errors (additional server-side check beyond middleware)
        if (error.message.includes('Rate limit')) {
          res.status(429).json({
            success: false,
            error: error.message
          });
          return;
        }

        // Target user not found
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Target user not found'
          });
          return;
        }
      }

      logger.error('Error recording swipe:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record swipe'
      });
    }
  });

  /**
   * POST /api/discovery/screenshot
   * Report screenshot detection (child safety feature)
   *
   * Child Safety: Logs screenshot event, notifies profile owner via Socket.io
   * Security: Audit trail maintained for compliance
   */
  reportScreenshot = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validate request body
      const body = ScreenshotBodySchema.parse(req.body);

      // Get authenticated user ID from JWT
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
        return;
      }

      const { targetUserId } = body;

      // Log screenshot event for security audit (Constitution Principle I - Child Safety)
      logger.warn('Screenshot detected', {
        userId,
        targetUserId,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      // Emit real-time notification to profile owner via Socket.io
      SocketService.emitScreenshotDetected(userId, targetUserId);

      res.status(200).json({
        success: true,
        message: 'Screenshot event logged and notification sent',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      logger.error('Error reporting screenshot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to report screenshot'
      });
    }
  });
}

export default new DiscoveryController();
