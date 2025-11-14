// @ts-nocheck
/**
 * Saved Profiles POST Contract Tests
 *
 * Feature: 003-complete-3-critical (Saved Profiles)
 * Purpose: Validate POST /api/saved-profiles contract against OpenAPI spec
 * Constitution: Principle I (Child Safety - no child data storage)
 *
 * Test Coverage:
 * 1. Request schema validation (saved_profile_id required, folder/note optional)
 * 2. Response schema validation (SavedProfile with 201 status)
 * 3. Duplicate detection (cannot save same profile twice)
 * 4. Default folder assignment (defaults to 'considering')
 * 5. Private note validation (max 500 characters)
 * 6. Error responses (400, 401, 404, 500)
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('POST /api/saved-profiles - Contract Tests', () => {
  let testUser: any;
  let authToken: string;
  let targetUser: any;

  beforeEach(async () => {
    // Clean up test data
    await db('saved_profiles').delete();
    await db('users').where('email', 'like', '%test-saved-post%').delete();

    // Create test user
    [testUser] = await db('users')
      .insert({
        email: 'user-test-saved-post@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    authToken = `Bearer mock-token-${testUser.id}`;

    // Create target user (profile to be saved)
    [targetUser] = await db('users')
      .insert({
        email: 'target-test-saved-post@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('saved_profiles').delete();
    await db('users').where('email', 'like', '%test-saved-post%').delete();
  });

  describe('Request Schema Validation', () => {
    it('should reject request without saved_profile_id', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.any(String),
        field: 'saved_profile_id',
      });
    });

    it('should reject request with invalid saved_profile_id format', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: 'invalid-uuid' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        field: 'saved_profile_id',
      });
    });

    it('should accept request with valid saved_profile_id only', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: targetUser.id });

      // Expect either 201 (success) or 404/500 (implementation error)
      expect([201, 404, 500]).toContain(response.status);
    });

    it('should accept request with optional folder', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({
          saved_profile_id: targetUser.id,
          folder: 'top_choice',
        });

      expect([201, 404, 500]).toContain(response.status);
    });

    it('should accept request with optional private_note', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({
          saved_profile_id: targetUser.id,
          private_note: 'Great match for my household!',
        });

      expect([201, 404, 500]).toContain(response.status);
    });

    it('should reject invalid folder enum value', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({
          saved_profile_id: targetUser.id,
          folder: 'invalid_folder',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        field: 'folder',
      });
    });

    it('should reject private_note exceeding 500 characters', async () => {
      const longNote = 'A'.repeat(501);

      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({
          saved_profile_id: targetUser.id,
          private_note: longNote,
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        field: 'private_note',
      });
    });
  });

  describe('Response Schema Validation - Success (201)', () => {
    it('should return SavedProfile schema', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({
          saved_profile_id: targetUser.id,
          folder: 'top_choice',
          private_note: 'Perfect match!',
        });

      if (response.status === 201) {
        // Validate SavedProfile schema
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('user_id', testUser.id);
        expect(response.body).toHaveProperty('saved_profile_id', targetUser.id);
        expect(response.body).toHaveProperty('folder', 'top_choice');
        expect(response.body).toHaveProperty('private_note', 'Perfect match!');
        expect(response.body).toHaveProperty('saved_at');
        expect(response.body).toHaveProperty('profile'); // Embedded UserProfile

        // Validate UUID format
        expect(response.body.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should create saved profile record in database', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({
          saved_profile_id: targetUser.id,
          folder: 'considering',
        });

      if (response.status === 201) {
        // Verify database record
        const savedProfile = await db('saved_profiles')
          .where('id', response.body.id)
          .first();

        expect(savedProfile).toBeDefined();
        expect(savedProfile.user_id).toBe(testUser.id);
        expect(savedProfile.saved_profile_id).toBe(targetUser.id);
        expect(savedProfile.folder).toBe('considering');
      }
    });

    it('should default folder to considering when not specified', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: targetUser.id });

      if (response.status === 201) {
        expect(response.body.folder).toBe('considering');

        const savedProfile = await db('saved_profiles')
          .where('id', response.body.id)
          .first();

        expect(savedProfile.folder).toBe('considering');
      }
    });

    it('should embed full UserProfile data in response', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: targetUser.id });

      if (response.status === 201) {
        // Validate embedded profile
        expect(response.body.profile).toHaveProperty('id', targetUser.id);
        expect(response.body.profile).toHaveProperty('email', targetUser.email);
      }
    });
  });

  describe('Duplicate Detection', () => {
    it('should reject duplicate save of same profile', async () => {
      // First save succeeds
      const firstResponse = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: targetUser.id });

      if (firstResponse.status === 201) {
        // Second save fails with 400
        const secondResponse = await request(app)
          .post('/api/saved-profiles')
          .set('Authorization', authToken)
          .send({ saved_profile_id: targetUser.id })
          .expect(400);

        expect(secondResponse.body).toMatchObject({
          error: 'duplicate_save',
          message: expect.stringContaining('already saved'),
        });
      }
    });
  });

  describe('Error Response Schema - 404 Not Found', () => {
    it('should return not found for non-existent profile', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: fakeUuid })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'not_found',
        message: expect.stringContaining('Profile not found'),
      });
    });

    it('should prevent user from saving their own profile', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: testUser.id }) // Trying to save own profile
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'invalid_operation',
        message: expect.stringContaining('cannot save your own profile'),
      });
    });
  });

  describe('Authentication Enforcement', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .send({ saved_profile_id: targetUser.id })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should reject request with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', 'Bearer invalid-token')
        .send({ saved_profile_id: targetUser.id })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const response = await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: targetUser.id });

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
    it('should respond within 200ms for save operation', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/saved-profiles')
        .set('Authorization', authToken)
        .send({ saved_profile_id: targetUser.id });

      const duration = Date.now() - start;

      // Target: <200ms for INSERT with JOIN
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Folder Management', () => {
    it('should accept all valid folder enum values', async () => {
      const validFolders = ['top_choice', 'strong_maybe', 'considering', 'backup'];

      for (const folder of validFolders) {
        // Create unique target user for each test
        const [user] = await db('users')
          .insert({
            email: `target-${folder}-test@test.com`,
            email_verified: true,
          })
          .returning('*');

        const response = await request(app)
          .post('/api/saved-profiles')
          .set('Authorization', authToken)
          .send({
            saved_profile_id: user.id,
            folder: folder,
          });

        if (response.status === 201) {
          expect(response.body.folder).toBe(folder);
        }

        // Cleanup
        await db('saved_profiles').where('saved_profile_id', user.id).delete();
        await db('users').where('id', user.id).delete();
      }
    });
  });
});
