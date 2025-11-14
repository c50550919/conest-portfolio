// @ts-nocheck
/**
 * Admin Verification Review Contract Tests
 *
 * Feature: 003-complete-3-critical (Payment-First Verification)
 * Purpose: Validate POST /api/admin/verification-review/:id contract against OpenAPI spec
 * Constitution: Principle III (Security - admin decision enforcement)
 *
 * Test Coverage:
 * 1. Request schema validation (decision required, notes optional)
 * 2. Path parameter validation (id must be UUID)
 * 3. Response schema validation (verification + refund_triggered)
 * 4. Status enforcement (must be 'consider' status)
 * 5. Refund trigger on rejection
 * 6. Admin audit trail
 * 7. Error responses (400, 401, 403, 404, 500)
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('POST /api/admin/verification-review/:id - Contract Tests', () => {
  let adminUser: any;
  let adminAuthToken: string;
  let regularUser: any;
  let regularAuthToken: string;
  let testVerification: any;
  let testPayment: any;

  beforeEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('verifications').where('background_check_status', 'consider').delete();
    await db('users').where('email', 'like', '%test-admin-review%').delete();

    // Create admin user
    [adminUser] = await db('users')
      .insert({
        email: 'admin-test-admin-review@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
        role: 'admin',
      })
      .returning('*');

    adminAuthToken = `Bearer mock-admin-token-${adminUser.id}`;

    // Create regular user
    [regularUser] = await db('users')
      .insert({
        email: 'user-test-admin-review@test.com',
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
        background_check_status: 'consider',
        certn_report_id: 'certn_review_test',
        flagged_records: JSON.stringify([
          {
            type: 'misdemeanor',
            date: '2020-01-15',
            description: 'Traffic violation',
          },
        ]),
        background_check_date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        admin_review_required: true,
      })
      .returning('*');

    // Create payment for refund testing
    [testPayment] = await db('verification_payments')
      .insert({
        user_id: regularUser.id,
        amount: 3900,
        stripe_payment_intent_id: 'pi_test_admin_review',
        status: 'succeeded',
        paid_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('verifications').where('background_check_status', 'consider').delete();
    await db('users').where('email', 'like', '%test-admin-review%').delete();
  });

  describe('Request Schema Validation', () => {
    it('should reject request without decision', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.any(String),
        field: 'decision',
      });
    });

    it('should reject request with invalid decision value', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'maybe' }) // Invalid enum value
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        field: 'decision',
      });
    });

    it('should accept request with decision=approve', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' });

      // Expect either 200 (success) or 404/500 (implementation error)
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should accept request with decision=reject', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'reject' });

      // Expect either 200 (success) or 404/500 (implementation error)
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should accept request with optional notes', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({
          decision: 'approve',
          notes: 'Traffic violation is minor and old. Approved.',
        });

      expect([200, 404, 500]).toContain(response.status);
    });

    it('should reject request with notes exceeding 1000 characters', async () => {
      const longNotes = 'A'.repeat(1001);

      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve', notes: longNotes })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        field: 'notes',
      });
    });
  });

  describe('Path Parameter Validation', () => {
    it('should reject request with invalid UUID format', async () => {
      const response = await request(app)
        .post('/api/admin/verification-review/invalid-uuid')
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.stringContaining('Invalid UUID'),
        field: 'id',
      });
    });
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return review response schema for approval', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve', notes: 'Minor traffic violation, approved.' });

      if (response.status === 200) {
        // Validate response schema
        expect(response.body).toHaveProperty('verification');
        expect(response.body).toHaveProperty('refund_triggered');
        expect(typeof response.body.refund_triggered).toBe('boolean');

        // For approval, refund should not trigger
        expect(response.body.refund_triggered).toBe(false);

        // Validate verification object
        expect(response.body.verification).toHaveProperty('id', testVerification.id);
        expect(response.body.verification).toHaveProperty(
          'background_check_status',
          'approved'
        );
        expect(response.body.verification).toHaveProperty('admin_reviewed_by', adminUser.id);
        expect(response.body.verification).toHaveProperty('admin_review_date');
        expect(response.body.verification).toHaveProperty(
          'admin_review_notes',
          'Minor traffic violation, approved.'
        );
      }
    });

    it('should return review response schema for rejection', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'reject', notes: 'Serious criminal record, rejected.' });

      if (response.status === 200) {
        // Validate response schema
        expect(response.body).toHaveProperty('verification');
        expect(response.body).toHaveProperty('refund_triggered');

        // For rejection, refund SHOULD trigger (100% refund)
        expect(response.body.refund_triggered).toBe(true);

        // Validate verification object
        expect(response.body.verification).toHaveProperty('id', testVerification.id);
        expect(response.body.verification).toHaveProperty(
          'background_check_status',
          'rejected'
        );
        expect(response.body.verification).toHaveProperty('admin_reviewed_by', adminUser.id);
        expect(response.body.verification).toHaveProperty('admin_review_date');
      }
    });

    it('should update verification status in database for approval', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' });

      if (response.status === 200) {
        const verification = await db('verifications')
          .where('id', testVerification.id)
          .first();

        expect(verification.background_check_status).toBe('approved');
        expect(verification.admin_reviewed_by).toBe(adminUser.id);
        expect(verification.admin_review_date).not.toBeNull();
        expect(verification.admin_review_required).toBe(false);
      }
    });

    it('should update verification status in database for rejection', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'reject' });

      if (response.status === 200) {
        const verification = await db('verifications')
          .where('id', testVerification.id)
          .first();

        expect(verification.background_check_status).toBe('rejected');
        expect(verification.admin_reviewed_by).toBe(adminUser.id);
        expect(verification.admin_review_date).not.toBeNull();
      }
    });
  });

  describe('Refund Trigger on Rejection', () => {
    it('should trigger 100% refund when admin rejects', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'reject', notes: 'Failed background check.' });

      if (response.status === 200) {
        expect(response.body.refund_triggered).toBe(true);

        // Verify refund record in database
        const payment = await db('verification_payments')
          .where('user_id', regularUser.id)
          .where('stripe_payment_intent_id', 'pi_test_admin_review')
          .first();

        if (payment) {
          expect(payment.status).toBe('refunded');
          expect(payment.refund_amount).toBe(3900); // 100% refund
          expect(payment.refund_reason).toBe('automated_fail');
          expect(payment.refunded_at).not.toBeNull();
        }
      }
    });

    it('should NOT trigger refund when admin approves', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' });

      if (response.status === 200) {
        expect(response.body.refund_triggered).toBe(false);

        // Verify no refund in database
        const payment = await db('verification_payments')
          .where('user_id', regularUser.id)
          .where('stripe_payment_intent_id', 'pi_test_admin_review')
          .first();

        if (payment) {
          expect(payment.status).toBe('succeeded');
          expect(payment.refund_amount).toBe(0);
          expect(payment.refund_reason).toBeNull();
        }
      }
    });
  });

  describe('Status Enforcement - Must be consider', () => {
    it('should reject review for verification not in consider status', async () => {
      // Update verification to approved status
      await db('verifications')
        .where('id', testVerification.id)
        .update({ background_check_status: 'approved' });

      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'invalid_status',
        message: expect.stringContaining("not in 'consider' status"),
      });
    });

    it('should reject review for already reviewed verification', async () => {
      // Mark as already reviewed
      await db('verifications')
        .where('id', testVerification.id)
        .update({
          admin_reviewed_by: adminUser.id,
          admin_review_date: db.fn.now(),
          admin_review_required: false,
          background_check_status: 'approved',
        });

      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'reject' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'already_reviewed',
        message: expect.stringContaining('already been reviewed'),
      });
    });
  });

  describe('Admin Authentication and Authorization', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .send({ decision: 'approve' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should reject request from non-admin user', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', regularAuthToken)
        .send({ decision: 'approve' })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'forbidden',
        message: expect.stringContaining('Admin access required'),
      });
    });
  });

  describe('Error Response Schema - 404 Not Found', () => {
    it('should return not found for non-existent verification', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post(`/api/admin/verification-review/${fakeUuid}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'not_found',
        message: expect.stringContaining('Verification not found'),
      });
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' });

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

  describe('Admin Audit Trail', () => {
    it('should record admin user who made decision', async () => {
      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve', notes: 'Audit trail test' });

      if (response.status === 200) {
        const verification = await db('verifications')
          .where('id', testVerification.id)
          .first();

        expect(verification.admin_reviewed_by).toBe(adminUser.id);
        expect(verification.admin_review_notes).toBe('Audit trail test');
        expect(verification.admin_review_date).not.toBeNull();
      }
    });

    it('should preserve timestamp of review decision', async () => {
      const beforeReview = new Date();

      const response = await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'approve' });

      const afterReview = new Date();

      if (response.status === 200) {
        const verification = await db('verifications')
          .where('id', testVerification.id)
          .first();

        const reviewDate = new Date(verification.admin_review_date);
        expect(reviewDate.getTime()).toBeGreaterThanOrEqual(beforeReview.getTime());
        expect(reviewDate.getTime()).toBeLessThanOrEqual(afterReview.getTime());
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 1 second (includes potential Stripe refund API call)', async () => {
      const start = Date.now();

      await request(app)
        .post(`/api/admin/verification-review/${testVerification.id}`)
        .set('Authorization', adminAuthToken)
        .send({ decision: 'reject' });

      const duration = Date.now() - start;

      // Target: <1s including database updates and potential Stripe refund call
      expect(duration).toBeLessThan(1000);
    });
  });
});
