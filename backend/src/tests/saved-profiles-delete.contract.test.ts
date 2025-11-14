/**
 * Contract Test: DELETE /api/saved-profiles/:id
 *
 * Test Scope:
 * - Remove saved profile (soft delete)
 * - Ownership validation
 * - Cascade behavior (preserve connections if already established)
 * - Performance requirements (<100ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: DELETE /api/saved-profiles/:id', () => {
  let authToken: string;
  let userId: string;
  let savedProfileId: string;

  beforeAll(() => {
    // Mock authentication
    authToken = 'mock-jwt-token';
    userId = '64c31337-4e0f-4a41-b537-db546f26ffee';
    savedProfileId = 'saved-001';
  });

  describe('Success Cases', () => {
    it('should delete saved profile successfully', async () => {
      const response = await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Saved profile removed successfully'
      });
    });

    it('should return 204 with no content on successful deletion', async () => {
      await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('should soft delete profile (not hard delete)', async () => {
      await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify profile is soft deleted (deleted_at timestamp set)
      const checkResponse = await request(app)
        .get(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(checkResponse.body).toMatchObject({
        success: false,
        error: {
          code: 'SAVED_PROFILE_NOT_FOUND',
          message: expect.stringContaining('not found')
        }
      });
    });

    it('should preserve existing connection if profile was connected', async () => {
      const connectedProfileId = 'saved-connected-001';

      const response = await request(app)
        .delete(`/api/saved-profiles/${connectedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('removed'),
        data: {
          connectionPreserved: true,
          connectionId: expect.any(String)
        }
      });
    });
  });

  describe('Authorization Cases', () => {
    it('should reject deletion without authentication token', async () => {
      const response = await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authentication')
        }
      });
    });

    it('should reject deletion of profile not owned by user', async () => {
      const otherUserProfileId = 'saved-other-user';

      const response = await request(app)
        .delete(`/api/saved-profiles/${otherUserProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('not authorized')
        }
      });
    });
  });

  describe('Validation Cases', () => {
    it('should reject invalid UUID format for saved profile ID', async () => {
      const response = await request(app)
        .delete('/api/saved-profiles/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid saved profile ID')
        }
      });
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent saved profile', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/saved-profiles/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SAVED_PROFILE_NOT_FOUND',
          message: expect.stringContaining('Saved profile not found')
        }
      });
    });

    it('should return 410 for already deleted saved profile', async () => {
      const deletedProfileId = 'saved-already-deleted';

      const response = await request(app)
        .delete(`/api/saved-profiles/${deletedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(410);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ALREADY_DELETED',
          message: expect.stringContaining('already been removed')
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 100ms (P95)', async () => {
      const startTime = Date.now();

      await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate delete requests gracefully', async () => {
      // First deletion
      await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Second deletion (idempotent)
      const response = await request(app)
        .delete(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(410);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ALREADY_DELETED'
        }
      });
    });
  });

  describe('Side Effects Verification', () => {
    it('should remove profile from all folders on deletion', async () => {
      const profileInFolder = 'saved-in-folder-001';

      await request(app)
        .delete(`/api/saved-profiles/${profileInFolder}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify folder no longer contains this profile
      const folderResponse = await request(app)
        .get('/api/saved-profiles/folders/folder-001/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(folderResponse.body.data).not.toContainEqual(
        expect.objectContaining({ id: profileInFolder })
      );
    });

    it('should not affect other users saved profiles of same target', async () => {
      const targetProfileId = 'profile-123';
      const userASavedId = 'saved-user-a-001';

      // User A deletes their saved profile
      await request(app)
        .delete(`/api/saved-profiles/${userASavedId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify User B's saved profile of same target remains
      const otherUserToken = 'mock-jwt-token-user-b';
      const userBSavedId = 'saved-user-b-001';

      const checkResponse = await request(app)
        .get(`/api/saved-profiles/${userBSavedId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(checkResponse.body.data).toMatchObject({
        id: userBSavedId,
        profileId: targetProfileId
      });
    });
  });
});
