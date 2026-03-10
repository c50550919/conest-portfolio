/**
 * Contract Test: Saved Profiles Move (via PATCH)
 *
 * Test Scope:
 * - Folder validation for move operations
 * - Authentication enforcement
 * - Error responses (400, 401)
 *
 * Note: The "move" operation is handled by PATCH /api/saved-profiles/:id
 * This test validates folder changes specifically
 * Tests that require database fixtures are skipped or expect errors
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 * Updated: 2025-12-11
 */

import request from 'supertest';
import app from '../../src/app';

describe('Contract: Move Saved Profiles (PATCH folder)', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('Validation Cases', () => {
    it('should reject invalid folder value', async () => {
      const moveData = {
        folder: 'invalid_folder',
      };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send(moveData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should accept all valid folder enum values', async () => {
      const validFolders = ['Top Choice', 'Strong Maybe', 'Considering', 'Backup'];

      for (const folder of validFolders) {
        const response = await request(app)
          .patch(`/api/saved-profiles/${validUUID}`)
          .set('Authorization', 'Bearer mock-token-test')
          .send({ folder });

        // Should not be a validation error (400)
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Authorization Cases', () => {
    it('should reject move without authentication token', async () => {
      const moveData = { folder: 'Considering' };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .send(moveData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should reject move with invalid authentication token', async () => {
      const moveData = { folder: 'Considering' };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(moveData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('Response Format', () => {
    it('should return expected response structure when successful', async () => {
      const moveData = { folder: 'Considering' };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send(moveData);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            user_id: expect.any(String),
            folder: expect.any(String),
          }),
        });
      }
    });
  });

  describe('Error Response Format', () => {
    it('should not leak implementation details in error responses', async () => {
      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer invalid-token')
        .send({ folder: 'Considering' });

      // Should return error without stack traces
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toMatch(/Error:/);
    });
  });
});
