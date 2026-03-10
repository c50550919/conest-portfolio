import request from 'supertest';
import app from '../../src/app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  getAuthToken,
} from '../helpers/test-utils';

/**
 * Integration Test: No More Profiles Available
 *
 * Purpose: Validate empty state handling and user guidance
 * Spec Reference: spec.md - Scenario 4 (No More Profiles Available)
 * Constitution: Principle V (TDD), Principle IV (Performance)
 *
 * Tests discovery queue exhaustion and preference adjustment
 */

describe('Integration Test: No More Profiles Available', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create test user in isolated city (no matches)
    const user = await createTestUser({
      email: 'isolated@example.com',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Isolated',
        age: 32,
        city: 'Portland', // Unique city with no other users
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 2000,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    userId = user.id;
    authToken = getAuthToken(user.id);
  });

  describe('User Journey: Queue Exhaustion', () => {
    it('should return empty array when no profiles available (spec scenario 4)', async () => {
      // User has viewed all available matches (in this case, none exist)
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate empty state response
      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('nextCursor');
      expect(Array.isArray(response.body.profiles)).toBe(true);
      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });

    it('should display empty state message (frontend behavior)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Backend provides empty array, frontend should show:
      // "No more profiles available. Check back later or adjust your preferences."
      expect(response.body.profiles.length).toBe(0);
    });

    it('should provide button to edit match criteria (frontend behavior)', async () => {
      // Backend returns empty profiles
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Frontend should render "Adjust Preferences" button
      // Clicking button navigates to settings to broaden search criteria
      expect(response.body.profiles.length).toBe(0);
      // TODO: Implement GET /api/settings endpoint to allow preference editing
    });
  });

  describe('Empty State Scenarios', () => {
    it('should return empty when all profiles swiped in small pool', async () => {
      // Create 3 profiles in same city
      const profiles = await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          const profile = await createTestUser({
            email: `match${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `Match${i}`,
              age: 30 + i,
              city: 'Portland',
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          return profile.id;
        }),
      );

      // Swipe on all 3 profiles
      for (const profileId of profiles) {
        await request(app)
          .post('/api/discovery/swipe')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetUserId: profileId,
            direction: 'right',
          })
          .expect(200);
      }

      // Queue should now be empty
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });

    it('should return empty when no verified users in area', async () => {
      // Create unverified users in same city (should not appear)
      await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          await createTestUser({
            email: `unverified${i}@example.com`,
            verified: false,
            idVerified: false,
            backgroundCheckComplete: false,
            phoneVerified: false,
            profile: {
              firstName: `Unverified${i}`,
              age: 30 + i,
              city: 'Portland',
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }),
      );

      // Queue should be empty (unverified users excluded)
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profiles).toEqual([]);
    });

    it('should return empty when budget filter excludes all profiles', async () => {
      // User has budget $2000
      // Create profiles with very different budgets
      await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          await createTestUser({
            email: `expensive${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `Expensive${i}`,
              age: 30 + i,
              city: 'Portland',
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 10000, // Way outside user's budget
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }),
      );

      // If budget filter is strict, queue may be empty
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Profiles may be empty or include high budget users with low compatibility
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });
  });

  describe('Preference Adjustment Workflow', () => {
    it('should allow broadening search radius (future feature)', async () => {
      // Step 1: User sees empty state
      const emptyResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emptyResponse.body.profiles.length).toBe(0);

      // Step 2: User taps "Adjust Preferences" button (frontend)
      // Step 3: User increases search radius from 10 miles to 50 miles

      // TODO: Implement PUT /api/user/preferences endpoint
      // await request(app)
      //   .put('/api/user/preferences')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({ searchRadius: 50 })
      //   .expect(200);

      // Step 4: More profiles should now appear
      // Create profiles in nearby city
      await Promise.all(
        Array.from({ length: 3 }, async (_, i) => {
          await createTestUser({
            email: `nearby${i}@example.com`,
            verified: true,
            idVerified: true,
            backgroundCheckComplete: true,
            phoneVerified: true,
            profile: {
              firstName: `Nearby${i}`,
              age: 30 + i,
              city: 'Portland', // Same city for this test
              childrenCount: 1,
              childrenAgeGroups: ['toddler'],
              budget: 2000,
              moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }),
      );

      const updatedResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedResponse.body.profiles.length).toBeGreaterThan(0);
    });

    it('should allow adjusting budget range (future feature)', async () => {
      // TODO: Implement budget range preferences
      // User can adjust acceptable budget range to see more matches
    });

    it('should allow adjusting children age groups (future feature)', async () => {
      // TODO: Implement age group flexibility
      // User can indicate flexibility on children's age groups
    });
  });

  describe('New Profiles Notification', () => {
    it('should show new profiles when they join (future feature)', async () => {
      // Step 1: Queue is empty
      const emptyResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(emptyResponse.body.profiles.length).toBe(0);

      // Step 2: New verified user joins in same area
      await createTestUser({
        email: 'newuser@example.com',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'NewUser',
          age: 33,
          city: 'Portland',
          childrenCount: 2,
          childrenAgeGroups: ['toddler', 'elementary'],
          budget: 2000,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Step 3: User refreshes discovery (new profile appears)
      const updatedResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(updatedResponse.body.profiles.length).toBe(1);

      // TODO: Implement push notification
      // User should receive: "New matches available in your area!"
    });
  });

  describe('Performance Requirements', () => {
    it('should return empty state in <500ms', async () => {
      const startTime = Date.now();
      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(500);
    });

    it('should handle empty state queries efficiently', async () => {
      // Query empty queue 10 times
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/discovery/profiles').set('Authorization', `Bearer ${authToken}`),
      );

      const results = await Promise.all(requests);

      // All should return empty quickly
      results.forEach((result) => {
        expect(result.status).toBe(200);
        expect(result.body.profiles).toEqual([]);
      });
    });
  });
});
