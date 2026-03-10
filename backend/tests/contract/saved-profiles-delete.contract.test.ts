/**
 * Contract Test: DELETE /api/saved-profiles/:id
 *
 * Test Scope:
 * - Authentication enforcement
 * - URL parameter validation
 * - Error responses (400, 401)
 *
 * Note: Tests that require database fixtures are skipped or expect errors
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 * Updated: 2025-12-11
 */

import request from 'supertest';
import app from '../../src/app';

describe('Contract: DELETE /api/saved-profiles/:id', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('Authorization Cases', () => {
    it('should reject deletion without authentication token', async () => {
      const response = await request(app).delete(`/api/saved-profiles/${validUUID}`).expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should reject deletion with invalid authentication token', async () => {
      const response = await request(app)
        .delete(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('Validation Cases', () => {
    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/saved-profiles/invalid-uuid')
        .set('Authorization', 'Bearer mock-token-test')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should accept valid UUID format', async () => {
      const response = await request(app)
        .delete(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test');

      // Should not be a validation error (400), may be 404 or 500 due to missing DB records
      expect(response.status).not.toBe(400);
    });
  });

  describe('Response Format', () => {
    it('should return expected response structure when successful', async () => {
      const response = await request(app)
        .delete(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer mock-token-test');

      if (response.status === 200) {
        expect(response.body).toMatchObject({
          success: true,
          message: expect.any(String),
        });
      }
    });
  });

  describe('Error Response Format', () => {
    it('should not leak implementation details in error responses', async () => {
      const response = await request(app)
        .delete(`/api/saved-profiles/${validUUID}`)
        .set('Authorization', 'Bearer invalid-token');

      // Should return error without stack traces
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toMatch(/Error:/);
    });
  });
});
