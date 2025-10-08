/**
 * T023: Integration Test - Mutual Match Detection
 *
 * Tests bidirectional swipe flow and match creation.
 *
 * **Key Behavior**: Match created when both users swipe right on each other
 * **Socket.io**: Real-time notification sent to both users
 * **Performance**: <50ms match detection
 */

import request from 'supertest';
import { app } from '../../src/app';
import db from '../../src/config/database';
import redis from '../../src/config/redis';
import { Server as SocketServer } from 'socket.io';

// Mock Socket.io
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

describe('Discovery Mutual Match Detection - Integration Tests', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;
  let mockIo: any;

  beforeAll(async () => {
    await db.migrate.latest();
    mockIo = require('socket.io').Server();
  });

  afterAll(async () => {
    await db.destroy();
    await redis.quit();
  });

  beforeEach(async () => {
    // Clean database
    await db('swipes').del();
    await db('matches').del();
    await db('profiles').del();
    await db('verifications').del();
    await db('users').del();

    jest.clearAllMocks();

    // Create User A
    const userARes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'alice@test.com',
        password: 'SecurePass123!',
        phone: '+15551111111',
        firstName: 'Alice',
        lastName: 'Smith',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      });

    userAToken = userARes.body.accessToken;
    userAId = userARes.body.user.id;

    // Create User B
    const userBRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bob@test.com',
        password: 'SecurePass123!',
        phone: '+15552222222',
        firstName: 'Bob',
        lastName: 'Johnson',
        dateOfBirth: '1988-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 1,
        childrenAgeGroups: ['teen'],
      });

    userBToken = userBRes.body.accessToken;
    userBId = userBRes.body.user.id;

    // Mark both as verified
    await db('verifications')
      .where({ user_id: userAId })
      .update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

    await db('verifications')
      .where({ user_id: userBId })
      .update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });
  });

  describe('Mutual Match Creation', () => {
    it('should create match when both users swipe right (A→B, B→A)', async () => {
      // User A swipes right on User B
      const swipeA = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        })
        .expect(200);

      expect(swipeA.body.matchCreated).toBe(false);
      expect(swipeA.body.match).toBeUndefined();

      // User B swipes right on User A (mutual match!)
      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        })
        .expect(200);

      expect(swipeB.body.matchCreated).toBe(true);
      expect(swipeB.body.match).toBeDefined();
      expect(swipeB.body.match.matchId).toBeDefined();
      expect(swipeB.body.match.matchedUserId).toBe(userAId);
      expect(swipeB.body.match.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(swipeB.body.match.compatibilityScore).toBeLessThanOrEqual(100);
      expect(swipeB.body.match.createdAt).toBeDefined();
    });

    it('should create match when both users swipe right (B→A, A→B)', async () => {
      // User B swipes right on User A first
      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        })
        .expect(200);

      expect(swipeB.body.matchCreated).toBe(false);

      // User A swipes right on User B (mutual match!)
      const swipeA = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        })
        .expect(200);

      expect(swipeA.body.matchCreated).toBe(true);
      expect(swipeA.body.match).toBeDefined();
      expect(swipeA.body.match.matchedUserId).toBe(userBId);
    });

    it('should NOT create match if User A swipes right but User B swipes left', async () => {
      // User A swipes right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        })
        .expect(200);

      // User B swipes left (no match)
      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'left',
        })
        .expect(200);

      expect(swipeB.body.matchCreated).toBe(false);
      expect(swipeB.body.match).toBeUndefined();
    });

    it('should NOT create match if both users swipe left', async () => {
      // User A swipes left
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'left',
        })
        .expect(200);

      // User B swipes left
      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'left',
        })
        .expect(200);

      expect(swipeB.body.matchCreated).toBe(false);
    });
  });

  describe('Match Database Records', () => {
    it('should store match in database with correct data', async () => {
      // Create mutual match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Check database
      const match = await db('matches')
        .where({ user_id_1: userAId, user_id_2: userBId })
        .orWhere({ user_id_1: userBId, user_id_2: userAId })
        .first();

      expect(match).toBeDefined();
      expect(match.status).toBe('active');
      expect(match.compatibility_score).toBeGreaterThanOrEqual(0);
      expect(match.compatibility_score).toBeLessThanOrEqual(100);
      expect(match.created_at).toBeDefined();
    });

    it('should store compatibility score at time of match', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Verify match has score
      const match = await db('matches')
        .where({ user_id_1: userAId, user_id_2: userBId })
        .orWhere({ user_id_1: userBId, user_id_2: userAId })
        .first();

      expect(match.compatibility_score).toBe(swipeB.body.match.compatibilityScore);
    });

    it('should only create ONE match record (not duplicate)', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Count matches
      const matchCount = await db('matches')
        .where({ user_id_1: userAId, user_id_2: userBId })
        .orWhere({ user_id_1: userBId, user_id_2: userAId })
        .count('* as count')
        .first();

      expect(matchCount?.count).toBe('1');
    });
  });

  describe('Socket.io Real-time Notifications', () => {
    it('should emit match:created event to both users', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Verify Socket.io events
      expect(mockIo.to).toHaveBeenCalledWith(userAId);
      expect(mockIo.to).toHaveBeenCalledWith(userBId);
      expect(mockIo.emit).toHaveBeenCalledWith('match:created', expect.objectContaining({
        matchId: expect.any(String),
        matchedUserId: expect.any(String),
      }));
    });

    it('should NOT emit match:created if no mutual match', async () => {
      // User A swipes right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      // User B swipes left (no match)
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'left',
        });

      // Should NOT have emitted match event
      expect(mockIo.emit).not.toHaveBeenCalledWith('match:created', expect.anything());
    });

    it('should include match details in Socket.io payload', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Verify event payload structure
      expect(mockIo.emit).toHaveBeenCalledWith('match:created', expect.objectContaining({
        matchId: swipeB.body.match.matchId,
        matchedUserId: expect.any(String),
        compatibilityScore: expect.any(Number),
        createdAt: expect.any(String),
      }));
    });
  });

  describe('Match Status & Lifecycle', () => {
    it('should create match with status="active"', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      const match = await db('matches')
        .where({ user_id_1: userAId, user_id_2: userBId })
        .orWhere({ user_id_1: userBId, user_id_2: userAId })
        .first();

      expect(match.status).toBe('active');
    });

    it('should unlock messaging capability after match', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Verify match exists (which enables messaging)
      const match = await db('matches')
        .where({ user_id_1: userAId, user_id_2: userBId })
        .orWhere({ user_id_1: userBId, user_id_2: userAId })
        .first();

      expect(match).toBeDefined();
      expect(match.status).toBe('active');
    });
  });

  describe('Performance', () => {
    it('should detect mutual match in <50ms', async () => {
      // User A swipes right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      // User B swipes right (match detection)
      const start = Date.now();

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        })
        .expect(200);

      const duration = Date.now() - start;

      console.log(`Match detection time: ${duration}ms`);
      expect(response.body.matchCreated).toBe(true);
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent swipes (race condition)', async () => {
      // Both users swipe right simultaneously
      const promises = [
        request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            targetUserId: userBId,
            direction: 'right',
          }),
        request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${userBToken}`)
          .send({
            targetUserId: userAId,
            direction: 'right',
          }),
      ];

      const responses = await Promise.all(promises);

      // One should create match, one should not (or both might, but only one match record)
      const matchCreatedCount = responses.filter(r => r.body.matchCreated).length;
      expect(matchCreatedCount).toBeGreaterThanOrEqual(1);

      // Verify only ONE match in database
      const matchCount = await db('matches')
        .where({ user_id_1: userAId, user_id_2: userBId })
        .orWhere({ user_id_1: userBId, user_id_2: userAId })
        .count('* as count')
        .first();

      expect(matchCount?.count).toBe('1');
    });

    it('should handle match with null/missing compatibility score', async () => {
      // Create match (might have null score if calculation fails)
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      const swipeB = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Should still create match, score should be 0 or valid number
      expect(swipeB.body.matchCreated).toBe(true);
      expect(swipeB.body.match.compatibilityScore).toBeDefined();
      expect(typeof swipeB.body.match.compatibilityScore).toBe('number');
    });

    it('should prevent duplicate match creation', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // Try to create duplicate (should be prevented by swipe uniqueness)
      const duplicateAttempt = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        })
        .expect(400);

      expect(duplicateAttempt.body.error).toMatch(/duplicate|already/i);
    });
  });

  describe('Match Visibility', () => {
    it('should remove matched users from each other\'s discovery feed', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // User A's feed should not contain User B
      const userAFeed = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      const userAFeedIds = userAFeed.body.profiles.map((p: any) => p.userId);
      expect(userAFeedIds).not.toContain(userBId);

      // User B's feed should not contain User A
      const userBFeed = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      const userBFeedIds = userBFeed.body.profiles.map((p: any) => p.userId);
      expect(userBFeedIds).not.toContain(userAId);
    });
  });

  describe('Multiple Matches', () => {
    let userCId: string;
    let userCToken: string;

    beforeEach(async () => {
      // Create User C
      const userCRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'carol@test.com',
          password: 'SecurePass123!',
          phone: '+15553333333',
          firstName: 'Carol',
          lastName: 'Williams',
          dateOfBirth: '1992-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: 2,
          childrenAgeGroups: ['toddler'],
        });

      userCToken = userCRes.body.accessToken;
      userCId = userCRes.body.user.id;

      await db('verifications')
        .where({ user_id: userCId })
        .update({
          id_verification_status: 'verified',
          background_check_status: 'verified',
          phone_verified: true,
          email_verified: true,
          fully_verified: true,
        });
    });

    it('should allow user to have multiple matches', async () => {
      // User A matches with User B
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userBId,
          direction: 'right',
        });

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      // User A matches with User C
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          targetUserId: userCId,
          direction: 'right',
        });

      const matchAC = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${userCToken}`)
        .send({
          targetUserId: userAId,
          direction: 'right',
        });

      expect(matchAC.body.matchCreated).toBe(true);

      // Verify User A has 2 matches
      const userAMatches = await db('matches')
        .where({ user_id_1: userAId })
        .orWhere({ user_id_2: userAId });

      expect(userAMatches.length).toBe(2);
    });
  });
});
