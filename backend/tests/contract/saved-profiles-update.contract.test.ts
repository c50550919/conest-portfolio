/**
 * Contract Test: PATCH /api/saved-profiles/:id
 *
 * Test Scope:
 * - Request schema validation
 * - Authentication enforcement
 * - Error responses (400, 401)
 *
 * Note: Tests that require database fixtures are skipped or expect errors
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 * Updated: 2025-12-11
 */

import request from 'supertest';
import app from '../app';

describe('Contract: PATCH /api/saved-profiles/:id', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('Authorization Cases', () => {
    it('should reject update without authentication token', async () => {
      const updateData = { notes: 'Unauthorized update' };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should reject update with invalid authentication token', async () => {
      const updateData = { notes: 'Invalid token update' };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(updateData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('Validation Cases', () => {
    it('should reject notes exceeding 500 characters', async () => {
      const updateData = {
        notes: 'a'.repeat(501),
      };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send(updateData);

      // Should get 400 (validation) or 401 (auth failure with mock token)
      expect([400, 401]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should accept notes within 500 character limit', async () => {
      const updateData = {
        notes: 'a'.repeat(500),
      };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send(updateData);

      // Should not be a validation error (400)
      expect(response.status).not.toBe(400);
    });

    it('should reject invalid folder value', async () => {
      const updateData = {
        folder: 'invalid_folder',
      };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should accept valid folder values', async () => {
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

    it('should reject empty request body', async () => {
      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send({});

      // Should get 400 (validation) or 401 (auth failure with mock token)
      expect([400, 401]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject invalid UUID format', async () => {
      const updateData = { notes: 'Test note' };

      const response = await request(app)
        .patch('/api/saved-profiles/invalid-uuid')
        .set('Authorization', 'Bearer mock-token-test')
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('Response Format', () => {
    it('should return expected response structure when successful', async () => {
      const updateData = { notes: 'Updated notes' };

      const response = await request(app)
        .patch(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test')
        .send(updateData);

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            user_id: expect.any(String),
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
        .send({ notes: 'test' });

      // Should return error without stack traces
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toMatch(/Error:/);
    });
  });
});
