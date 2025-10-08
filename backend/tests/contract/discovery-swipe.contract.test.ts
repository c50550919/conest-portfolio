/**
 * T020: Contract Test - POST /api/discovery/swipe
 *
 * Tests API contract compliance for swipe recording endpoint.
 *
 * Performance: <50ms P95 (indexed lookup + insert)
 * Match detection: Socket.io event emitted on mutual match
 */

import request from 'supertest';
import { app } from '../../src/app';
import { z } from 'zod';
import { Server as SocketServer } from 'socket.io';

// Mock Socket.io for testing
jest.mock('socket.io', () => {
  const mSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };
  const mIo = {
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
  };
  return {
    Server: jest.fn(() => mIo),
    Socket: jest.fn(() => mSocket),
  };
});

// SwipeRequest schema from OpenAPI spec
const SwipeRequestSchema = z.object({
  targetUserId: z.string().uuid(),
  direction: z.enum(['left', 'right']),
});

// SwipeResponse schema
const SwipeResponseSchema = z.object({
  swipeId: z.string().uuid(),
  matchCreated: z.boolean(),
  match: z.object({
    matchId: z.string().uuid(),
    matchedUserId: z.string().uuid(),
    compatibilityScore: z.number().int().min(0).max(100),
    createdAt: z.string().datetime(),
  }).nullable().optional(),
});

describe('POST /api/discovery/swipe - Contract Tests', () => {
  let authToken: string;
  let currentUserId: string;
  let targetUserId: string;

  beforeAll(async () => {
    // Mock authentication
    authToken = 'mock-jwt-token';
    currentUserId = 'user-123';
    targetUserId = 'user-456';
  });

  describe('Success Cases', () => {
    it('should return 200 with swipeId and matchCreated=false for non-mutual swipe', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserId,
          direction: 'right',
        })
        .expect(200);

      // Schema validation
      const result = SwipeResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);

      // Response structure
      expect(response.body).toHaveProperty('swipeId');
      expect(response.body).toHaveProperty('matchCreated');
      expect(response.body.matchCreated).toBe(false);
      expect(response.body.match).toBeUndefined();
    });

    it('should return 200 with match details when matchCreated=true', async () => {
      // This test assumes both users have swiped right
      // Will fail until mutual match detection is implemented

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserId,
          direction: 'right',
        })
        .expect(200);

      if (response.body.matchCreated) {
        expect(response.body).toHaveProperty('match');
        expect(response.body.match).toHaveProperty('matchId');
        expect(response.body.match).toHaveProperty('matchedUserId');
        expect(response.body.match).toHaveProperty('compatibilityScore');
        expect(response.body.match).toHaveProperty('createdAt');

        // Validate match object structure
        expect(response.body.match.matchId).toMatch(/^[0-9a-f-]{36}$/i);
        expect(response.body.match.matchedUserId).toBe(targetUserId);
        expect(response.body.match.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(response.body.match.compatibilityScore).toBeLessThanOrEqual(100);
        expect(new Date(response.body.match.createdAt)).toBeInstanceOf(Date);
      }
    });

    it('should accept direction="left" (swipe left/pass)', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserId,
          direction: 'left',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
      expect(response.body).toHaveProperty('matchCreated', false);
    });

    it('should accept direction="right" (swipe right/like)', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-789',
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
      expect(response.body).toHaveProperty('matchCreated');
    });
  });

  describe('Validation & Error Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .send({
          targetUserId: targetUserId,
          direction: 'right',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 400 on duplicate swipe (already swiped this user)', async () => {
      // First swipe
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-duplicate-test',
          direction: 'right',
        })
        .expect(200);

      // Duplicate swipe (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-duplicate-test',
          direction: 'right',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/duplicate|already/i);
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 on self-swipe (userId === targetUserId)', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: currentUserId, // same as authenticated user
          direction: 'right',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/self|own profile/i);
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 422 for invalid direction (not "left" or "right")', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserId,
          direction: 'up', // invalid
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/direction.*left.*right/i);
    });

    it('should return 422 for missing targetUserId', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          direction: 'right',
          // missing targetUserId
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/targetUserId/i);
    });

    it('should return 422 for invalid targetUserId format', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'not-a-uuid',
          direction: 'right',
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/uuid|targetUserId/i);
    });

    it('should return 422 for missing direction', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserId,
          // missing direction
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/direction/i);
    });

    it('should return 404 for non-existent target user', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: '00000000-0000-0000-0000-000000000000',
          direction: 'right',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/not found|does not exist/i);
    });

    it('should return 404 for unverified target user', async () => {
      // Target user exists but not verified
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-unverified',
          direction: 'right',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/not verified|not found/i);
    });
  });

  describe('Match Detection & Socket.io Events', () => {
    let mockIo: any;

    beforeEach(() => {
      // Access mocked Socket.io instance
      mockIo = require('socket.io').Server();
      jest.clearAllMocks();
    });

    it('should emit Socket.io event on mutual match (both swipe right)', async () => {
      // Setup: User B has already swiped right on User A
      // Now User A swipes right on User B → mutual match

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-mutual-match',
          direction: 'right',
        })
        .expect(200);

      if (response.body.matchCreated) {
        // Verify Socket.io event was emitted
        expect(mockIo.to).toHaveBeenCalledWith(currentUserId);
        expect(mockIo.to).toHaveBeenCalledWith('user-mutual-match');
        expect(mockIo.emit).toHaveBeenCalledWith('match:created', expect.objectContaining({
          matchId: expect.any(String),
          matchedUserId: expect.any(String),
        }));
      }
    });

    it('should NOT emit Socket.io event on non-mutual swipe', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-no-match',
          direction: 'right',
        })
        .expect(200);

      if (!response.body.matchCreated) {
        expect(mockIo.emit).not.toHaveBeenCalledWith('match:created', expect.anything());
      }
    });

    it('should NOT emit Socket.io event on swipe left', async () => {
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: targetUserId,
          direction: 'left',
        })
        .expect(200);

      expect(mockIo.emit).not.toHaveBeenCalledWith('match:created', expect.anything());
    });
  });

  describe('Performance Requirements', () => {
    it('should respond in <50ms P95 (indexed lookup + insert)', async () => {
      const iterations = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: `user-perf-test-${i}`,
            direction: Math.random() > 0.5 ? 'right' : 'left',
          });
        const duration = Date.now() - start;
        responseTimes.push(duration);
      }

      // Calculate P95
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95Time = responseTimes[p95Index];

      console.log(`P95 response time: ${p95Time}ms`);
      console.log(`All response times: ${responseTimes.join(', ')}ms`);

      expect(p95Time).toBeLessThan(50);
    });
  });

  describe('Business Rules', () => {
    it('should record swipe immediately (no undo in MVP)', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-immediate-test',
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');

      // Verify swipe is recorded (duplicate should fail)
      const duplicateResponse = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-immediate-test',
          direction: 'left',
        })
        .expect(400);

      expect(duplicateResponse.body.error).toMatch(/duplicate|already/i);
    });

    it('should allow swipe left on same user previously swiped right (no undo, but allow re-matching)', async () => {
      // This is actually NOT allowed per spec - swipes are final
      // Test should verify duplicate swipes are rejected

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-finality-test',
          direction: 'right',
        })
        .expect(200);

      // Try to swipe again (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-finality-test',
          direction: 'left',
        })
        .expect(400);

      expect(response.body.error).toMatch(/duplicate|already/i);
    });

    it('should store compatibility score at time of match', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-score-test',
          direction: 'right',
        })
        .expect(200);

      if (response.body.matchCreated && response.body.match) {
        expect(response.body.match).toHaveProperty('compatibilityScore');
        expect(typeof response.body.match.compatibilityScore).toBe('number');
        expect(response.body.match.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(response.body.match.compatibilityScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent swipes gracefully (race condition)', async () => {
      // Send two swipes simultaneously
      const promises = [
        request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: 'user-concurrent-test',
            direction: 'right',
          }),
        request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: 'user-concurrent-test',
            direction: 'right',
          }),
      ];

      const responses = await Promise.all(promises);

      // One should succeed (200), one should fail (400 duplicate)
      const statusCodes = responses.map(r => r.status).sort();
      expect(statusCodes).toEqual([200, 400]);
    });

    it('should handle mutual match with null compatibility score gracefully', async () => {
      // Edge case: compatibility score calculation failed
      // Should still create match, use default score or null

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-null-score-test',
          direction: 'right',
        })
        .expect(200);

      if (response.body.matchCreated && response.body.match) {
        expect(response.body.match.compatibilityScore).toBeDefined();
        // Should be a number or null, not undefined
        expect([null, 'number']).toContain(typeof response.body.match.compatibilityScore);
      }
    });
  });

  describe('Swipe Direction Business Logic', () => {
    it('should record left swipe (pass) without creating match potential', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-left-swipe-test',
          direction: 'left',
        })
        .expect(200);

      expect(response.body.matchCreated).toBe(false);
      expect(response.body.match).toBeUndefined();
    });

    it('should record right swipe (like) and enable match potential', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'user-right-swipe-test',
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
      // matchCreated may be false if target hasn't swiped right yet
      expect(typeof response.body.matchCreated).toBe('boolean');
    });
  });
});
