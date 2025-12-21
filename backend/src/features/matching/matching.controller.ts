import { Response } from 'express';
import { MatchingService } from './matching.service';
import { MatchModel } from '../../models/Match';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { logCompatibilityCalculation } from '../../services/auditService';

export const matchController = {
  findMatches: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { maxDistance, minScore, limit } = req.query;

    const preferences = {
      maxDistance: maxDistance ? Number(maxDistance) : undefined,
      minCompatibilityScore: minScore ? Number(minScore) : undefined,
      limit: limit ? Number(limit) : undefined,
    };

    const matches = await MatchingService.findMatches(req.userId, preferences);

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  }),

  createMatch: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { targetUserId } = req.body;

    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID required' });
      return;
    }

    // FHA COMPLIANCE: Pass request context for audit logging
    const match = await MatchingService.createMatch(
      req.userId,
      targetUserId,
      {
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      },
    );

    res.status(201).json({
      success: true,
      message: 'Match request created',
      data: match,
    });
  }),

  getMyMatches: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { status } = req.query;

    const matches = await MatchModel.findByUserId(req.userId, status as string);

    res.json({
      success: true,
      count: matches.length,
      data: matches,
    });
  }),

  getMatch: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const match = await MatchModel.findById(id);

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    res.json({
      success: true,
      data: match,
    });
  }),

  respondToMatch: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { accept } = req.body;

    if (accept === undefined) {
      res.status(400).json({ error: 'Accept parameter required' });
      return;
    }

    const match = await MatchingService.respondToMatch(id, req.userId, accept);

    res.json({
      success: true,
      message: accept ? 'Match accepted' : 'Match rejected',
      data: match,
    });
  }),

  /**
   * Calculate compatibility between current user and target user
   * WITHOUT creating a match. Returns 6-dimension breakdown.
   *
   * GET /api/matches/compatibility/:targetUserId
   *
   * Response: {
   *   success: true,
   *   data: {
   *     totalScore: 81.60,
   *     breakdown: {
   *       schedule: 85.00,
   *       parenting: 80.00,
   *       rules: 87.50,
   *       location: 95.00,
   *       budget: 60.00,
   *       lifestyle: 66.67
   *     }
   *   }
   * }
   */
  calculateCompatibility: asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { targetUserId } = req.params;

    if (!targetUserId) {
      res.status(400).json({ error: 'Target user ID required' });
      return;
    }

    // Get both profiles
    const { ProfileModel } = await import('../../models/Profile');
    const profile1 = await ProfileModel.findByUserId(req.userId);
    const profile2 = await ProfileModel.findByUserId(targetUserId);

    if (!profile1 || !profile2) {
      res.status(404).json({ error: 'One or both profiles not found' });
      return;
    }

    // Calculate compatibility WITHOUT creating match
    const compatibility = MatchingService.calculateCompatibility(profile1, profile2);

    // FHA COMPLIANCE: Audit log compatibility calculation
    try {
      await logCompatibilityCalculation(
        req.userId,
        targetUserId,
        compatibility,
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
      );
    } catch (auditError) {
      // Log audit errors but don't fail the compatibility calculation
      console.error('Failed to create audit log for compatibility calculation:', auditError);
    }

    res.json({
      success: true,
      data: {
        totalScore: compatibility.totalScore,
        breakdown: compatibility.breakdown,
      },
    });
  }),
};
