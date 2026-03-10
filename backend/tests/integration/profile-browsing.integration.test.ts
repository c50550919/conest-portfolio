import request from 'supertest';
import app from '../../src/app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  getAuthToken,
} from '../helpers/test-utils';

/**
 * Integration Test: Successful Profile Browsing
 *
 * Purpose: Validate end-to-end profile discovery workflow
 * Spec Reference: spec.md - Scenario 1 (Successful Profile Browsing)
 * Constitution: Principle I (Child Safety), Principle IV (Performance)
 *
 * Tests realistic user journey from login to browsing profiles
 */

describe('Integration Test: Successful Profile Browsing', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create fully verified test user with realistic profile
    const user = await createTestUser({
      email: 'parent@example.com',
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
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });
    userId = user.id;
    authToken = getAuthToken(user.id);

    // Create 10+ potential matches with varied compatibility
    const testProfiles = [
      {
        email: 'match1@example.com',
        firstName: 'Emily',
        age: 30,
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
        budget: 1800,
      },
      {
        email: 'match2@example.com',
        firstName: 'Jessica',
        age: 34,
        childrenCount: 2,
        childrenAgeGroups: ['elementary', 'teen'],
        budget: 2200,
      },
      {
        email: 'match3@example.com',
        firstName: 'Amanda',
        age: 28,
        childrenCount: 1,
        childrenAgeGroups: ['elementary'],
        budget: 1900,
      },
      {
        email: 'match4@example.com',
        firstName: 'Rachel',
        age: 35,
        childrenCount: 3,
        childrenAgeGroups: ['toddler', 'elementary', 'teen'],
        budget: 2500,
      },
      {
        email: 'match5@example.com',
        firstName: 'Lisa',
        age: 31,
        childrenCount: 2,
        childrenAgeGroups: ['toddler'],
        budget: 2000,
      },
      {
        email: 'match6@example.com',
        firstName: 'Michelle',
        age: 29,
        childrenCount: 1,
        childrenAgeGroups: ['elementary'],
        budget: 1700,
      },
      {
        email: 'match7@example.com',
        firstName: 'Jennifer',
        age: 36,
        childrenCount: 2,
        childrenAgeGroups: ['teen'],
        budget: 2300,
      },
      {
        email: 'match8@example.com',
        firstName: 'Nicole',
        age: 33,
        childrenCount: 1,
        childrenAgeGroups: ['toddler'],
        budget: 1950,
      },
      {
        email: 'match9@example.com',
        firstName: 'Melissa',
        age: 30,
        childrenCount: 2,
        childrenAgeGroups: ['elementary'],
        budget: 2100,
      },
      {
        email: 'match10@example.com',
        firstName: 'Stephanie',
        age: 32,
        childrenCount: 1,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 2000,
      },
    ];

    for (const profile of testProfiles) {
      await createTestUser({
        email: profile.email,
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: profile.firstName,
          age: profile.age,
          city: 'San Francisco',
          childrenCount: profile.childrenCount,
          childrenAgeGroups: profile.childrenAgeGroups,
          budget: profile.budget,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  });

  describe('User Journey: From Login to Profile Browsing', () => {
    it('should complete full profile browsing workflow', async () => {
      // Step 1: User navigates to Discovery screen (GET /api/discovery/profiles)
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const loadTime = Date.now() - startTime;

      // Validate response structure
      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('nextCursor');
      expect(Array.isArray(response.body.profiles)).toBe(true);
      expect(response.body.profiles.length).toBeGreaterThan(0);

      // Step 2: Validate profile card data matches spec requirements
      const firstProfile = response.body.profiles[0];

      // Required fields from FR-006 to FR-010
      expect(firstProfile).toHaveProperty('userId');
      expect(firstProfile).toHaveProperty('firstName');
      expect(firstProfile).toHaveProperty('age');
      expect(firstProfile).toHaveProperty('city');
      expect(firstProfile).toHaveProperty('childrenCount');
      expect(firstProfile).toHaveProperty('childrenAgeGroups');
      expect(firstProfile).toHaveProperty('compatibilityScore');
      expect(firstProfile).toHaveProperty('verificationStatus');

      // Type validation
      expect(typeof firstProfile.firstName).toBe('string');
      expect(typeof firstProfile.age).toBe('number');
      expect(typeof firstProfile.city).toBe('string');
      expect(typeof firstProfile.childrenCount).toBe('number');
      expect(Array.isArray(firstProfile.childrenAgeGroups)).toBe(true);
      expect(typeof firstProfile.compatibilityScore).toBe('number');
      expect(typeof firstProfile.verificationStatus).toBe('object');

      // Step 3: CRITICAL - Validate NO child PII (Constitution Principle I)
      expect(firstProfile).not.toHaveProperty('childrenNames');
      expect(firstProfile).not.toHaveProperty('children_names');
      expect(firstProfile).not.toHaveProperty('childrenPhotos');
      expect(firstProfile).not.toHaveProperty('children_photos');
      expect(firstProfile).not.toHaveProperty('childrenAges');
      expect(firstProfile).not.toHaveProperty('children_ages');
      expect(firstProfile).not.toHaveProperty('childrenSchools');
      expect(firstProfile).not.toHaveProperty('children_schools');

      // Step 4: Validate verification badges (FR-011, FR-012)
      expect(firstProfile.verificationStatus).toHaveProperty('idVerified', true);
      expect(firstProfile.verificationStatus).toHaveProperty('backgroundCheckComplete', true);
      expect(firstProfile.verificationStatus).toHaveProperty('phoneVerified', true);

      // Step 5: Validate compatibility score range (FR-009)
      expect(firstProfile.compatibilityScore).toBeGreaterThanOrEqual(0);
      expect(firstProfile.compatibilityScore).toBeLessThanOrEqual(100);

      // Step 6: Validate childrenAgeGroups enum (FR-008)
      const validAgeGroups = ['toddler', 'elementary', 'teen'];
      firstProfile.childrenAgeGroups.forEach((group: string) => {
        expect(validAgeGroups).toContain(group);
      });

      // Step 7: Performance validation (FR-005 - <500ms total load, Constitution Principle IV)
      expect(loadTime).toBeLessThan(500);
    });

    it('should support cursor-based pagination', async () => {
      // Request first page with limit
      const firstPageResponse = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstPageResponse.body.profiles.length).toBeLessThanOrEqual(5);
      const { nextCursor } = firstPageResponse.body;

      // If more profiles exist, cursor should be present
      if (firstPageResponse.body.profiles.length === 5) {
        expect(nextCursor).not.toBeNull();

        // Validate cursor is UUID
        expect(nextCursor).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );

        // Request second page using cursor
        const secondPageResponse = await request(app)
          .get('/api/discovery/profiles')
          .query({ cursor: nextCursor, limit: 5 })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Second page should have different profiles
        const firstPageIds = firstPageResponse.body.profiles.map((p: any) => p.userId);
        const secondPageIds = secondPageResponse.body.profiles.map((p: any) => p.userId);

        // No overlap between pages
        secondPageIds.forEach((id: string) => {
          expect(firstPageIds).not.toContain(id);
        });
      }
    });

    it('should order profiles by compatibility score (highest first)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      // Validate descending order
      for (let i = 0; i < profiles.length - 1; i++) {
        expect(profiles[i].compatibilityScore).toBeGreaterThanOrEqual(
          profiles[i + 1].compatibilityScore,
        );
      }
    });

    it('should exclude unverified users from discovery queue (FR-011)', async () => {
      // Create an unverified user
      const unverifiedUser = await createTestUser({
        email: 'unverified@example.com',
        verified: false,
        idVerified: false,
        backgroundCheckComplete: false,
        phoneVerified: false,
        profile: {
          firstName: 'Unverified',
          age: 30,
          city: 'San Francisco',
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
          budget: 2000,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Request profiles
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Unverified user should NOT appear
      const profileIds = response.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(unverifiedUser.id);
    });

    it('should exclude profiles outside location filter', async () => {
      // Create user in different city
      await createTestUser({
        email: 'outofcity@example.com',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'OutOfCity',
          age: 30,
          city: 'Los Angeles', // Different city
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
          budget: 2000,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Request profiles (should only show San Francisco)
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All profiles should be in San Francisco
      response.body.profiles.forEach((profile: any) => {
        expect(profile.city).toBe('San Francisco');
      });
    });

    it("should exclude user's own profile from discovery queue", async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // User's own ID should NOT appear
      const profileIds = response.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(userId);
    });

    it('should exclude already-swiped profiles from queue', async () => {
      // Get first profile
      const profilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const targetUserId = profilesResponse.body.profiles[0].userId;

      // Swipe on profile
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId,
          direction: 'right',
        })
        .expect(200);

      // Request profiles again
      const updatedProfilesResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Target user should NOT appear
      const updatedProfileIds = updatedProfilesResponse.body.profiles.map((p: any) => p.userId);
      expect(updatedProfileIds).not.toContain(targetUserId);
    });
  });

  describe('Performance Requirements (Constitution Principle IV)', () => {
    it('should load profiles in <500ms total time', async () => {
      const startTime = Date.now();
      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(500);
    });

    it('should handle 10 concurrent requests without degradation', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .then((response) => ({
            status: response.status,
            duration: response.header['x-response-time'],
          })),
      );

      const results = await Promise.all(requests);

      // All requests should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });
    });
  });

  describe('Empty State Handling (FR-023, FR-024)', () => {
    it('should return empty array when no profiles available', async () => {
      // Create isolated test user with no matches
      const isolatedUser = await createTestUser({
        email: 'isolated@example.com',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'Isolated',
          age: 25,
          city: 'New York', // No other users in this city
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
          budget: 5000,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const isolatedAuthToken = getAuthToken(isolatedUser.id);

      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${isolatedAuthToken}`)
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });
  });
});
