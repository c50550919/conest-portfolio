import { Request, Response } from 'express';
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

/**
 * DiscoveryController
 *
 * Purpose: HTTP handlers for Discovery Screen endpoints
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Endpoints:
 * - GET /api/discovery/profiles - Get discovery profiles
 * - POST /api/discovery/swipe - Record swipe action (FINAL - no undo)
 *
 * Updated: 2025-10-06 (removed undo functionality)
 */

export class DiscoveryController {
  /**
   * GET /api/discovery/profiles
   * Get discovery profiles with cursor-based pagination
   */
  async getProfiles(req: Request, res: Response): Promise<void> {
    try {
      // Validate query params
      const query = GetProfilesQuerySchema.parse(req.query);

      // Get authenticated user ID from JWT
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get profiles
      const result = await DiscoveryService.getProfiles(
        userId,
        query.limit,
        query.cursor
      );

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      console.error('Error getting profiles:', error);
      res.status(500).json({ error: 'Failed to get profiles' });
    }
  }

  /**
   * POST /api/discovery/swipe
   * Record a swipe action (left or right)
   */
  async swipe(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const body = SwipeBodySchema.parse(req.body);

      // Get authenticated user ID
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Record swipe
      const result = await SwipeService.swipe(
        userId,
        body.targetUserId,
        body.direction
      );

      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      if (error instanceof Error) {
        // Business logic errors
        if (
          error.message.includes('already swiped') ||
          error.message.includes('Cannot swipe on yourself')
        ) {
          res.status(400).json({ error: error.message });
          return;
        }

        if (error.message.includes('Rate limit')) {
          res.status(429).json({ error: error.message });
          return;
        }
      }

      console.error('Error recording swipe:', error);
      res.status(500).json({ error: 'Failed to record swipe' });
    }
  }

  /**
   * POST /api/discovery/screenshot
   * Report screenshot detection (child safety feature)
   */
  async reportScreenshot(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const body = ScreenshotBodySchema.parse(req.body);

      // Get authenticated user ID
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { targetUserId } = body;

      // Log screenshot event for security audit
      logger.warn('Screenshot detected', {
        userId,
        targetUserId,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });

      // Emit real-time notification to profile owner
      SocketService.emitScreenshotDetected(userId, targetUserId);

      res.status(200).json({
        success: true,
        message: 'Screenshot event logged',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }

      console.error('Error reporting screenshot:', error);
      res.status(500).json({ error: 'Failed to report screenshot' });
    }
  }
}

export default new DiscoveryController();
