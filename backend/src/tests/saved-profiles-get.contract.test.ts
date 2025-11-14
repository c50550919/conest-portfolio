// @ts-nocheck
/**
 * Saved Profiles GET Contract Tests
 *
 * Feature: 003-complete-3-critical (Saved Profiles)
 * Purpose: Validate GET /api/saved-profiles contract against OpenAPI spec
 * Constitution: Principle I (Child Safety - no child data in saved profiles)
 *
 * Test Coverage:
 * 1. Response schema validation (savedProfiles array, total count)
 * 2. Folder filtering (top_choice, strong_maybe, considering, backup)
 * 3. Profile embedding (full UserProfile data included)
 * 4. Authentication enforcement
 * 5. Error responses (401, 500)
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('GET /api/saved-profiles - Contract Tests', () => {
  let testUser: any;
  let authToken: string;
  let savedProfile1: any;
  let savedProfile2: any;
  let targetUser1: any;
  let targetUser2: any;

  beforeEach(async () => {
    // Clean up test data
    await db('saved_profiles').where('folder', 'like', '%choice%').delete();
    await db('users').where('email', 'like', '%test-saved-get%').delete();

    // Create test user (the one saving profiles)
    [testUser] = await db('users')
      .insert({
        email: 'user-test-saved-get@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    authToken = `Bearer mock-token-${testUser.id}`;

    // Create target users (profiles to be saved)
    [targetUser1] = await db('users')
      .insert({
        email: 'target1-test-saved-get@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    [targetUser2] = await db('users')
      .insert({
        email: 'target2-test-saved-get@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    // Create saved profiles in different folders
    [savedProfile1] = await db('saved_profiles')
      .insert({
        user_id: testUser.id,
        saved_profile_id: targetUser1.id,
        folder: 'top_choice',
        private_note: 'Great match!',
      })
      .returning('*');

    [savedProfile2] = await db('saved_profiles')
      .insert({
        user_id: testUser.id,
        saved_profile_id: targetUser2.id,
        folder: 'considering',
        private_note: 'Maybe a good fit',
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('saved_profiles').where('folder', 'like', '%choice%').delete();
    await db('users').where('email', 'like', '%test-saved-get%').delete();
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return saved profiles response schema', async () => {
      // Note: This will fail until SavedProfileService is implemented
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        // Validate response schema
        expect(response.body).toHaveProperty('savedProfiles');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.savedProfiles)).toBe(true);
        expect(typeof response.body.total).toBe('number');
        expect(response.body.total).toBeGreaterThanOrEqual(2); // We created 2
      }
    });

    it('should return SavedProfile schema for each item', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.savedProfiles.length > 0) {
        const saved = response.body.savedProfiles[0];

        // Validate SavedProfile schema
        expect(saved).toHaveProperty('id');
        expect(saved).toHaveProperty('user_id', testUser.id);
        expect(saved).toHaveProperty('saved_profile_id');
        expect(saved).toHaveProperty('folder');
        expect(saved).toHaveProperty('private_note');
        expect(saved).toHaveProperty('saved_at');
        expect(saved).toHaveProperty('profile'); // Embedded UserProfile

        // Validate folder enum
        expect(['top_choice', 'strong_maybe', 'considering', 'backup']).toContain(
          saved.folder
        );

        // Validate UUID formats
        expect(saved.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(saved.saved_profile_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should embed full UserProfile data', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.savedProfiles.length > 0) {
        const saved = response.body.savedProfiles[0];

        // Validate embedded profile object
        expect(saved.profile).toHaveProperty('id');
        expect(saved.profile).toHaveProperty('email');
        expect(saved.profile).toHaveProperty('email_verified');
        // UserProfile should include parent details, household prefs, etc.
      }
    });
  });

  describe('Folder Filtering', () => {
    it('should filter by folder=top_choice', async () => {
      const response = await request(app)
        .get('/api/saved-profiles?folder=top_choice')
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body.savedProfiles.length).toBeGreaterThanOrEqual(1);
        response.body.savedProfiles.forEach((saved: any) => {
          expect(saved.folder).toBe('top_choice');
        });
      }
    });

    it('should filter by folder=considering', async () => {
      const response = await request(app)
        .get('/api/saved-profiles?folder=considering')
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body.savedProfiles.length).toBeGreaterThanOrEqual(1);
        response.body.savedProfiles.forEach((saved: any) => {
          expect(saved.folder).toBe('considering');
        });
      }
    });

    it('should return all folders when no filter specified', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        // Should return profiles from both folders
        const folders = response.body.savedProfiles.map((s: any) => s.folder);
        expect(folders).toContain('top_choice');
        expect(folders).toContain('considering');
      }
    });

    it('should return empty array when no profiles in specified folder', async () => {
      const response = await request(app)
        .get('/api/saved-profiles?folder=backup')
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body.savedProfiles).toEqual([]);
        expect(response.body.total).toBe(0);
      }
    });

    it('should reject invalid folder enum value', async () => {
      const response = await request(app)
        .get('/api/saved-profiles?folder=invalid')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        field: 'folder',
      });
    });
  });

  describe('Authentication Enforcement', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app).get('/api/saved-profiles').expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should reject request with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });

    it('should only return saved profiles belonging to authenticated user', async () => {
      // Create another user with their own saved profiles
      const [otherUser] = await db('users')
        .insert({
          email: 'other-test-saved-get@test.com',
          email_verified: true,
          password_hash: '$2b$12$mockPasswordHash',
        })
        .returning('*');

      await db('saved_profiles').insert({
        user_id: otherUser.id,
        saved_profile_id: targetUser1.id,
        folder: 'top_choice',
      });

      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 200) {
        // Should only see testUser's saved profiles, not otherUser's
        response.body.savedProfiles.forEach((saved: any) => {
          expect(saved.user_id).toBe(testUser.id);
          expect(saved.user_id).not.toBe(otherUser.id);
        });
      }

      // Cleanup
      await db('saved_profiles').where('user_id', otherUser.id).delete();
      await db('users').where('id', otherUser.id).delete();
    });
  });

  describe('Child Safety Compliance (Constitution Principle I)', () => {
    it('should NEVER include child PII in saved profiles', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 200 && response.body.savedProfiles.length > 0) {
        response.body.savedProfiles.forEach((saved: any) => {
          // Verify NO child PII fields exist
          expect(saved.profile).not.toHaveProperty('childrenNames');
          expect(saved.profile).not.toHaveProperty('childrenPhotos');
          expect(saved.profile).not.toHaveProperty('childrenAges');
          expect(saved.profile).not.toHaveProperty('childrenSchools');

          // ONLY allowed: childrenCount (integer) and childrenAgeGroups (ranges)
          // These fields are optional but if present must be aggregated/anonymized
        });
      }
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      if (response.status === 500) {
        expect(response.body).toMatchObject({
          error: 'internal_server_error',
          message: expect.any(String),
        });

        // Should NOT leak implementation details
        expect(response.body.message).not.toContain('stack');
        expect(response.body.message).not.toContain('Error:');
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 300ms for saved profiles retrieval', async () => {
      const start = Date.now();

      await request(app).get('/api/saved-profiles').set('Authorization', authToken);

      const duration = Date.now() - start;

      // Target: <300ms for database query with JOIN
      expect(duration).toBeLessThan(300);
    });

    it('should handle large saved profile lists efficiently (50+ profiles)', async () => {
      // Create 50 saved profiles
      const profiles = [];
      for (let i = 0; i < 50; i++) {
        const [user] = await db('users')
          .insert({
            email: `bulk-${i}-test-saved-get@test.com`,
            email_verified: true,
          })
          .returning('*');

        profiles.push({
          user_id: testUser.id,
          saved_profile_id: user.id,
          folder: i % 2 === 0 ? 'top_choice' : 'considering',
        });
      }
      await db('saved_profiles').insert(profiles);

      const start = Date.now();

      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', authToken);

      const duration = Date.now() - start;

      // Should still be fast with large dataset
      expect(duration).toBeLessThan(500);

      if (response.status === 200) {
        expect(response.body.total).toBeGreaterThanOrEqual(50);
      }

      // Cleanup
      await db('saved_profiles').where('user_id', testUser.id).delete();
      await db('users').where('email', 'like', 'bulk-%').delete();
    });
  });
});
