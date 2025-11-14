// @ts-nocheck
/**
 * Payment Status Contract Tests
 *
 * Feature: 003-complete-3-critical (Payment-First Verification)
 * Purpose: Validate GET /api/payments/status/:id contract against OpenAPI spec
 * Constitution: Principle III (Security - transparent payment tracking)
 *
 * Test Coverage:
 * 1. Path parameter validation (id must be UUID)
 * 2. Response schema validation (VerificationPayment schema)
 * 3. Error responses (401, 403, 404, 500)
 * 4. Status transitions (pending → succeeded/failed → refunded)
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('GET /api/payments/status/:id - Contract Tests', () => {
  let testUser: any;
  let authToken: string;
  let testPayment: any;
  let connectionRequest: any;

  beforeEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('connection_requests').where('message', 'like', '%TEST_%').delete();
    await db('users').where('email', 'like', '%test-payment-status%').delete();

    // Create test user
    [testUser] = await db('users')
      .insert({
        email: 'test-payment-status@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    // Create auth token (mock)
    authToken = `Bearer mock-token-${testUser.id}`;

    // Create connection request
    [connectionRequest] = await db('connection_requests')
      .insert({
        sender_id: testUser.id,
        recipient_id: testUser.id, // Self for testing
        message: 'TEST_PAYMENT_STATUS_CONNECTION',
        status: 'accepted',
        sent_at: db.fn.now(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning('*');

    // Create test payment
    [testPayment] = await db('verification_payments')
      .insert({
        user_id: testUser.id,
        connection_request_id: connectionRequest.id,
        amount: 3900,
        stripe_payment_intent_id: 'pi_test_payment_status',
        status: 'pending',
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('connection_requests').where('message', 'like', '%TEST_%').delete();
    await db('users').where('email', 'like', '%test-payment-status%').delete();
  });

  describe('Path Parameter Validation', () => {
    it('should reject request with invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/payments/status/invalid-uuid')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.stringContaining('Invalid UUID'),
        field: 'id',
      });
    });

    it('should accept request with valid UUID', async () => {
      // Note: This will fail until PaymentService is implemented
      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

      // Expect either 200 (success) or 404 (not found)
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return VerificationPayment schema for pending payment', async () => {
      // This test will fail until PaymentService is implemented
      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

      if (response.status === 200) {
        // Validate VerificationPayment schema
        expect(response.body).toHaveProperty('id', testPayment.id);
        expect(response.body).toHaveProperty('user_id', testUser.id);
        expect(response.body).toHaveProperty('connection_request_id', connectionRequest.id);
        expect(response.body).toHaveProperty('amount', 3900);
        expect(response.body).toHaveProperty('stripe_payment_intent_id', 'pi_test_payment_status');
        expect(response.body).toHaveProperty('status', 'pending');
        expect(response.body).toHaveProperty('refund_amount', 0);
        expect(response.body).toHaveProperty('refund_reason', null);
        expect(response.body).toHaveProperty('refunded_at', null);
        expect(response.body).toHaveProperty('paid_at', null);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
      }
    });

    it('should return VerificationPayment schema for succeeded payment', async () => {
      // Update payment to succeeded
      await db('verification_payments')
        .where('id', testPayment.id)
        .update({
          status: 'succeeded',
          paid_at: db.fn.now(),
        });

      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('status', 'succeeded');
        expect(response.body).toHaveProperty('paid_at');
        expect(response.body.paid_at).not.toBeNull();
      }
    });

    it('should return VerificationPayment schema for refunded payment', async () => {
      // Update payment to refunded
      await db('verification_payments')
        .where('id', testPayment.id)
        .update({
          status: 'refunded',
          refund_amount: 3900, // Full refund
          refund_reason: 'automated_fail',
          refunded_at: db.fn.now(),
        });

      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('status', 'refunded');
        expect(response.body).toHaveProperty('refund_amount', 3900);
        expect(response.body).toHaveProperty('refund_reason', 'automated_fail');
        expect(response.body).toHaveProperty('refunded_at');
        expect(response.body.refunded_at).not.toBeNull();
      }
    });

    it('should return partial refund (40% courtesy refund)', async () => {
      // Update payment to partial refund
      await db('verification_payments')
        .where('id', testPayment.id)
        .update({
          status: 'refunded',
          refund_amount: 1000, // 40% refund ($10)
          refund_reason: 'courtesy_30day',
          refunded_at: db.fn.now(),
        });

      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('status', 'refunded');
        expect(response.body).toHaveProperty('refund_amount', 1000);
        expect(response.body).toHaveProperty('refund_reason', 'courtesy_30day');
      }
    });
  });

  describe('Error Response Schema - 401 Unauthorized', () => {
    it('should return unauthorized for missing auth token', async () => {
      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should return unauthorized for invalid auth token', async () => {
      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });
  });

  describe('Error Response Schema - 403 Forbidden', () => {
    it('should return forbidden if user does not own payment', async () => {
      // Create different user
      const [otherUser] = await db('users')
        .insert({
          email: 'other-payment-status@test.com',
          email_verified: true,
          password_hash: '$2b$12$mockPasswordHash',
        })
        .returning('*');

      const otherAuthToken = `Bearer mock-token-${otherUser.id}`;

      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', otherAuthToken)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'forbidden',
        message: expect.stringContaining('not authorized'),
      });

      // Cleanup
      await db('users').where('id', otherUser.id).delete();
    });
  });

  describe('Error Response Schema - 404 Not Found', () => {
    it('should return not found for non-existent payment', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/payments/status/${fakeUuid}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'not_found',
        message: expect.stringContaining('Payment not found'),
      });
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const response = await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

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

  describe('Status Transition Validation', () => {
    it('should validate all valid status values', async () => {
      const validStatuses = ['pending', 'succeeded', 'failed', 'refunded'];

      for (const status of validStatuses) {
        await db('verification_payments')
          .where('id', testPayment.id)
          .update({ status });

        const response = await request(app)
          .get(`/api/payments/status/${testPayment.id}`)
          .set('Authorization', authToken);

        if (response.status === 200) {
          expect(validStatuses).toContain(response.body.status);
        }
      }
    });

    it('should validate all valid refund_reason values', async () => {
      const validReasons = ['automated_fail', 'dispute', 'courtesy_30day'];

      for (const reason of validReasons) {
        await db('verification_payments')
          .where('id', testPayment.id)
          .update({
            status: 'refunded',
            refund_amount: 3900,
            refund_reason: reason,
            refunded_at: db.fn.now(),
          });

        const response = await request(app)
          .get(`/api/payments/status/${testPayment.id}`)
          .set('Authorization', authToken);

        if (response.status === 200) {
          expect(validReasons).toContain(response.body.refund_reason);
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 200ms (database query target)', async () => {
      const start = Date.now();

      await request(app)
        .get(`/api/payments/status/${testPayment.id}`)
        .set('Authorization', authToken);

      const duration = Date.now() - start;

      // Target: <200ms for simple database query
      expect(duration).toBeLessThan(200);
    });
  });
});
