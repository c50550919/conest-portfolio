/**
 * Contract Test: PUT /api/saved-profiles/:id
 *
 * Test Scope:
 * - Update saved profile notes and folder
 * - Ownership validation
 * - Folder existence validation
 * - Input validation (notes length, folder format)
 * - Performance requirements (<200ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: PUT /api/saved-profiles/:id', () => {
  let authToken: string;
  let userId: string;
  let savedProfileId: string;
  let folderId: string;

  beforeAll(() => {
    // Mock authentication
    authToken = 'mock-jwt-token';
    userId = '64c31337-4e0f-4a41-b537-db546f26ffee';
    savedProfileId = 'saved-001';
    folderId = 'folder-001';
  });

  describe('Success Cases', () => {
    it('should update saved profile notes successfully', async () => {
      const updateData = {
        notes: 'Updated notes about this profile'
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          userId,
          notes: updateData.notes,
          updatedAt: expect.any(String)
        }
      });
    });

    it('should update saved profile folder successfully', async () => {
      const updateData = {
        folderId: folderId
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          userId,
          folderId: folderId,
          updatedAt: expect.any(String)
        }
      });
    });

    it('should update both notes and folder simultaneously', async () => {
      const updateData = {
        notes: 'New notes with folder change',
        folderId: folderId
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          userId,
          notes: updateData.notes,
          folderId: folderId,
          updatedAt: expect.any(String)
        }
      });
    });

    it('should clear notes by setting to empty string', async () => {
      const updateData = {
        notes: ''
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          userId,
          notes: '',
          updatedAt: expect.any(String)
        }
      });
    });

    it('should remove from folder by setting folderId to null', async () => {
      const updateData = {
        folderId: null
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          userId,
          folderId: null,
          updatedAt: expect.any(String)
        }
      });
    });
  });

  describe('Authorization Cases', () => {
    it('should reject update without authentication token', async () => {
      const updateData = { notes: 'Unauthorized update' };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authentication')
        }
      });
    });

    it('should reject update of profile not owned by user', async () => {
      const otherUserProfileId = 'saved-other-user';
      const updateData = { notes: 'Trying to update others profile' };

      const response = await request(app)
        .put(`/api/saved-profiles/${otherUserProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
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
    it('should reject notes exceeding 2000 characters', async () => {
      const updateData = {
        notes: 'a'.repeat(2001)
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('notes'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'notes',
              message: expect.stringContaining('2000 characters')
            })
          ])
        }
      });
    });

    it('should reject non-existent folder ID', async () => {
      const updateData = {
        folderId: 'non-existent-folder'
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: expect.stringContaining('Folder not found')
        }
      });
    });

    it('should reject folder belonging to another user', async () => {
      const otherUserFolderId = 'folder-other-user';
      const updateData = {
        folderId: otherUserFolderId
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('not authorized to use this folder')
        }
      });
    });

    it('should reject invalid UUID format for folderId', async () => {
      const updateData = {
        folderId: 'invalid-uuid'
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('folderId'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'folderId',
              message: expect.stringContaining('valid UUID')
            })
          ])
        }
      });
    });

    it('should reject empty request body', async () => {
      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('At least one field')
        }
      });
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent saved profile', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = { notes: 'Update non-existent' };

      const response = await request(app)
        .put(`/api/saved-profiles/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SAVED_PROFILE_NOT_FOUND',
          message: expect.stringContaining('Saved profile not found')
        }
      });
    });

    it('should reject invalid UUID format for saved profile ID', async () => {
      const updateData = { notes: 'Update with invalid ID' };

      const response = await request(app)
        .put('/api/saved-profiles/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
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

  describe('Performance Requirements', () => {
    it('should respond within 200ms (P95)', async () => {
      const updateData = { notes: 'Performance test update' };
      const startTime = Date.now();

      await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Child Safety Compliance', () => {
    it('should not allow child PII in notes field', async () => {
      const updateData = {
        notes: 'Child name: Tommy, age 5, goes to Lincoln Elementary'
      };

      const response = await request(app)
        .put(`/api/saved-profiles/${savedProfileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CHILD_SAFETY_VIOLATION',
          message: expect.stringContaining('child PII detected')
        }
      });
    });
  });
});
