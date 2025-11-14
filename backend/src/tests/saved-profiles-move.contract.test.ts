/**
 * Contract Test: POST /api/saved-profiles/:id/move
 *
 * Test Scope:
 * - Move saved profile to folder
 * - Remove from folder (move to root)
 * - Ownership validation for both profile and folder
 * - Folder capacity limits
 * - Performance requirements (<150ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: POST /api/saved-profiles/:id/move', () => {
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
    it('should move saved profile to folder successfully', async () => {
      const moveData = {
        folderId: folderId
      };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
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

    it('should move saved profile to root (remove from folder)', async () => {
      const moveData = {
        folderId: null
      };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
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

    it('should move profile between folders', async () => {
      const targetFolderId = 'folder-002';
      const moveData = {
        folderId: targetFolderId
      };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          folderId: targetFolderId,
          updatedAt: expect.any(String)
        }
      });
    });

    it('should handle moving profile to same folder (idempotent)', async () => {
      // Profile already in folder-001
      const moveData = {
        folderId: folderId
      };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: savedProfileId,
          folderId: folderId
        }
      });
    });
  });

  describe('Authorization Cases', () => {
    it('should reject move without authentication token', async () => {
      const moveData = { folderId: folderId };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .send(moveData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authentication')
        }
      });
    });

    it('should reject move of profile not owned by user', async () => {
      const otherUserProfileId = 'saved-other-user';
      const moveData = { folderId: folderId };

      const response = await request(app)
        .post(`/api/saved-profiles/${otherUserProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('not authorized')
        }
      });
    });

    it('should reject move to folder not owned by user', async () => {
      const otherUserFolderId = 'folder-other-user';
      const moveData = { folderId: otherUserFolderId };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: expect.stringContaining('not authorized to use this folder')
        }
      });
    });
  });

  describe('Validation Cases', () => {
    it('should reject invalid UUID format for saved profile ID', async () => {
      const moveData = { folderId: folderId };

      const response = await request(app)
        .post('/api/saved-profiles/invalid-uuid/move')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid saved profile ID')
        }
      });
    });

    it('should reject invalid UUID format for folder ID', async () => {
      const moveData = { folderId: 'invalid-uuid' };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
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

    it('should reject missing folderId in request body', async () => {
      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('folderId'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'folderId',
              message: expect.stringContaining('required')
            })
          ])
        }
      });
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent saved profile', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const moveData = { folderId: folderId };

      const response = await request(app)
        .post(`/api/saved-profiles/${nonExistentId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SAVED_PROFILE_NOT_FOUND',
          message: expect.stringContaining('Saved profile not found')
        }
      });
    });

    it('should return 404 for non-existent folder', async () => {
      const nonExistentFolderId = '00000000-0000-0000-0000-000000000000';
      const moveData = { folderId: nonExistentFolderId };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FOLDER_NOT_FOUND',
          message: expect.stringContaining('Folder not found')
        }
      });
    });

    it('should reject move to full folder (capacity limit)', async () => {
      const fullFolderId = 'folder-full';
      const moveData = { folderId: fullFolderId };

      const response = await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'FOLDER_CAPACITY_EXCEEDED',
          message: expect.stringContaining('Folder has reached maximum capacity'),
          details: expect.objectContaining({
            maxCapacity: 50,
            currentCount: 50
          })
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 150ms (P95)', async () => {
      const moveData = { folderId: folderId };
      const startTime = Date.now();

      await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(moveData)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(150);
    });
  });

  describe('Side Effects Verification', () => {
    it('should remove profile from previous folder when moved', async () => {
      const oldFolderId = 'folder-old';
      const newFolderId = 'folder-new';

      // Move to new folder
      await request(app)
        .post(`/api/saved-profiles/${savedProfileId}/move`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ folderId: newFolderId })
        .expect(200);

      // Verify old folder no longer contains profile
      const oldFolderResponse = await request(app)
        .get(`/api/saved-profiles/folders/${oldFolderId}/profiles`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(oldFolderResponse.body.data).not.toContainEqual(
        expect.objectContaining({ id: savedProfileId })
      );

      // Verify new folder contains profile
      const newFolderResponse = await request(app)
        .get(`/api/saved-profiles/folders/${newFolderId}/profiles`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(newFolderResponse.body.data).toContainEqual(
        expect.objectContaining({ id: savedProfileId })
      );
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent moves to same folder', async () => {
      const profile1 = 'saved-concurrent-001';
      const profile2 = 'saved-concurrent-002';
      const targetFolder = 'folder-target';

      const [response1, response2] = await Promise.all([
        request(app)
          .post(`/api/saved-profiles/${profile1}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ folderId: targetFolder }),
        request(app)
          .post(`/api/saved-profiles/${profile2}/move`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ folderId: targetFolder })
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.folderId).toBe(targetFolder);
      expect(response2.body.data.folderId).toBe(targetFolder);
    });
  });
});
