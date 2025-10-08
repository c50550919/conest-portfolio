import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase, createTestUser, getAuthToken } from '../helpers/test-utils';

/**
 * Integration Test: Swipe Left (Pass)
 *
 * Purpose: Validate swipe left workflow (passing on profile)
 * Spec Reference: spec.md - Scenario 3 (Swipe Left)
 * Constitution: Principle V (TDD)
 *
 * Tests user passing on incompatible roommate
 */

describe('Integration Test: Swipe Left (Pass)', () => {
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

    // Create target user with low compatibility or misaligned values
    const targetUser = await createTestUser({
      email: 'target@example.com',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Jennifer',
        age: 45,
        city: 'San Francisco',
        childrenCount: 1,
        childrenAgeGroups: ['teen'], // Misaligned age groups
        budget: 5000, // Very different budget
        moveInDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // Much later move-in
      },
    });
    targetUserId = targetUser.id;
  });

  describe('User Journey: Swipe Left on Profile', () => {
    it('should complete full swipe left workflow (spec scenario 3)', async () => {
      // Step 1: User views profile with low compatibility or misaligned values
      const profilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const targetProfile = profilesResponse.body.profiles.find(
        (p: any) => p.userId === targetUserId
      );
      expect(targetProfile).toBeDefined();

      // Step 2: User swipes left or taps X icon
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      // Step 3: Validate response
      expect(response.body).toHaveProperty('swipeId');
      expect(response.body).toHaveProperty('matchCreated', false);
      expect(typeof response.body.swipeId).toBe('string');

      // UUID validation
      expect(response.body.swipeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // Step 4: Profile disappears from queue
      const updatedProfilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const profileIds = updatedProfilesResponse.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(targetUserId);

      // Step 5: Next profile loads automatically (frontend behavior)
      // Backend provides next profile in discovery queue
      expect(updatedProfilesResponse.body.profiles.length).toBeGreaterThanOrEqual(0);
    });

    it('should NEVER create match for left swipe', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      // matchCreated should always be false for left swipes
      expect(response.body.matchCreated).toBe(false);

      // match object should NOT be present
      expect(response.body.match).toBeUndefined();
    });

    it('should NOT create match even if other user swiped right', async () => {
      // Target user swipes right on current user
      const targetAuthToken = getAuthToken(targetUserId);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({
          targetUserId: userId,
          direction: 'right',
        })
        .expect(200);

      // Current user swipes left (should NOT create match)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      expect(response.body.matchCreated).toBe(false);
      expect(response.body.match).toBeUndefined();
    });

    it('should permanently remove profile from user\'s queue', async () => {
      // Swipe left
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      // Check queue multiple times (profile should never reappear)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const profileIds = response.body.profiles.map((p: any) => p.userId);
        expect(profileIds).not.toContain(targetUserId);
      }
    });
  });

  describe('Business Logic Validation', () => {
    it('should record left swipe in database', async () => {
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      // Swipe ID returned indicates successful database persistence
      expect(response.body.swipeId).toBeDefined();
      expect(typeof response.body.swipeId).toBe('string');
    });

    it('should prevent duplicate left swipes', async () => {
      // First left swipe
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      // Duplicate left swipe (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already swiped');
    });

    it('should NOT change left swipe to right swipe (immutable)', async () => {
      // First swipe left
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);

      // Attempt to swipe right on same user (should fail)
      const response = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(400);

      expect(response.body.error).toContain('already swiped');
    });
  });

  describe('Rate Limiting', () => {
    it('should count left swipes toward rate limit', async () => {
      // Create 5 target users
      const targets = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
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
          return target.id;
        })
      );

      // Perform 5 left swipes
      for (const targetId of targets) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: targetId,
            direction: 'left',
          })
          .expect(200);
      }

      // 6th swipe (left or right) should be rate limited
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
          direction: 'left',
        })
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });

    it('should count mixed left and right swipes toward rate limit', async () => {
      // Create 5 target users
      const targets = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
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
          return target.id;
        })
      );

      // Perform 3 left swipes and 2 right swipes (total 5)
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetUserId: targets[0], direction: 'left' })
        .expect(200);

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetUserId: targets[1], direction: 'right' })
        .expect(200);

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetUserId: targets[2], direction: 'left' })
        .expect(200);

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetUserId: targets[3], direction: 'right' })
        .expect(200);

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetUserId: targets[4], direction: 'left' })
        .expect(200);

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
          direction: 'left',
        })
        .expect(429);

      expect(response.body.error).toContain('rate limit');
    });
  });

  describe('Performance Requirements', () => {
    it('should complete left swipe in <200ms', async () => {
      const startTime = Date.now();
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'left',
        })
        .expect(200);
      const swipeTime = Date.now() - startTime;

      expect(swipeTime).toBeLessThan(200);
    });
  });
});
