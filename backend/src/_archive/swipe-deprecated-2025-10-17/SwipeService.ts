import SwipeModel from '../models/Swipe';
import db from '../config/database';
import { getCompatibilityScoreFromDb } from '../utils/compatibilityCalculator';
import DiscoveryCacheService from './cache/DiscoveryCacheService';
import SocketService from './SocketService';

export interface SwipeResult {
  swipeId: string;
  matchCreated: boolean;
  match?: {
    id: string;
    matchedUserId: string;
    compatibilityScore: number;
    createdAt: string;
  };
}

/**
 * ValidationError - Custom error for input validation failures
 */
export class ValidationError extends Error {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * SwipeService
 *
 * Purpose: Handle swipe actions and match creation
 * Updated: 2025-10-06 (no undo functionality)
 * Security: Input validation added 2025-10-07 (Constitution Principle III)
 */

export class SwipeService {
  /**
   * Validate swipe parameters before processing
   * @throws {ValidationError} if validation fails
   */
  private validateSwipeParams(userId: string, targetUserId: string): void {
    if (!userId || userId.trim() === '') {
      throw new ValidationError('User ID is required', 'userId');
    }

    if (!targetUserId || targetUserId.trim() === '') {
      throw new ValidationError('Target user ID is required', 'targetUserId');
    }

    if (userId === targetUserId) {
      throw new ValidationError('Cannot swipe on yourself', 'targetUserId');
    }
  }

  async swipe(userId: string, targetUserId: string, direction: 'left' | 'right'): Promise<SwipeResult> {
    // Validate inputs BEFORE any database operations (security-first)
    this.validateSwipeParams(userId, targetUserId);

    // Check cache first for faster duplicate detection
    const cachedSwipe = await DiscoveryCacheService.hasCachedSwipe(userId, targetUserId);
    if (cachedSwipe) throw new Error('You have already swiped on this user');

    // Double-check database (cache could be stale)
    const alreadySwiped = await SwipeModel.hasSwipedOn(userId, targetUserId);
    if (alreadySwiped) throw new Error('You have already swiped on this user');

    // Rate limiting check
    const swipeCount = await SwipeModel.getSwipeCount(userId, 15);
    if (swipeCount >= 5) throw new Error('Rate limit exceeded. Please try again in 15 minutes.');

    // Create swipe record
    const swipe = await SwipeModel.create({ user_id: userId, target_user_id: targetUserId, direction });

    // Cache swipe state
    await DiscoveryCacheService.cacheSwipeState(userId, targetUserId, direction);

    // Invalidate profile queue (user's queue has changed)
    await DiscoveryCacheService.invalidateProfileQueue(userId);

    let matchCreated = false;
    let match;

    if (direction === 'right') {
      const isMutual = await SwipeModel.checkMutualRightSwipe(userId, targetUserId);
      if (isMutual) {
        match = await this.createMatch(userId, targetUserId);
        matchCreated = true;

        // Invalidate both users' profile queues (they now have a match)
        await DiscoveryCacheService.invalidateProfileQueue(targetUserId);

        // Emit real-time match notification to both users
        SocketService.emitMatchCreated(userId, targetUserId, match);
      }
    }

    return { swipeId: swipe.id, matchCreated, match };
  }

  private async createMatch(userId: string, targetUserId: string): Promise<any> {
    const compatibilityScore = await getCompatibilityScoreFromDb(userId, targetUserId);

    const [match] = await db('matches')
      .insert({
        user1_id: userId,
        user2_id: targetUserId,
        compatibility_score: compatibilityScore,
        matched_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return {
      id: match.id,
      matchedUserId: targetUserId,
      compatibilityScore: match.compatibility_score,
      createdAt: match.matched_at.toISOString(),
    };
  }
}

export default new SwipeService();
