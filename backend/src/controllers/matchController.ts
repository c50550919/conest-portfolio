import { Response } from 'express';
import { MatchingService } from '../services/matchingService';
import { MatchModel } from '../models/Match';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

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

    const match = await MatchingService.createMatch(req.userId, targetUserId);

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
};
