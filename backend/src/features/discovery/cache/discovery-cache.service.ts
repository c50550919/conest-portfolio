/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import redisClient from '../../../config/redis';

/**
 * Discovery Cache Service
 *
 * Purpose: Redis caching for Discovery Screen profiles and swipe state
 * Constitution: Principle IV (Performance - reduce database load)
 *
 * Cache Strategy:
 * - Profile queues: 5 minute TTL (frequently changing due to swipes)
 * - Swipe state: 1 hour TTL (used for rate limiting and duplicate prevention)
 * - User profile data: 15 minute TTL (relatively static)
 *
 * Created: 2025-10-06
 */

const CACHE_KEYS = {
  PROFILE_QUEUE: (userId: string) => `discovery:queue:${userId}`,
  SWIPE_STATE: (userId: string, targetId: string) => `swipe:${userId}:${targetId}`,
  USER_PROFILE: (userId: string) => `profile:${userId}`,
  SWIPE_COUNT: (userId: string) => `swipe:count:${userId}`,
} as const;

const CACHE_TTL = {
  PROFILE_QUEUE: 300, // 5 minutes
  SWIPE_STATE: 3600, // 1 hour
  USER_PROFILE: 900, // 15 minutes
  SWIPE_COUNT: 900, // 15 minutes
} as const;

export interface ProfileCard {
  userId: string;
  firstName: string;
  age: number;
  city: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  childrenCount: number;
  childrenAgeGroups: string[];
  occupation: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  compatibilityScore: number;
  verified: boolean;
}

export class DiscoveryCacheService {
  /**
   * Cache profile queue for a user
   * @param userId - User ID
   * @param profiles - Array of profile cards
   */
  async cacheProfileQueue(userId: string, profiles: ProfileCard[]): Promise<void> {
    try {
      const key = CACHE_KEYS.PROFILE_QUEUE(userId);
      await redisClient.setex(key, CACHE_TTL.PROFILE_QUEUE, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error caching profile queue:', error);
      // Non-blocking: cache failure shouldn't break the app
    }
  }

  /**
   * Get cached profile queue for a user
   * @param userId - User ID
   * @returns Cached profiles or null if not found
   */
  async getCachedProfileQueue(userId: string): Promise<ProfileCard[] | null> {
    try {
      const key = CACHE_KEYS.PROFILE_QUEUE(userId);
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached profile queue:', error);
      return null;
    }
  }

  /**
   * Invalidate profile queue cache for a user (e.g., after swipe)
   * @param userId - User ID
   */
  async invalidateProfileQueue(userId: string): Promise<void> {
    try {
      const key = CACHE_KEYS.PROFILE_QUEUE(userId);
      await redisClient.del(key);
    } catch (error) {
      console.error('Error invalidating profile queue:', error);
    }
  }

  /**
   * Cache swipe state to prevent duplicates
   * @param userId - User ID
   * @param targetUserId - Target user ID
   * @param direction - Swipe direction
   * NOTE: Swipe functionality not currently used in grid-based interface
   */
  async cacheSwipeState(
    userId: string,
    targetUserId: string,
    direction: 'left' | 'right',
  ): Promise<void> {
    try {
      const key = CACHE_KEYS.SWIPE_STATE(userId, targetUserId);
      await redisClient.setex(key, CACHE_TTL.SWIPE_STATE, direction);
    } catch (error) {
      console.error('Error caching swipe state:', error);
    }
  }

  /**
   * Check if user has already swiped on target (cache check)
   * @param userId - User ID
   * @param targetUserId - Target user ID
   * @returns True if cached swipe exists
   */
  async hasCachedSwipe(userId: string, targetUserId: string): Promise<boolean> {
    try {
      const key = CACHE_KEYS.SWIPE_STATE(userId, targetUserId);
      const cached = await redisClient.exists(key);
      return cached === 1;
    } catch (error) {
      console.error('Error checking cached swipe:', error);
      return false;
    }
  }

  /**
   * Increment swipe count for rate limiting
   * @param userId - User ID
   * @returns Current swipe count
   */
  async incrementSwipeCount(userId: string): Promise<number> {
    try {
      const key = CACHE_KEYS.SWIPE_COUNT(userId);
      const count = await redisClient.incr(key);

      // Set TTL on first increment
      if (count === 1) {
        await redisClient.expire(key, CACHE_TTL.SWIPE_COUNT);
      }

      return count;
    } catch (error) {
      console.error('Error incrementing swipe count:', error);
      return 0;
    }
  }

  /**
   * Get current swipe count for rate limiting
   * @param userId - User ID
   * @returns Current swipe count
   */
  async getSwipeCount(userId: string): Promise<number> {
    try {
      const key = CACHE_KEYS.SWIPE_COUNT(userId);
      const count = await redisClient.get(key);
      return count ? parseInt(count) : 0;
    } catch (error) {
      console.error('Error getting swipe count:', error);
      return 0;
    }
  }

  /**
   * Reset swipe count (for testing or manual reset)
   * @param userId - User ID
   */
  async resetSwipeCount(userId: string): Promise<void> {
    try {
      const key = CACHE_KEYS.SWIPE_COUNT(userId);
      await redisClient.del(key);
    } catch (error) {
      console.error('Error resetting swipe count:', error);
    }
  }

  /**
   * Cache user profile data
   * @param userId - User ID
   * @param profile - Profile data
   */
  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    try {
      const key = CACHE_KEYS.USER_PROFILE(userId);
      await redisClient.setex(key, CACHE_TTL.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      console.error('Error caching user profile:', error);
    }
  }

  /**
   * Get cached user profile
   * @param userId - User ID
   * @returns Cached profile or null
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    try {
      const key = CACHE_KEYS.USER_PROFILE(userId);
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached user profile:', error);
      return null;
    }
  }

  /**
   * Invalidate user profile cache (e.g., after profile update)
   * @param userId - User ID
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    try {
      const key = CACHE_KEYS.USER_PROFILE(userId);
      await redisClient.del(key);
    } catch (error) {
      console.error('Error invalidating user profile:', error);
    }
  }

  /**
   * Clear all discovery-related cache for a user
   * @param userId - User ID
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const keys = [
        CACHE_KEYS.PROFILE_QUEUE(userId),
        CACHE_KEYS.USER_PROFILE(userId),
        CACHE_KEYS.SWIPE_COUNT(userId),
      ];
      await redisClient.del(keys);
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }
}

export default new DiscoveryCacheService();
