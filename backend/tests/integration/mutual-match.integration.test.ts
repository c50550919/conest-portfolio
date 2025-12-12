import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase, createTestUser, getAuthToken } from '../helpers/test-utils';

/**
 * Integration Test: Mutual Match Creation
 *
 * Purpose: Validate complete mutual match workflow
 * Spec Reference: spec.md - Scenario 2 (Mutual Match)
 * Constitution: Principle V (TDD), Principle IV (Performance)
 *
 * Tests end-to-end match creation when both users express interest
 */

describe('Integration Test: Mutual Match Creation', () => {
  let authToken1: string;
  let userId1: string;
  let authToken2: string;
  let userId2: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create two compatible users
    const user1 = await createTestUser({
      email: 'parent1@example.com',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Sarah',
        age: 32,
        city: 'San Francisco',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 2000,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    userId1 = user1.id;
    authToken1 = getAuthToken(user1.id);

    const user2 = await createTestUser({
      email: 'parent2@example.com',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Emily',
        age: 30,
        city: 'San Francisco',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 1900,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    userId2 = user2.id;
    authToken2 = getAuthToken(user2.id);
  });

  describe('User Journey: Creating Mutual Match', () => {
    it('should create match when both users swipe right (spec scenario 2)', async () => {
      // Step 1: User1 swipes right on User2
      const swipe1Response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          targetUserId: userId2,
          direction: 'right',
        })
        .expect(200);

      // First swipe should NOT create match (no mutual interest yet)
      expect(swipe1Response.body.matchCreated).toBe(false);
      expect(swipe1Response.body.match).toBeUndefined();

      // Step 2: User2 swipes right on User1 (creates mutual match)
      const swipe2Response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          targetUserId: userId1,
          direction: 'right',
        })
        .expect(200);

      // Second swipe SHOULD create match
      expect(swipe2Response.body.matchCreated).toBe(true);
      expect(swipe2Response.body).toHaveProperty('match');

      // Step 3: Validate match object structure
      const { match } = swipe2Response.body;
      expect(match).toHaveProperty('id');
      expect(match).toHaveProperty('matchedUserId', userId1);
      expect(match).toHaveProperty('compatibilityScore');
      expect(match).toHaveProperty('createdAt');

      // Validate data types
      expect(typeof match.id).toBe('string');
      expect(typeof match.matchedUserId).toBe('string');
      expect(typeof match.compatibilityScore).toBe('number');
      expect(typeof match.createdAt).toBe('string');

      // UUID validation
      expect(match.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Validate compatibility score range
      expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(match.compatibilityScore).toBeLessThanOrEqual(100);

      // Validate ISO 8601 timestamp
      expect(new Date(match.createdAt).toISOString()).toBe(match.createdAt);

      // Step 4: Both users receive "It's a Match!" notification
      // TODO: Validate push notifications sent to both users
      // Expected: Both users receive notification with match details
    });

    it('should create match regardless of swipe order', async () => {
      // Reverse order: User2 swipes right first
      const swipe1Response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          targetUserId: userId1,
          direction: 'right',
        })
        .expect(200);

      expect(swipe1Response.body.matchCreated).toBe(false);

      // User1 swipes right second (creates match)
      const swipe2Response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          targetUserId: userId2,
          direction: 'right',
        })
        .expect(200);

      expect(swipe2Response.body.matchCreated).toBe(true);
      expect(swipe2Response.body.match).toBeDefined();
      expect(swipe2Response.body.match.matchedUserId).toBe(userId2);
    });

    it('should NOT create duplicate matches for same users', async () => {
      // Create initial match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' })
        .expect(200);

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' })
        .expect(200);

      // Attempt to swipe again (should fail - already swiped)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' })
        .expect(400);

      expect(response.body.error).toContain('already swiped');
    });
  });

  describe('Match Object Validation', () => {
    it('should include correct matchedUserId for each user', async () => {
      // User1 swipes right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' })
        .expect(200);

      // User2 swipes right (creates match)
      const user2Response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' })
        .expect(200);

      // User2's response should show User1 as matchedUserId
      expect(user2Response.body.match.matchedUserId).toBe(userId1);

      // TODO: When we implement GET /api/matches, validate:
      // - User1 sees User2 in their matches
      // - User2 sees User1 in their matches
    });

    it('should calculate accurate compatibility score', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' })
        .expect(200);

      const matchResponse = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' })
        .expect(200);

      const { compatibilityScore } = matchResponse.body.match;

      // Users have similar profiles, expect high compatibility
      expect(compatibilityScore).toBeGreaterThanOrEqual(70);
      expect(compatibilityScore).toBeLessThanOrEqual(100);
    });

    it('should store match timestamp accurately', async () => {
      const beforeMatch = new Date();

      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' });

      const matchResponse = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' })
        .expect(200);

      const afterMatch = new Date();
      const { createdAt } = matchResponse.body.match;
      const matchTime = new Date(createdAt);

      // Match timestamp should be between before and after
      expect(matchTime.getTime()).toBeGreaterThanOrEqual(beforeMatch.getTime());
      expect(matchTime.getTime()).toBeLessThanOrEqual(afterMatch.getTime());
    });
  });

  describe('Messaging Capability', () => {
    it('should unlock messaging after mutual match', async () => {
      // Create match
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' });

      const matchResponse = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' })
        .expect(200);

      const { match } = matchResponse.body;

      // TODO: When messaging API is implemented, validate:
      // - Both users can send messages to each other
      // - Messages are end-to-end encrypted
      // - Message history is available
      expect(match.id).toBeDefined();
    });

    it('should NOT allow messaging before mutual match', async () => {
      // Only User1 has swiped right (no match yet)
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' });

      // TODO: When messaging API is implemented, validate:
      // - User1 cannot send message to User2
      // - Error: "Must match before messaging"
    });
  });

  describe('Race Condition Handling', () => {
    it('should handle simultaneous swipes gracefully', async () => {
      // Both users swipe right at the same time
      const results = await Promise.all([
        request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken1}`)
          .send({ targetUserId: userId2, direction: 'right' }),
        request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken2}`)
          .send({ targetUserId: userId1, direction: 'right' }),
      ]);

      // Both requests should succeed
      expect(results[0].status).toBe(200);
      expect(results[1].status).toBe(200);

      // Exactly ONE response should have matchCreated: true
      const matchCreatedCount = results.filter(r => r.body.matchCreated).length;
      expect(matchCreatedCount).toBe(1);

      // Only one match should be created in database
      // TODO: When GET /api/matches implemented, verify only 1 match exists
    });
  });

  describe('Performance Requirements', () => {
    it('should create match in <200ms', async () => {
      // User1 swipes right
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ targetUserId: userId2, direction: 'right' });

      // User2 swipes right (creates match)
      const startTime = Date.now();
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ targetUserId: userId1, direction: 'right' })
        .expect(200);
      const matchTime = Date.now() - startTime;

      expect(matchTime).toBeLessThan(200);
    });

    it('should handle 10 concurrent match creations', async () => {
      // Create 10 pairs of users
      const pairs = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const userA = await createTestUser({
            email: `userA${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `UserA${i}`,
              age: 30,
              city: 'San Francisco',
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          const userB = await createTestUser({
            email: `userB${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `UserB${i}`,
              age: 32,
              city: 'San Francisco',
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          return {
            userA: { id: userA.id, token: getAuthToken(userA.id) },
            userB: { id: userB.id, token: getAuthToken(userB.id) },
          };
        }),
      );

      // Each pair: userA swipes right on userB first
      await Promise.all(
        pairs.map(pair =>
          request(app)
            .post('/api/discovery/swipe')
            .set('Authorization', `Bearer ${pair.userA.token}`)
            .send({ targetUserId: pair.userB.id, direction: 'right' }),
        ),
      );

      // All userB swipe right simultaneously (creates 10 matches)
      const matchResults = await Promise.all(
        pairs.map(pair =>
          request(app)
            .post('/api/discovery/swipe')
            .set('Authorization', `Bearer ${pair.userB.token}`)
            .send({ targetUserId: pair.userA.id, direction: 'right' }),
        ),
      );

      // All matches should succeed
      matchResults.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.matchCreated).toBe(true);
        expect(result.body.match).toBeDefined();
      });
    });
  });
});
