/**
 * SwipeService Unit Tests
 *
 * Purpose: Test swipe logic, mutual match detection, and duplicate prevention
 * Constitution: Principle I (Child Safety - NO child PII), Principle II (Code Quality)
 *
 * Coverage Target: 85% minimum
 *
 * Created: 2025-10-06
 */

import { SwipeService } from '../../src/services/SwipeService';
import SwipeModel from '../../src/models/Swipe';
import DiscoveryCacheService from '../../src/services/cache/DiscoveryCacheService';
import SocketService from '../../src/services/SocketService';
import db from '../../src/config/database';
import { getCompatibilityScoreFromDb } from '../../src/utils/compatibilityCalculator';

// Mock dependencies
jest.mock('../../src/models/Swipe');
jest.mock('../../src/services/cache/DiscoveryCacheService');
jest.mock('../../src/services/SocketService');
jest.mock('../../src/config/database');
jest.mock('../../src/utils/compatibilityCalculator');

describe('SwipeService', () => {
  let swipeService: SwipeService;

  beforeEach(() => {
    swipeService = new SwipeService();
    jest.clearAllMocks();
  });

  describe('swipe()', () => {
    const userId = 'user1';
    const targetUserId = 'user2';

    beforeEach(() => {
      // Default mocks - successful swipe
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(0);
      (SwipeModel.create as jest.Mock).mockResolvedValue({
        id: 'swipe123',
        user_id: userId,
        target_user_id: targetUserId,
        direction: 'right',
        swiped_at: new Date(),
      });
      (DiscoveryCacheService.cacheSwipeState as jest.Mock).mockResolvedValue(undefined);
      (DiscoveryCacheService.invalidateProfileQueue as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully create a left swipe (pass)', async () => {
      const result = await swipeService.swipe(userId, targetUserId, 'left');

      expect(result).toEqual({
        swipeId: 'swipe123',
        matchCreated: false,
      });

      expect(SwipeModel.create).toHaveBeenCalledWith({
        user_id: userId,
        target_user_id: targetUserId,
        direction: 'left',
      });

      expect(DiscoveryCacheService.cacheSwipeState).toHaveBeenCalledWith(
        userId,
        targetUserId,
        'left'
      );

      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledWith(userId);
    });

    it('should successfully create a right swipe (like) without match', async () => {
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      expect(result).toEqual({
        swipeId: 'swipe123',
        matchCreated: false,
      });

      expect(SwipeModel.checkMutualRightSwipe).toHaveBeenCalledWith(userId, targetUserId);
      expect(SocketService.emitMatchCreated).not.toHaveBeenCalled();
    });

    it('should create a match when both users swipe right (mutual match)', async () => {
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(true);
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(87);

      const mockMatch = {
        id: 'match123',
        user1_id: userId,
        user2_id: targetUserId,
        compatibility_score: 87,
        matched_at: new Date('2025-10-06T14:30:00.000Z'),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockMatch]),
        }),
      });

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      expect(result.matchCreated).toBe(true);
      expect(result.match).toEqual({
        id: 'match123',
        matchedUserId: targetUserId,
        compatibilityScore: 87,
        createdAt: '2025-10-06T14:30:00.000Z',
      });

      // Should invalidate both users' queues
      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledWith(userId);
      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledWith(targetUserId);

      // Should emit Socket.io event
      expect(SocketService.emitMatchCreated).toHaveBeenCalledWith(
        userId,
        targetUserId,
        result.match
      );
    });

    it('should prevent swiping on yourself', async () => {
      await expect(swipeService.swipe(userId, userId, 'right')).rejects.toThrow(
        'Cannot swipe on yourself'
      );

      expect(SwipeModel.create).not.toHaveBeenCalled();
    });

    it('should prevent duplicate swipes (cache hit)', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(true);

      await expect(swipeService.swipe(userId, targetUserId, 'right')).rejects.toThrow(
        'You have already swiped on this user'
      );

      expect(SwipeModel.create).not.toHaveBeenCalled();
    });

    it('should prevent duplicate swipes (database check)', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(true);

      await expect(swipeService.swipe(userId, targetUserId, 'right')).rejects.toThrow(
        'You have already swiped on this user'
      );

      expect(SwipeModel.create).not.toHaveBeenCalled();
    });

    it('should enforce rate limiting (5 swipes per 15 minutes)', async () => {
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(5);

      await expect(swipeService.swipe(userId, targetUserId, 'right')).rejects.toThrow(
        'Rate limit exceeded. Please try again in 15 minutes.'
      );

      expect(SwipeModel.create).not.toHaveBeenCalled();
    });

    it('should allow swipe when under rate limit', async () => {
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(4);

      const result = await swipeService.swipe(userId, targetUserId, 'left');

      expect(result.swipeId).toBe('swipe123');
      expect(SwipeModel.create).toHaveBeenCalled();
    });

    it('should check cache before database for duplicate detection (performance)', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(true);

      await expect(swipeService.swipe(userId, targetUserId, 'right')).rejects.toThrow(
        'You have already swiped on this user'
      );

      // Cache check should prevent database query
      expect(SwipeModel.hasSwipedOn).not.toHaveBeenCalled();
    });

    it('should check database when cache misses (fallback)', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(true);

      await expect(swipeService.swipe(userId, targetUserId, 'right')).rejects.toThrow(
        'You have already swiped on this user'
      );

      expect(SwipeModel.hasSwipedOn).toHaveBeenCalledWith(userId, targetUserId);
    });
  });

  describe('Mutual Match Detection', () => {
    const userId = 'user1';
    const targetUserId = 'user2';

    beforeEach(() => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(0);
      (SwipeModel.create as jest.Mock).mockResolvedValue({
        id: 'swipe123',
        user_id: userId,
        target_user_id: targetUserId,
        direction: 'right',
        swiped_at: new Date(),
      });
      (DiscoveryCacheService.cacheSwipeState as jest.Mock).mockResolvedValue(undefined);
      (DiscoveryCacheService.invalidateProfileQueue as jest.Mock).mockResolvedValue(undefined);
    });

    it('should NOT create match when only one user swiped right', async () => {
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(false);

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      expect(result.matchCreated).toBe(false);
      expect(result.match).toBeUndefined();
      expect(SocketService.emitMatchCreated).not.toHaveBeenCalled();
    });

    it('should create match ONLY when both users swipe right', async () => {
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(true);
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(92);

      const mockMatch = {
        id: 'match456',
        user1_id: userId,
        user2_id: targetUserId,
        compatibility_score: 92,
        matched_at: new Date('2025-10-06T15:00:00.000Z'),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockMatch]),
        }),
      });

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      expect(result.matchCreated).toBe(true);
      expect(result.match).toBeDefined();
      expect(result.match?.matchedUserId).toBe(targetUserId);
      expect(result.match?.compatibilityScore).toBe(92);
    });

    it('should NOT check for mutual match when user swipes left', async () => {
      const result = await swipeService.swipe(userId, targetUserId, 'left');

      expect(result.matchCreated).toBe(false);
      expect(SwipeModel.checkMutualRightSwipe).not.toHaveBeenCalled();
    });

    it('should calculate compatibility score when creating match', async () => {
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(true);
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(78);

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'match789',
              user1_id: userId,
              user2_id: targetUserId,
              compatibility_score: 78,
              matched_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]),
        }),
      });

      await swipeService.swipe(userId, targetUserId, 'right');

      expect(getCompatibilityScoreFromDb).toHaveBeenCalledWith(userId, targetUserId);
    });
  });

  describe('Match Creation', () => {
    const userId = 'user1';
    const targetUserId = 'user2';

    beforeEach(() => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(0);
      (SwipeModel.create as jest.Mock).mockResolvedValue({
        id: 'swipe123',
        user_id: userId,
        target_user_id: targetUserId,
        direction: 'right',
        swiped_at: new Date(),
      });
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(true);
      (DiscoveryCacheService.cacheSwipeState as jest.Mock).mockResolvedValue(undefined);
      (DiscoveryCacheService.invalidateProfileQueue as jest.Mock).mockResolvedValue(undefined);
    });

    it('should store match in database with correct fields', async () => {
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(85);

      const mockInsert = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([
          {
            id: 'match999',
            user1_id: userId,
            user2_id: targetUserId,
            compatibility_score: 85,
            matched_at: new Date('2025-10-06T16:00:00.000Z'),
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]),
      });

      (db as any).mockReturnValue({
        insert: mockInsert,
      });

      await swipeService.swipe(userId, targetUserId, 'right');

      expect(db).toHaveBeenCalledWith('matches');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user1_id: userId,
          user2_id: targetUserId,
          compatibility_score: 85,
        })
      );
    });

    it('should return match object with correct structure', async () => {
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(90);

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'match111',
              user1_id: userId,
              user2_id: targetUserId,
              compatibility_score: 90,
              matched_at: new Date('2025-10-06T17:00:00.000Z'),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]),
        }),
      });

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      expect(result.match).toEqual({
        id: 'match111',
        matchedUserId: targetUserId,
        compatibilityScore: 90,
        createdAt: '2025-10-06T17:00:00.000Z',
      });
    });

    it('should invalidate both users profile queues on match', async () => {
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(88);

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'match222',
              user1_id: userId,
              user2_id: targetUserId,
              compatibility_score: 88,
              matched_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]),
        }),
      });

      await swipeService.swipe(userId, targetUserId, 'right');

      // Both users' queues should be invalidated
      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledWith(userId);
      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledWith(targetUserId);
      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledTimes(2);
    });

    it('should emit Socket.io event to both users on match', async () => {
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(95);

      const mockMatch = {
        id: 'match333',
        user1_id: userId,
        user2_id: targetUserId,
        compatibility_score: 95,
        matched_at: new Date('2025-10-06T18:00:00.000Z'),
        created_at: new Date(),
        updated_at: new Date(),
      };

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockMatch]),
        }),
      });

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      expect(SocketService.emitMatchCreated).toHaveBeenCalledWith(
        userId,
        targetUserId,
        expect.objectContaining({
          id: 'match333',
          matchedUserId: targetUserId,
          compatibilityScore: 95,
        })
      );
    });
  });

  describe('Cache Integration', () => {
    const userId = 'user1';
    const targetUserId = 'user2';

    beforeEach(() => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(0);
      (SwipeModel.create as jest.Mock).mockResolvedValue({
        id: 'swipe123',
        user_id: userId,
        target_user_id: targetUserId,
        direction: 'right',
        swiped_at: new Date(),
      });
      (DiscoveryCacheService.cacheSwipeState as jest.Mock).mockResolvedValue(undefined);
      (DiscoveryCacheService.invalidateProfileQueue as jest.Mock).mockResolvedValue(undefined);
    });

    it('should cache swipe state after successful swipe', async () => {
      await swipeService.swipe(userId, targetUserId, 'right');

      expect(DiscoveryCacheService.cacheSwipeState).toHaveBeenCalledWith(
        userId,
        targetUserId,
        'right'
      );
    });

    it('should invalidate profile queue after swipe', async () => {
      await swipeService.swipe(userId, targetUserId, 'left');

      expect(DiscoveryCacheService.invalidateProfileQueue).toHaveBeenCalledWith(userId);
    });

    it('should check cache before database (performance optimization)', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(true);

      await expect(swipeService.swipe(userId, targetUserId, 'right')).rejects.toThrow();

      // Should use cache result without querying database
      expect(DiscoveryCacheService.hasCachedSwipe).toHaveBeenCalledWith(userId, targetUserId);
      expect(SwipeModel.hasSwipedOn).not.toHaveBeenCalled();
    });

    it('should fall back to database when cache unavailable', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);

      await swipeService.swipe(userId, targetUserId, 'right');

      // Should check both cache and database
      expect(DiscoveryCacheService.hasCachedSwipe).toHaveBeenCalledWith(userId, targetUserId);
      expect(SwipeModel.hasSwipedOn).toHaveBeenCalledWith(userId, targetUserId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty userId', async () => {
      await expect(swipeService.swipe('', 'user2', 'right')).rejects.toThrow();
    });

    it('should handle empty targetUserId', async () => {
      await expect(swipeService.swipe('user1', '', 'right')).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(0);
      (SwipeModel.create as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await expect(swipeService.swipe('user1', 'user2', 'right')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle cache service errors gracefully', async () => {
      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed')
      );

      await expect(swipeService.swipe('user1', 'user2', 'right')).rejects.toThrow(
        'Redis connection failed'
      );
    });
  });

  describe('Child Safety Compliance', () => {
    it('should NEVER include child PII in match object', async () => {
      const userId = 'user1';
      const targetUserId = 'user2';

      (DiscoveryCacheService.hasCachedSwipe as jest.Mock).mockResolvedValue(false);
      (SwipeModel.hasSwipedOn as jest.Mock).mockResolvedValue(false);
      (SwipeModel.getSwipeCount as jest.Mock).mockResolvedValue(0);
      (SwipeModel.create as jest.Mock).mockResolvedValue({
        id: 'swipe123',
        user_id: userId,
        target_user_id: targetUserId,
        direction: 'right',
        swiped_at: new Date(),
      });
      (SwipeModel.checkMutualRightSwipe as jest.Mock).mockResolvedValue(true);
      (getCompatibilityScoreFromDb as jest.Mock).mockResolvedValue(87);
      (DiscoveryCacheService.cacheSwipeState as jest.Mock).mockResolvedValue(undefined);
      (DiscoveryCacheService.invalidateProfileQueue as jest.Mock).mockResolvedValue(undefined);

      (db as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            {
              id: 'match444',
              user1_id: userId,
              user2_id: targetUserId,
              compatibility_score: 87,
              matched_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            },
          ]),
        }),
      });

      const result = await swipeService.swipe(userId, targetUserId, 'right');

      // Match object should ONLY contain allowed fields
      expect(result.match).not.toHaveProperty('childrenNames');
      expect(result.match).not.toHaveProperty('children_names');
      expect(result.match).not.toHaveProperty('childrenPhotos');
      expect(result.match).not.toHaveProperty('children_photos');
      expect(result.match).not.toHaveProperty('childrenAges');
      expect(result.match).not.toHaveProperty('children_ages');
      expect(result.match).not.toHaveProperty('childrenSchools');
      expect(result.match).not.toHaveProperty('children_schools');

      // Should only have match metadata
      expect(result.match).toHaveProperty('id');
      expect(result.match).toHaveProperty('matchedUserId');
      expect(result.match).toHaveProperty('compatibilityScore');
      expect(result.match).toHaveProperty('createdAt');
    });
  });
});
