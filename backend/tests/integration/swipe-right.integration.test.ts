import request from 'supertest';
import app from '../../src/app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  getAuthToken,
} from '../helpers/test-utils';

/**
 * Integration Test: Swipe Right (Express Interest)
 *
 * Purpose: Validate swipe right workflow and interest recording
 * Spec Reference: spec.md - Scenario 2 (Swipe Right)
 * Constitution: Principle V (TDD), Principle IV (Performance)
 *
 * Tests user expressing interest in potential roommate
 */

describe('Integration Test: Swipe Right (Express Interest)', () => {
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
    // Create test user
    const user = await createTestUser({
      email: 'swiper@example.com',
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
    userId = user.id;
    authToken = getAuthToken(user.id);

    // Create target user with 78% compatibility (as per spec scenario)
    const targetUser = await createTestUser({
      email: 'target@example.com',
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
    targetUserId = targetUser.id;
  });

  describe('User Journey: Swipe Right on Profile', () => {
    it('should complete full swipe right workflow (spec scenario 2)', async () => {
      // Step 1: User views profile with 78% compatibility
      const profilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Find target profile
      const targetProfile = profilesResponse.body.profiles.find(
        (p: any) => p.userId === targetUserId,
      );
      expect(targetProfile).toBeDefined();
      expect(targetProfile.compatibilityScore).toBeGreaterThanOrEqual(70);

      // Step 2: User swipes right or taps heart icon
      const startTime = Date.now();
      const swipeResponse = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);
      const swipeTime = Date.now() - startTime;

      // Step 3: Validate response
      expect(swipeResponse.body).toHaveProperty('swipeId');
      expect(swipeResponse.body).toHaveProperty('matchCreated');
      expect(typeof swipeResponse.body.swipeId).toBe('string');
      expect(typeof swipeResponse.body.matchCreated).toBe('boolean');

      // UUID validation
      expect(swipeResponse.body.swipeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      // Step 4: Profile disappears from queue
      const updatedProfilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const profileIds = updatedProfilesResponse.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(targetUserId);

      // Step 5: Interest recorded in system (swipe persisted)
      // This will be validated when we implement GET /api/swipes endpoint

      // Performance validation (<200ms per Constitution Principle IV)
      expect(swipeTime).toBeLessThan(200);
    });

    it('should NOT create match when other user has not swiped right yet', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      // matchCreated should be false (no mutual interest yet)
      expect(response.body.matchCreated).toBe(false);

      // match object should NOT be present
      expect(response.body.match).toBeUndefined();
    });

    it('should create mutual match when both users swipe right', async () => {
      // Target user swipes right first
      const targetAuthToken = getAuthToken(targetUserId);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({
          targetUserId: userId,
          direction: 'right',
        })
        .expect(200);

      // Current user swipes right (creates mutual match)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      // Validate match creation
      expect(response.body.matchCreated).toBe(true);
      expect(response.body).toHaveProperty('match');

      // Validate match object structure
      const { match } = response.body;
      expect(match).toHaveProperty('id');
      expect(match).toHaveProperty('matchedUserId', targetUserId);
      expect(match).toHaveProperty('compatibilityScore');
      expect(match).toHaveProperty('createdAt');

      // Validate match data types
      expect(typeof match.id).toBe('string');
      expect(typeof match.matchedUserId).toBe('string');
      expect(typeof match.compatibilityScore).toBe('number');
      expect(typeof match.createdAt).toBe('string');

      // Validate compatibility score range
      expect(match.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(match.compatibilityScore).toBeLessThanOrEqual(100);

      // Validate ISO 8601 timestamp
      expect(new Date(match.createdAt).toISOString()).toBe(match.createdAt);
    });

    it('should send push notification when mutual match created', async () => {
      // Target user swipes right first
      const targetAuthToken = getAuthToken(targetUserId);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({
          targetUserId: userId,
          direction: 'right',
        });

      // Current user swipes right (creates mutual match)
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      // TODO: Validate push notification sent
      // This will be implemented when push notification service is created
      // Expected: Both users receive "It's a Match!" notification
    });
  });

  describe('Business Logic Validation', () => {
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

      // Duplicate swipe (should fail)
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

    it('should record swipe timestamp for analytics', async () => {
      const beforeSwipe = new Date();

      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      const afterSwipe = new Date();

      // Swipe should have timestamp (validated when we implement GET /api/swipes)
      // Expected: swipedAt between beforeSwipe and afterSwipe
      expect(response.body.swipeId).toBeDefined();
    });

    it('should calculate compatibility score accurately', async () => {
      // Create multiple target users with varying compatibility
      const highCompatibilityUser = await createTestUser({
        email: 'highcompat@example.com',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'HighCompat',
          age: 32,
          city: 'San Francisco',
          childrenCount: 2,
          childrenAgeGroups: ['toddler', 'elementary'], // Same as user
          budget: 2000, // Same as user
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const lowCompatibilityUser = await createTestUser({
        email: 'lowcompat@example.com',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'LowCompat',
          age: 25,
          city: 'San Francisco',
          childrenCount: 1,
          childrenAgeGroups: ['teen'], // Different from user
          budget: 5000, // Very different budget
          moveInDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });

      // Get profiles and check compatibility scores
      const profilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const highCompatProfile = profilesResponse.body.profiles.find(
        (p: any) => p.userId === highCompatibilityUser.id,
      );
      const lowCompatProfile = profilesResponse.body.profiles.find(
        (p: any) => p.userId === lowCompatibilityUser.id,
      );

      // High compatibility user should have higher score
      expect(highCompatProfile.compatibilityScore).toBeGreaterThan(
        lowCompatProfile.compatibilityScore,
      );
    });
  });

  describe('Rate Limiting (FR-022)', () => {
    it('should enforce rate limit (5 swipes per 15 minutes)', async () => {
      // Create 5 target users
      const targets = [];
      for (let i = 0; i < 5; i++) {
        const target = await createTestUser({
          email: `target${i}@example.com`,
          verified: true,
          idVerified: true,
          backgroundCheckComplete: true,
          phoneVerified: true,
          profile: {
            firstName: `Target${i}`,
            age: 30 + i,
            city: 'San Francisco',
            childrenCount: 1,
            childrenAgeGroups: ['toddler'],
            budget: 2000,
            moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        targets.push(target.id);
      }

      // Perform 5 swipes (should all succeed)
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
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'Extra',
          age: 30,
          city: 'San Francisco',
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
          budget: 2000,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
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

  describe('Performance Requirements', () => {
    it('should complete swipe in <200ms', async () => {
      const startTime = Date.now();
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);
      const swipeTime = Date.now() - startTime;

      expect(swipeTime).toBeLessThan(200);
    });

    it('should handle 10 concurrent swipes without degradation', async () => {
      // Create 10 target users
      const targets = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const target = await createTestUser({
            email: `concurrent${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `Concurrent${i}`,
              age: 30 + i,
              city: 'San Francisco',
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          return target.id;
        }),
      );

      // Create 10 different users to swipe
      const users = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          const user = await createTestUser({
            email: `user${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `User${i}`,
              age: 32,
              city: 'San Francisco',
              childrenCount: 2,
              childrenAgeGroups: ['toddler', 'elementary'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          return getAuthToken(user.id);
        }),
      );

      // Perform 10 concurrent swipes
      const requests = users.map((token, i) =>
        request(app).post('/api/discovery/swipe').set('Authorization', `Bearer ${token}`).send({
          targetUserId: targets[i],
          direction: 'right',
        }),
      );

      const results = await Promise.all(requests);

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.body.swipeId).toBeDefined();
      });
    });
  });
});
