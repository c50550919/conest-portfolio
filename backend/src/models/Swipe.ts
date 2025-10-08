import db from '../config/database';

/**
 * Swipe Model
 *
 * Purpose: Database operations for swipe actions in Discovery Screen
 * Constitution: Principle I (Child Safety - NO child PII)
 *
 * Tracks user swipe actions (left/right) - FINAL (no undo in MVP)
 * Updated: 2025-10-06 (clarification: no undo functionality)
 */

export interface Swipe {
  id: string;
  user_id: string;
  target_user_id: string;
  direction: 'left' | 'right';
  swiped_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSwipeData {
  user_id: string;
  target_user_id: string;
  direction: 'left' | 'right';
}

export class SwipeModel {
  private tableName = 'swipes';

  /**
   * Create a new swipe
   */
  async create(data: CreateSwipeData): Promise<Swipe> {
    const [swipe] = await db(this.tableName)
      .insert({
        user_id: data.user_id,
        target_user_id: data.target_user_id,
        direction: data.direction,
        swiped_at: new Date(),
      })
      .returning('*');

    return swipe;
  }

  /**
   * Find swipe by ID
   */
  async findById(swipeId: string): Promise<Swipe | null> {
    const swipe = await db(this.tableName)
      .where({ id: swipeId })
      .first();

    return swipe || null;
  }

  /**
   * Check if user has already swiped on target
   * (Swipes are final - no undo in MVP)
   */
  async hasSwipedOn(userId: string, targetUserId: string): Promise<boolean> {
    const swipe = await db(this.tableName)
      .where({
        user_id: userId,
        target_user_id: targetUserId,
      })
      .first();

    return !!swipe;
  }

  /**
   * Get all users that the current user has swiped on
   */
  async getSwipedUserIds(userId: string): Promise<string[]> {
    const swipes = await db(this.tableName)
      .where({ user_id: userId })
      .select('target_user_id');

    return swipes.map(s => s.target_user_id);
  }

  /**
   * Check if both users swiped right (mutual interest)
   */
  async checkMutualRightSwipe(userId: string, targetUserId: string): Promise<boolean> {
    const mutualSwipes = await db(this.tableName)
      .where({
        user_id: targetUserId,
        target_user_id: userId,
        direction: 'right',
      })
      .first();

    return !!mutualSwipes;
  }

  /**
   * Get swipe count for rate limiting
   */
  async getSwipeCount(userId: string, windowMinutes: number = 15): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const result = await db(this.tableName)
      .where('user_id', userId)
      .where('swiped_at', '>=', windowStart)
      .count('* as count')
      .first();

    return parseInt(String(result?.count || '0'));
  }
}

export default new SwipeModel();
