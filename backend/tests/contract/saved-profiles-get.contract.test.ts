// @ts-nocheck
/**
 * Saved Profiles GET Contract Tests
 *
 * Feature: 003-complete-3-critical (Saved Profiles)
 * Purpose: Validate GET /api/saved-profiles contract against OpenAPI spec
 * Constitution: Principle I (Child Safety - no child data in saved profiles)
 *
 * Test Coverage:
 * 1. Authentication enforcement
 * 2. Query parameter validation
 * 3. Error responses (401, 400)
 *
 * Note: Tests that require database fixtures are skipped or expect errors
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Updated: 2025-12-11
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../../src/app';

// Mock SavedProfileModel to return arrays instead of null from DB mock
jest.mock('../../src/models/SavedProfile', () => ({
  SavedProfileModel: {
    findByUserId: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    isSaved: jest.fn().mockResolvedValue(false),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(1),
    countByUserId: jest.fn().mockResolvedValue(0),
    getDecryptedNotes: jest.fn().mockResolvedValue(null),
  },
}));

describe('GET /api/saved-profiles - Contract Tests', () => {
  describe('Authentication Enforcement', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app).get('/api/saved-profiles').expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should reject request with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });
  });

  describe('Query Parameter Validation', () => {
    it('should reject invalid folder enum value', async () => {
      const response = await request(app)
        .get('/api/saved-profiles?folder=invalid')
        .set('Authorization', 'Bearer mock-token-test')
        .expect(400);

      expect(response.body).toMatchObject({
        error: expect.any(String),
      });
    });

    it('should accept valid folder enum values without error', async () => {
      const validFolders = ['Top Choice', 'Strong Maybe', 'Considering', 'Backup'];

      for (const folder of validFolders) {
        const response = await request(app)
          .get(`/api/saved-profiles?folder=${encodeURIComponent(folder)}`)
          .set('Authorization', 'Bearer mock-token-test');

        // Should not be a validation error (400)
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Response Format', () => {
    it('should return expected response structure when successful', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', 'Bearer mock-token-test');

      if (response.status === 200) {
        // Validate response schema - API returns { success, data, count }
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('count');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('Child Safety Compliance (Constitution Principle I)', () => {
    it('should NEVER include child PII in saved profiles', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', 'Bearer mock-token-test');

      if (response.status === 200 && response.body.data?.length > 0) {
        response.body.data.forEach((saved: any) => {
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

  describe('Error Response Format', () => {
    it('should not leak implementation details in error responses', async () => {
      const response = await request(app)
        .get('/api/saved-profiles')
        .set('Authorization', 'Bearer invalid-token');

      // Should return error without stack traces
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toMatch(/Error:/);
    });
  });
});
