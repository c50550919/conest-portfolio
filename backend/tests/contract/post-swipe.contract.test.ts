import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase, createTestUser, getAuthToken } from '../helpers/test-utils';

/**
 * Contract Test: POST /api/discovery/swipe
 *
 * Purpose: Validate API contract for swipe recording endpoint
 * Constitution: Principle V (TDD), Principle III (Security)
 *
 * Tests swipe recording, match creation, and mutual match detection
 */

describe('Contract Test: POST /api/discovery/swipe', () => {
  let authToken: string;
  let userId: string;
  let targetUserId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create test users
    const user = await createTestUser({
      email: 'swiper@example.com',
      verified: true,
    });
    userId = user.id;
    authToken = getAuthToken(user.id);

    const targetUser = await createTestUser({
      email: 'target@example.com',
      verified: true,
    });
    targetUserId = targetUser.id;
  });

  describe('Authentication', () => {
    it('should return 401 without JWT token', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 200 with valid JWT token', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
    });
  });

  describe('Request Body Validation', () => {
    it('should require targetUserId field', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          direction: 'right',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('targetUserId');
    });

    it('should require direction field', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('direction');
    });

    it('should validate targetUserId is valid UUID', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: 'not-a-uuid',
          direction: 'right',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('targetUserId');
    });

    it('should validate direction is "left" or "right"', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('direction');
    });

    it('should accept direction: "left"', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
      expect(response.body.matchCreated).toBe(false);
    });

    it('should accept direction: "right"', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
    });
  });

  describe('Response Schema', () => {
    it('should return swipeId, matchCreated, and optional match', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body).toHaveProperty('swipeId');
      expect(response.body).toHaveProperty('matchCreated');
      expect(typeof response.body.swipeId).toBe('string');
      expect(typeof response.body.matchCreated).toBe('boolean');

      // UUID validation for swipeId
      expect(response.body.swipeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should include match object when matchCreated is true', async () => {
      // First, target user swipes right on current user
      const targetAuthToken = getAuthToken(targetUserId);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({
          targetUserId: userId,
          direction: 'right',
        });

      // Now current user swipes right on target (creates mutual match)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body.matchCreated).toBe(true);
      expect(response.body).toHaveProperty('match');
      expect(response.body.match).toHaveProperty('id');
      expect(response.body.match).toHaveProperty('matchedUserId');
      expect(response.body.match).toHaveProperty('compatibilityScore');
      expect(response.body.match).toHaveProperty('createdAt');
    });

    it('should NOT include match object when matchCreated is false', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      if (!response.body.matchCreated) {
        expect(response.body.match).toBeUndefined();
      }
    });
  });

  describe('Match Object Schema', () => {
    it('should validate match object structure', async () => {
      // Setup mutual match
      const targetAuthToken = getAuthToken(targetUserId);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({
          targetUserId: userId,
          direction: 'right',
        });

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      const { match } = response.body;
      expect(match).toBeDefined();
      expect(typeof match.id).toBe('string');
      expect(typeof match.matchedUserId).toBe('string');
      expect(typeof match.compatibilityScore).toBe('number');
      expect(typeof match.createdAt).toBe('string');

      // Validate UUID
      expect(match.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(match.matchedUserId).toBe(targetUserId);

      // Validate compatibility score range
      expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(match.compatibilityScore).toBeLessThanOrEqual(100);

      // Validate ISO 8601 timestamp
      expect(new Date(match.createdAt).toISOString()).toBe(match.createdAt);
    });
  });

  describe('Business Logic', () => {
    it('should return matchCreated: false for left swipe', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      expect(response.body.matchCreated).toBe(false);
    });

    it('should return matchCreated: false for first right swipe (no mutual)', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body.matchCreated).toBe(false);
    });

    it('should return matchCreated: true for mutual right swipes', async () => {
      // Target user swipes right first
      const targetAuthToken = getAuthToken(targetUserId);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({
          targetUserId: userId,
          direction: 'right',
        });

      // Current user swipes right (mutual match)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      expect(response.body.matchCreated).toBe(true);
    });

    it('should prevent duplicate swipes on same target', async () => {
      // First swipe
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      // Duplicate swipe should fail
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already swiped');
    });

    it('should prevent self-swipe', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: userId, // Swiping on self
          direction: 'right',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('cannot swipe on yourself');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit (5 swipes per 15 minutes)', async () => {
      // Create 5 different target users
      const targets = [];
      for (let i = 0; i < 5; i++) {
        const target = await createTestUser({
          email: `target${i}@example.com`,
          verified: true,
        });
        targets.push(target.id);
      }

      // Perform 5 swipes (should succeed)
      for (const targetId of targets) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: targetId,
            direction: 'right',
          })
          .expect(200);
      }

      // 6th swipe should be rate limited
      const extraTarget = await createTestUser({
        email: 'extra@example.com',
        verified: true,
      });

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: extraTarget.id,
          direction: 'right',
        })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });
  });
});
