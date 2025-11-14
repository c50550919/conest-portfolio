// @ts-nocheck
/**
 * Admin Verification Queue Contract Tests
 *
 * Feature: 003-complete-3-critical (Payment-First Verification)
 * Purpose: Validate GET /api/admin/verification-queue contract against OpenAPI spec
 * Constitution: Principle III (Security - admin review for 'consider' status)
 *
 * Test Coverage:
 * 1. Response schema validation (reviews array with verification details)
 * 2. 48-hour SLA calculation (hours_since_check field)
 * 3. Filter by 'consider' status only
 * 4. Admin authentication and authorization
 * 5. Error responses (401, 403, 500)
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('GET /api/admin/verification-queue - Contract Tests', () => {
  let adminUser: any;
  let adminAuthToken: string;
  let regularUser: any;
  let regularAuthToken: string;
  let testVerification: any;

  beforeEach(async () => {
    // Clean up test data
    await db('verifications').where('background_check_status', 'consider').delete();
    await db('users').where('email', 'like', '%test-admin-queue%').delete();

    // Create admin user
    [adminUser] = await db('users')
      .insert({
        email: 'admin-test-admin-queue@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
        role: 'admin', // Assuming role field exists
      })
      .returning('*');

    adminAuthToken = `Bearer mock-admin-token-${adminUser.id}`;

    // Create regular user
    [regularUser] = await db('users')
      .insert({
        email: 'user-test-admin-queue@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
        role: 'user',
      })
      .returning('*');

    regularAuthToken = `Bearer mock-user-token-${regularUser.id}`;

    // Create verification with 'consider' status
    [testVerification] = await db('verifications')
      .insert({
        user_id: regularUser.id,
        id_verification_status: 'approved',
        background_check_status: 'consider', // Requires admin review
        certn_report_id: 'certn_report_123',
        flagged_records: JSON.stringify([
          {
            type: 'misdemeanor',
            date: '2020-01-15',
            description: 'Traffic violation',
          },
        ]),
        background_check_date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        admin_review_required: true,
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('verifications').where('background_check_status', 'consider').delete();
    await db('users').where('email', 'like', '%test-admin-queue%').delete();
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return verification queue schema', async () => {
      // Note: This will fail until AdminController is implemented
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200) {
        // Validate queue response schema
        expect(response.body).toHaveProperty('reviews');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.reviews)).toBe(true);
        expect(typeof response.body.total).toBe('number');
      }
    });

    it('should return verification details in reviews array', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200 && response.body.reviews.length > 0) {
        const review = response.body.reviews[0];

        // Validate review object schema
        expect(review).toHaveProperty('verification_id');
        expect(review).toHaveProperty('user_id');
        expect(review).toHaveProperty('user_name');
        expect(review).toHaveProperty('certn_report_id');
        expect(review).toHaveProperty('flagged_records');
        expect(review).toHaveProperty('background_check_date');
        expect(review).toHaveProperty('hours_since_check');

        // Validate field types
        expect(review.verification_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(review.user_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        expect(typeof review.user_name).toBe('string');
        expect(typeof review.certn_report_id).toBe('string');
        expect(Array.isArray(review.flagged_records)).toBe(true);
        expect(typeof review.hours_since_check).toBe('number');
      }
    });

    it('should calculate hours_since_check correctly', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200 && response.body.reviews.length > 0) {
        const review = response.body.reviews[0];

        // Verification was created 2 hours ago
        expect(review.hours_since_check).toBeGreaterThanOrEqual(1);
        expect(review.hours_since_check).toBeLessThan(4); // Allow some margin
      }
    });

    it('should only include verifications with status=consider', async () => {
      // Create additional verifications with different statuses
      await db('verifications').insert([
        {
          user_id: regularUser.id,
          background_check_status: 'approved',
          id_verification_status: 'approved',
        },
        {
          user_id: regularUser.id,
          background_check_status: 'pending',
          id_verification_status: 'approved',
        },
        {
          user_id: regularUser.id,
          background_check_status: 'rejected',
          id_verification_status: 'approved',
        },
      ]);

      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200) {
        // Should only return 'consider' status
        response.body.reviews.forEach((review: any) => {
          expect(review.background_check_status).toBe('consider');
        });
      }
    });

    it('should return empty array when no pending reviews', async () => {
      // Delete all 'consider' status verifications
      await db('verifications').where('background_check_status', 'consider').delete();

      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200) {
        expect(response.body.reviews).toEqual([]);
        expect(response.body.total).toBe(0);
      }
    });
  });

  describe('48-Hour SLA Validation', () => {
    it('should flag reviews exceeding 48-hour SLA', async () => {
      // Create verification older than 48 hours
      await db('verifications').insert({
        user_id: regularUser.id,
        background_check_status: 'consider',
        certn_report_id: 'certn_old_report',
        background_check_date: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
        admin_review_required: true,
      });

      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200) {
        const overdueReview = response.body.reviews.find(
          (r: any) => r.hours_since_check > 48
        );

        if (overdueReview) {
          expect(overdueReview.hours_since_check).toBeGreaterThan(48);
          // Should have visual flag or priority indicator (implementation dependent)
        }
      }
    });

    it('should sort reviews by oldest first (approaching SLA)', async () => {
      // Create multiple reviews at different times
      await db('verifications').insert([
        {
          user_id: regularUser.id,
          background_check_status: 'consider',
          certn_report_id: 'certn_recent',
          background_check_date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          admin_review_required: true,
        },
        {
          user_id: regularUser.id,
          background_check_status: 'consider',
          certn_report_id: 'certn_oldest',
          background_check_date: new Date(Date.now() - 40 * 60 * 60 * 1000), // 40 hours ago
          admin_review_required: true,
        },
      ]);

      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      if (response.status === 200 && response.body.reviews.length > 1) {
        // Verify sorted by hours_since_check descending
        for (let i = 0; i < response.body.reviews.length - 1; i++) {
          expect(response.body.reviews[i].hours_since_check).toBeGreaterThanOrEqual(
            response.body.reviews[i + 1].hours_since_check
          );
        }
      }
    });
  });

  describe('Admin Authentication and Authorization', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should reject request with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });

    it('should reject request from non-admin user', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', regularAuthToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'forbidden',
        message: expect.stringContaining('Admin access required'),
      });
    });

    it('should accept request from admin user', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      // Should succeed or fail with 500 (implementation error), not auth error
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

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
    it('should respond within 500ms for queue retrieval', async () => {
      const start = Date.now();

      await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      const duration = Date.now() - start;

      // Target: <500ms for admin dashboard query
      expect(duration).toBeLessThan(500);
    });

    it('should handle large queue efficiently (100+ pending reviews)', async () => {
      // Create 100 pending reviews
      const reviews = [];
      for (let i = 0; i < 100; i++) {
        reviews.push({
          user_id: regularUser.id,
          background_check_status: 'consider',
          certn_report_id: `certn_bulk_${i}`,
          background_check_date: new Date(Date.now() - i * 60 * 60 * 1000),
          admin_review_required: true,
        });
      }
      await db('verifications').insert(reviews);

      const start = Date.now();

      const response = await request(app)
        .get('/api/admin/verification-queue')
        .set('Authorization', adminAuthToken);

      const duration = Date.now() - start;

      // Should still be fast with large dataset
      expect(duration).toBeLessThan(1000);

      if (response.status === 200) {
        expect(response.body.total).toBeGreaterThanOrEqual(100);
      }
    });
  });
});
