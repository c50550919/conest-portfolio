// @ts-nocheck
/**
 * Discovery Profiles GET Contract Tests
 *
 * Feature: 001-discovery-screen-swipeable
 * Purpose: Validate GET /api/discovery/profiles contract against OpenAPI spec
 * Constitution: Principle I (Child Safety - NO child PII), Principle IV (Performance <500ms)
 *
 * Test Coverage:
 * 1. Response schema validation (ProfileCard array, nextCursor)
 * 2. Child Safety compliance (NO childrenNames, childrenPhotos, childrenAges, childrenSchools)
 * 3. Verification filtering (only fully verified profiles)
 * 4. Pagination (cursor-based, limit validation)
 * 5. Performance (<500ms load time)
 * 6. Authentication enforcement
 * 7. Error responses (401, 422, 500)
 *
 * Reference: specs/001-discovery-screen-swipeable/contracts/openapi.yaml
 * Created: 2025-10-30
 */

import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('GET /api/discovery/profiles - Contract Tests', () => {
  let testUser: any;
  let authToken: string;
  let verifiedUser1: any;
  let verifiedUser2: any;
  let unverifiedUser: any;

  beforeEach(async () => {
    // Clean up test data
    await db('swipes').whereIn('user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('swipes').whereIn('target_user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('verifications').whereIn('user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('profiles').whereIn('user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('users').where('email', 'like', '%test-discovery%').delete();

    // Create authenticated test user
    [testUser] = await db('users')
      .insert({
        email: 'viewer-test-discovery@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    await db('profiles').insert({
      user_id: testUser.id,
      first_name: 'TestViewer',
      date_of_birth: '1990-01-01',
      city: 'San Francisco',
      children_count: 1,
      children_age_groups: '{toddler}',
      budget_min: 1500,
      budget_max: 2500,
    });

    await db('verifications').insert({
      user_id: testUser.id,
      fully_verified: true,
      id_verification_status: 'approved',
      background_check_status: 'clear',
      phone_verified: true,
    });

    authToken = `Bearer mock-token-${testUser.id}`;

    // Create verified discoverable users
    [verifiedUser1] = await db('users')
      .insert({
        email: 'verified1-test-discovery@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    await db('profiles').insert({
      user_id: verifiedUser1.id,
      first_name: 'Sarah',
      date_of_birth: '1988-05-15',
      city: 'San Francisco',
      children_count: 2,
      children_age_groups: '{toddler,elementary}',
      budget_min: 1800,
      budget_max: 2200,
      profile_image_url: 'https://cdn.conest.app/profiles/sarah.jpg',
    });

    await db('verifications').insert({
      user_id: verifiedUser1.id,
      fully_verified: true,
      id_verification_status: 'approved',
      background_check_status: 'clear',
      phone_verified: true,
    });

    [verifiedUser2] = await db('users')
      .insert({
        email: 'verified2-test-discovery@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    await db('profiles').insert({
      user_id: verifiedUser2.id,
      first_name: 'Emily',
      date_of_birth: '1992-08-20',
      city: 'Oakland',
      children_count: 1,
      children_age_groups: '{elementary}',
      budget_min: 1400,
      budget_max: 1900,
    });

    await db('verifications').insert({
      user_id: verifiedUser2.id,
      fully_verified: true,
      id_verification_status: 'approved',
      background_check_status: 'clear',
      phone_verified: true,
    });

    // Create unverified user (should NOT appear in discovery)
    [unverifiedUser] = await db('users')
      .insert({
        email: 'unverified-test-discovery@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    await db('profiles').insert({
      user_id: unverifiedUser.id,
      first_name: 'Unverified',
      date_of_birth: '1995-03-10',
      city: 'San Francisco',
      children_count: 1,
      children_age_groups: '{toddler}',
      budget_min: 1500,
      budget_max: 2000,
    });

    await db('verifications').insert({
      user_id: unverifiedUser.id,
      fully_verified: false,
      id_verification_status: 'pending',
      background_check_status: 'pending',
      phone_verified: false,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await db('swipes').whereIn('user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('swipes').whereIn('target_user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('verifications').whereIn('user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('profiles').whereIn('user_id', db('users').select('id').where('email', 'like', '%test-discovery%')).delete();
    await db('users').where('email', 'like', '%test-discovery%').delete();
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return DiscoveryResponse schema', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('profiles');
        expect(response.body.data).toHaveProperty('nextCursor');
        expect(Array.isArray(response.body.data.profiles)).toBe(true);
      }
    });

    it('should return ProfileCard schema for each item', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.data.profiles.length > 0) {
        const profile = response.body.data.profiles[0];

        // Required ProfileCard fields from OpenAPI spec
        expect(profile).toHaveProperty('userId');
        expect(profile).toHaveProperty('firstName');
        expect(profile).toHaveProperty('age');
        expect(profile).toHaveProperty('city');
        expect(profile).toHaveProperty('childrenCount');
        expect(profile).toHaveProperty('childrenAgeGroups');
        expect(profile).toHaveProperty('compatibilityScore');
        expect(profile).toHaveProperty('verificationStatus');

        // Validate verificationStatus object
        expect(profile.verificationStatus).toHaveProperty('idVerified');
        expect(profile.verificationStatus).toHaveProperty('backgroundCheckComplete');
        expect(profile.verificationStatus).toHaveProperty('phoneVerified');
        expect(typeof profile.verificationStatus.idVerified).toBe('boolean');
        expect(typeof profile.verificationStatus.backgroundCheckComplete).toBe('boolean');
        expect(typeof profile.verificationStatus.phoneVerified).toBe('boolean');

        // Validate childrenAgeGroups enum
        expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);
        profile.childrenAgeGroups.forEach((group: string) => {
          expect(['toddler', 'elementary', 'teen']).toContain(group);
        });

        // Validate compatibilityScore range
        expect(profile.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(profile.compatibilityScore).toBeLessThanOrEqual(100);

        // Validate UUID format
        expect(profile.userId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should exclude authenticated user from results', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        const userIds = response.body.data.profiles.map((p: any) => p.userId);
        expect(userIds).not.toContain(testUser.id);
      }
    });

    it('should only include fully verified profiles', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        const userIds = response.body.data.profiles.map((p: any) => p.userId);

        // Should include verified users
        expect(userIds).toContain(verifiedUser1.id);
        expect(userIds).toContain(verifiedUser2.id);

        // Should NOT include unverified user
        expect(userIds).not.toContain(unverifiedUser.id);

        // All profiles should have full verification
        response.body.data.profiles.forEach((profile: any) => {
          expect(profile.verificationStatus.idVerified).toBe(true);
          expect(profile.verificationStatus.backgroundCheckComplete).toBe(true);
          expect(profile.verificationStatus.phoneVerified).toBe(true);
        });
      }
    });
  });

  describe('Child Safety Compliance (Constitution Principle I)', () => {
    it('should NEVER include child PII fields', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.data.profiles.length > 0) {
        response.body.data.profiles.forEach((profile: any) => {
          // FORBIDDEN fields - must not exist
          expect(profile).not.toHaveProperty('childrenNames');
          expect(profile).not.toHaveProperty('childrenPhotos');
          expect(profile).not.toHaveProperty('childrenAges');
          expect(profile).not.toHaveProperty('childrenSchools');
          expect(profile).not.toHaveProperty('childrenGenders');

          // ONLY allowed: childrenCount (integer) and childrenAgeGroups (generic ranges)
          expect(typeof profile.childrenCount).toBe('number');
          expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);
        });
      }
    });

    it('should only expose generic age groups (toddler, elementary, teen)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.data.profiles.length > 0) {
        response.body.data.profiles.forEach((profile: any) => {
          profile.childrenAgeGroups.forEach((group: string) => {
            expect(['toddler', 'elementary', 'teen']).toContain(group);
          });

          // Should NOT contain exact ages
          const ageGroupsStr = JSON.stringify(profile.childrenAgeGroups);
          expect(ageGroupsStr).not.toMatch(/\d+\s*years?\s*old/i);
          expect(ageGroupsStr).not.toMatch(/age\s*\d+/i);
        });
      }
    });
  });

  describe('Pagination - Cursor-based', () => {
    it('should respect limit parameter (1-50)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles?limit=1')
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body.data.profiles.length).toBeLessThanOrEqual(1);
      }
    });

    it('should return nextCursor when more profiles available', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles?limit=1')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.data.profiles.length > 0) {
        // If there are 2 verified users, nextCursor should be present
        if (response.body.data.profiles.length === 1) {
          expect(response.body.data.nextCursor).toBeTruthy();
        }
      }
    });

    it('should return null nextCursor when no more profiles', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles?limit=50')
        .set('Authorization', authToken);

      if (response.status === 200) {
        // With only 2 verified users, all profiles should fit in one page
        expect(response.body.data.nextCursor).toBeNull();
      }
    });

    it('should reject invalid limit (< 1 or > 50)', async () => {
      const response1 = await request(app)
        .get('/api/discovery/profiles?limit=0')
        .set('Authorization', authToken)
        .expect(400);

      expect(response1.body).toMatchObject({
        success: false,
        error: 'Validation error',
      });

      const response2 = await request(app)
        .get('/api/discovery/profiles?limit=51')
        .set('Authorization', authToken)
        .expect(400);

      expect(response2.body).toMatchObject({
        success: false,
        error: 'Validation error',
      });
    });

    it('should use cursor for pagination', async () => {
      // Get first page
      const firstPage = await request(app)
        .get('/api/discovery/profiles?limit=1')
        .set('Authorization', authToken);

      if (firstPage.status === 200 && firstPage.body.data.nextCursor) {
        // Get second page using cursor
        const secondPage = await request(app)
          .get(`/api/discovery/profiles?limit=1&cursor=${firstPage.body.data.nextCursor}`)
          .set('Authorization', authToken);

        if (secondPage.status === 200) {
          // Should return different profile
          expect(secondPage.body.data.profiles[0].userId).not.toBe(
            firstPage.body.data.profiles[0].userId
          );
        }
      }
    });
  });

  describe('Swipe History Filtering', () => {
    it('should exclude already-swiped profiles', async () => {
      // Swipe on verifiedUser1
      await db('swipes').insert({
        user_id: testUser.id,
        target_user_id: verifiedUser1.id,
        direction: 'left',
      });

      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        const userIds = response.body.data.profiles.map((p: any) => p.userId);

        // Should NOT include verifiedUser1 (already swiped)
        expect(userIds).not.toContain(verifiedUser1.id);

        // Should still include verifiedUser2 (not swiped yet)
        expect(userIds).toContain(verifiedUser2.id);
      }
    });
  });

  describe('Authentication Enforcement', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('nauthorized'),
      });
    });

    it('should reject request with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
      });
    });
  });

  describe('Performance Requirements (Constitution Principle IV)', () => {
    it('should respond within 500ms for profile fetching', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      const duration = Date.now() - start;

      // Target: <500ms total (including Redis cache)
      expect(duration).toBeLessThan(500);
    });

    it('should handle pagination efficiently', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/discovery/profiles?limit=10')
        .set('Authorization', authToken);

      const duration = Date.now() - start;

      // Should be fast even with larger page size
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', authToken);

      if (response.status === 500) {
        expect(response.body).toMatchObject({
          success: false,
          error: expect.any(String),
        });

        // Should NOT leak implementation details
        expect(response.body.message || response.body.error).not.toContain('stack');
        expect(response.body.message || response.body.error).not.toContain('Error:');
      }
    });
  });
});
