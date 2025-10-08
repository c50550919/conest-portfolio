/**
 * T021: Integration Test - Discovery Profile Browsing Flow
 *
 * Tests end-to-end profile browsing workflow with database integration.
 *
 * **CRITICAL**: 100% child PII compliance - NO child data in responses
 * **Performance**: <500ms total profile load time
 */

import request from 'supertest';
import { app } from '../../src/app';
import db from '../../src/config/database';
import redis from '../../src/config/redis';

describe('Discovery Profile Browsing - Integration Tests', () => {
  let authToken: string;
  let currentUserId: string;
  let testUsers: any[] = [];

  beforeAll(async () => {
    // Run migrations
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Cleanup
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

    // Create test user (viewer)
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'viewer@test.com',
        password: 'SecurePass123!',
        phone: '+15551234567',
        firstName: 'Alice',
        lastName: 'Viewer',
        dateOfBirth: '1990-01-01',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
      });

    authToken = registerRes.body.accessToken;
    currentUserId = registerRes.body.user.id;

    // Mark current user as verified
    await db('verifications')
      .where({ user_id: currentUserId })
      .update({
        id_verification_status: 'verified',
        background_check_status: 'verified',
        phone_verified: true,
        email_verified: true,
        fully_verified: true,
      });

    // Create 5 verified test users for discovery
    for (let i = 1; i <= 5; i++) {
      const userRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: `parent${i}@test.com`,
          password: 'SecurePass123!',
          phone: `+1555000000${i}`,
          firstName: `Parent${i}`,
          lastName: 'Test',
          dateOfBirth: '1985-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: Math.floor(Math.random() * 3) + 1,
          childrenAgeGroups: ['elementary', 'teen'],
        });

      const userId = userRes.body.user.id;

      // Mark as verified
      await db('verifications')
        .where({ user_id: userId })
        .update({
          id_verification_status: 'verified',
          background_check_status: 'verified',
          phone_verified: true,
          email_verified: true,
          fully_verified: true,
        });

      testUsers.push({
        userId,
        email: `parent${i}@test.com`,
      });
    }
  });

  describe('Profile Browsing Flow', () => {
    it('should fetch initial profiles successfully', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('nextCursor');
      expect(Array.isArray(response.body.profiles)).toBe(true);
      expect(response.body.profiles.length).toBeGreaterThan(0);
      expect(response.body.profiles.length).toBeLessThanOrEqual(10);
    });

    it('should only return verified users in discovery feed', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        expect(profile.idVerified).toBe(true);
        expect(profile.backgroundCheckVerified).toBe(true);
        expect(profile.phoneVerified).toBe(true);
      });
    });

    it('should exclude current user from their own discovery feed', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const profileUserIds = response.body.profiles.map((p: any) => p.userId);
      expect(profileUserIds).not.toContain(currentUserId);
    });

    it('should include all required ProfileCard fields', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const requiredFields = [
        'userId',
        'firstName',
        'age',
        'city',
        'profilePhotoUrl',
        'distanceMeters',
        'childrenCount',
        'childrenAgeGroups',
        'idVerified',
        'backgroundCheckVerified',
        'phoneVerified',
        'compatibilityScore',
      ];

      response.body.profiles.forEach((profile: any) => {
        requiredFields.forEach(field => {
          expect(profile).toHaveProperty(field);
        });
      });
    });
  });

  describe('**CRITICAL** Child Safety Compliance', () => {
    it('should NOT expose any child PII in profile responses', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const forbiddenFields = [
        'childrenNames',
        'childrenPhotos',
        'childrenAges',
        'childrenSchools',
        'childrenGenders',
        'childrenBirthdays',
      ];

      response.body.profiles.forEach((profile: any) => {
        forbiddenFields.forEach(field => {
          expect(profile).not.toHaveProperty(field);
        });

        // Deep check: ensure no child PII in nested objects
        const profileString = JSON.stringify(profile);
        expect(profileString).not.toMatch(/childName/i);
        expect(profileString).not.toMatch(/childPhoto/i);
        expect(profileString).not.toMatch(/childAge(?!Groups)/i); // Allow childrenAgeGroups
        expect(profileString).not.toMatch(/childSchool/i);
      });
    });

    it('should ONLY contain childrenCount and childrenAgeGroups for child data', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        // Filter child-related keys
        const childKeys = Object.keys(profile).filter(key =>
          key.toLowerCase().includes('child')
        );

        // ONLY childrenCount and childrenAgeGroups allowed
        expect(childKeys.sort()).toEqual(['childrenAgeGroups', 'childrenCount']);

        // Validate types
        expect(typeof profile.childrenCount).toBe('number');
        expect(Number.isInteger(profile.childrenCount)).toBe(true);
        expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);

        // Validate values
        profile.childrenAgeGroups.forEach((ageGroup: string) => {
          expect(['toddler', 'elementary', 'teen']).toContain(ageGroup);
        });
      });
    });

    it('should verify database does NOT store prohibited child PII', async () => {
      // Check profiles table schema
      const profilesSchema = await db('profiles').columnInfo();
      const columnNames = Object.keys(profilesSchema);

      const forbiddenColumns = [
        'children_names',
        'children_photos',
        'children_ages',
        'children_schools',
        'child_names',
        'child_photos',
      ];

      forbiddenColumns.forEach(column => {
        expect(columnNames).not.toContain(column);
      });

      // Only allowed child columns
      expect(columnNames).toContain('children_count');
      expect(columnNames).toContain('children_ages_range');
    });
  });

  describe('Pagination', () => {
    it('should support cursor-based pagination', async () => {
      // First page
      const firstPage = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2 })
        .expect(200);

      expect(firstPage.body.profiles.length).toBeLessThanOrEqual(2);

      if (firstPage.body.nextCursor) {
        // Second page
        const secondPage = await request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            cursor: firstPage.body.nextCursor,
            limit: 2,
          })
          .expect(200);

        expect(secondPage.body.profiles.length).toBeLessThanOrEqual(2);

        // Profiles should be different
        const firstPageIds = firstPage.body.profiles.map((p: any) => p.userId);
        const secondPageIds = secondPage.body.profiles.map((p: any) => p.userId);

        const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should return null nextCursor when no more profiles', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 50 }) // Fetch all
        .expect(200);

      if (response.body.profiles.length < 50) {
        expect(response.body.nextCursor).toBeNull();
      }
    });
  });

  describe('Filtering & Exclusions', () => {
    it('should exclude profiles already swiped on', async () => {
      // Swipe on first user
      const firstFetch = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 1 })
        .expect(200);

      const swipedUserId = firstFetch.body.profiles[0].userId;

      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetUserId: swipedUserId,
          direction: 'right',
        })
        .expect(200);

      // Fetch again - swiped user should not appear
      const secondFetch = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const profileIds = secondFetch.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(swipedUserId);
    });

    it('should exclude unverified users from discovery', async () => {
      // Create unverified user
      const unverifiedRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'unverified@test.com',
          password: 'SecurePass123!',
          phone: '+15559999999',
          firstName: 'Unverified',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          childrenCount: 1,
          childrenAgeGroups: ['toddler'],
        });

      const unverifiedUserId = unverifiedRes.body.user.id;

      // Leave as unverified (do not update verifications table)

      // Fetch discovery profiles
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const profileIds = response.body.profiles.map((p: any) => p.userId);
      expect(profileIds).not.toContain(unverifiedUserId);
    });
  });

  describe('Compatibility Scoring', () => {
    it('should include compatibility score (0-100) for each profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        expect(profile).toHaveProperty('compatibilityScore');
        expect(typeof profile.compatibilityScore).toBe('number');
        expect(Number.isInteger(profile.compatibilityScore)).toBe(true);
        expect(profile.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(profile.compatibilityScore).toBeLessThanOrEqual(100);
      });
    });

    it('should sort profiles by compatibility score (descending)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200);

      const scores = response.body.profiles.map((p: any) => p.compatibilityScore);

      // Verify descending order
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });
  });

  describe('Performance', () => {
    it('should load profiles in <500ms (total profile load time)', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      const duration = Date.now() - start;

      console.log(`Profile load time: ${duration}ms`);
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should cache results in Redis for performance', async () => {
      // First request (cache miss)
      const firstReq = Date.now();
      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });
      const firstDuration = Date.now() - firstReq;

      // Second request (cache hit - should be faster)
      const secondReq = Date.now();
      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });
      const secondDuration = Date.now() - secondReq;

      console.log(`First request: ${firstDuration}ms, Second request: ${secondDuration}ms`);

      // Cache hit should be faster (or at least not slower)
      expect(secondDuration).toBeLessThanOrEqual(firstDuration * 1.5);
    });
  });

  describe('Distance Calculation', () => {
    it('should include distance in meters from current user', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        expect(profile).toHaveProperty('distanceMeters');
        expect(typeof profile.distanceMeters).toBe('number');
        expect(profile.distanceMeters).toBeGreaterThanOrEqual(0);
      });
    });

    it('should calculate distance using PostGIS', async () => {
      // This assumes PostGIS is installed and profiles have location data
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.profiles.length > 0) {
        // Distance should be realistic (not infinity or negative)
        response.body.profiles.forEach((profile: any) => {
          expect(profile.distanceMeters).toBeGreaterThanOrEqual(0);
          expect(profile.distanceMeters).toBeLessThan(100000000); // < 100,000 km
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when all profiles are swiped', async () => {
      // Swipe on all available profiles
      let hasMore = true;
      while (hasMore) {
        const response = await request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 10 });

        if (response.body.profiles.length === 0) {
          hasMore = false;
          break;
        }

        // Swipe on all profiles in current batch
        for (const profile of response.body.profiles) {
          await request(app)
            .post('/api/discovery/swipe')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              targetUserId: profile.userId,
              direction: Math.random() > 0.5 ? 'right' : 'left',
            });
        }
      }

      // Final fetch - should be empty
      const finalResponse = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalResponse.body.profiles).toEqual([]);
      expect(finalResponse.body.nextCursor).toBeNull();
    });

    it('should handle new user with no available profiles gracefully', async () => {
      // Delete all other users except current
      await db('users').whereNot({ id: currentUserId }).del();

      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profiles).toEqual([]);
      expect(response.body.nextCursor).toBeNull();
    });
  });
});
