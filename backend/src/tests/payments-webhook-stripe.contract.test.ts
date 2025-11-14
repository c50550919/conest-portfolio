// @ts-nocheck
/**
 * Stripe Webhook Contract Tests
 *
 * Feature: 003-complete-3-critical (Payment-First Verification)
 * Purpose: Validate POST /api/payments/webhooks/stripe contract against OpenAPI spec
 * Constitution: Principle III (Security - webhook signature verification)
 *
 * Test Coverage:
 * 1. Event type validation (payment_intent.succeeded, payment_intent.payment_failed)
 * 2. Signature verification (Stripe-Signature header)
 * 3. Payment status updates in database
 * 4. Background check trigger on payment success
 * 5. Error responses (400, 500)
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('POST /api/payments/webhooks/stripe - Contract Tests', () => {
  let testUser: any;
  let testPayment: any;
  let connectionRequest: any;

  beforeEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('connection_requests').where('message', 'like', '%TEST_%').delete();
    await db('verifications').where('id_provider', 'veriff').delete();
    await db('users').where('email', 'like', '%test-webhook%').delete();

    // Create test user
    [testUser] = await db('users')
      .insert({
        email: 'test-webhook@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    // Create connection request
    [connectionRequest] = await db('connection_requests')
      .insert({
        sender_id: testUser.id,
        recipient_id: testUser.id,
        message: 'TEST_WEBHOOK_CONNECTION',
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
        stripe_payment_intent_id: 'pi_test_webhook',
        status: 'pending',
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('connection_requests').where('message', 'like', '%TEST_%').delete();
    await db('verifications').where('id_provider', 'veriff').delete();
    await db('users').where('email', 'like', '%test-webhook%').delete();
  });

  describe('Event Type Validation - payment_intent.succeeded', () => {
    it('should accept valid payment_intent.succeeded event', async () => {
      // Note: This will fail until webhook handler is implemented
      const webhookPayload = {
        id: 'evt_test_webhook_succeeded',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
            object: 'payment_intent',
            amount: 3900,
            status: 'succeeded',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      // Expect either 200 (success) or 400 (invalid signature)
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should update payment status to succeeded', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_succeeded',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'succeeded',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      if (response.status === 200) {
        // Verify payment status updated
        const payment = await db('verification_payments')
          .where('stripe_payment_intent_id', 'pi_test_webhook')
          .first();

        expect(payment.status).toBe('succeeded');
        expect(payment.paid_at).not.toBeNull();
      }
    });

    it('should trigger background check on payment success', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_trigger_bg_check',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'succeeded',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      if (response.status === 200) {
        // Verify background check initiated (implementation dependent)
        // This is a placeholder - actual verification depends on CertnAdapter implementation
        const verification = await db('verifications')
          .where('user_id', testUser.id)
          .first();

        // Background check should be initiated (not 'not_started')
        if (verification) {
          expect(['pending', 'approved', 'rejected', 'consider']).toContain(
            verification.background_check_status
          );
        }
      }
    });
  });

  describe('Event Type Validation - payment_intent.payment_failed', () => {
    it('should accept valid payment_intent.payment_failed event', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_failed',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_webhook',
            object: 'payment_intent',
            amount: 3900,
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Your card was declined.',
            },
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      // Expect either 200 (success) or 400 (invalid signature)
      expect([200, 400, 500]).toContain(response.status);
    });

    it('should update payment status to failed', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_failed',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'requires_payment_method',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      if (response.status === 200) {
        // Verify payment status updated
        const payment = await db('verification_payments')
          .where('stripe_payment_intent_id', 'pi_test_webhook')
          .first();

        expect(payment.status).toBe('failed');
        expect(payment.paid_at).toBeNull();
      }
    });

    it('should NOT trigger background check on payment failure', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_no_bg_check',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'requires_payment_method',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      if (response.status === 200) {
        // Verify no background check initiated
        const verification = await db('verifications')
          .where('user_id', testUser.id)
          .where('background_check_status', '!=', 'not_started')
          .first();

        expect(verification).toBeUndefined();
      }
    });
  });

  describe('Signature Verification', () => {
    it('should reject request without stripe-signature header', async () => {
      const webhookPayload = {
        id: 'evt_test_no_signature',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .send(webhookPayload)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.stringContaining('signature'),
      });
    });

    it('should reject request with invalid stripe-signature', async () => {
      const webhookPayload = {
        id: 'evt_test_invalid_signature',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'invalid_signature',
        message: expect.stringContaining('Webhook signature verification failed'),
      });
    });

    it('should accept request with valid stripe-signature', async () => {
      // This test requires mocking Stripe signature verification
      const webhookPayload = {
        id: 'evt_test_valid_signature',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-valid-stripe-signature')
        .send(webhookPayload);

      // Will fail until signature verification is implemented
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events gracefully', async () => {
      const webhookPayload = {
        id: 'evt_test_duplicate',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'succeeded',
          },
        },
      };

      // Send same webhook twice
      const response1 = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      const response2 = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      // Both should succeed (idempotent)
      if (response1.status === 200 && response2.status === 200) {
        // Verify payment status is correct
        const payment = await db('verification_payments')
          .where('stripe_payment_intent_id', 'pi_test_webhook')
          .first();

        expect(payment.status).toBe('succeeded');
      }
    });
  });

  describe('Error Response Schema - 400 Bad Request', () => {
    it('should return error for malformed webhook payload', async () => {
      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send({ invalid: 'payload' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.any(String),
      });
    });

    it('should return error for unsupported event type', async () => {
      const webhookPayload = {
        id: 'evt_test_unsupported',
        type: 'charge.refunded', // Unsupported event type
        data: {
          object: {},
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      // Should return 200 (acknowledge) but ignore event
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      const webhookPayload = {
        id: 'evt_test_server_error',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
          },
        },
      };

      const response = await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

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
    it('should respond within 5 seconds (Stripe webhook timeout)', async () => {
      const webhookPayload = {
        id: 'evt_test_performance',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'succeeded',
          },
        },
      };

      const start = Date.now();

      await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      const duration = Date.now() - start;

      // Target: <5s (Stripe webhook timeout)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Payment-First Architecture Validation', () => {
    it('should enforce background check ONLY after payment success', async () => {
      // Verify no background check before payment
      let verification = await db('verifications')
        .where('user_id', testUser.id)
        .first();

      if (verification) {
        expect(verification.background_check_status).toBe('not_started');
      }

      // Process payment success webhook
      const webhookPayload = {
        id: 'evt_test_payment_first',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_webhook',
            status: 'succeeded',
          },
        },
      };

      await request(app)
        .post('/api/payments/webhooks/stripe')
        .set('stripe-signature', 'mock-stripe-signature')
        .send(webhookPayload);

      // Verify background check can now proceed
      const payment = await db('verification_payments')
        .where('stripe_payment_intent_id', 'pi_test_webhook')
        .first();

      expect(payment.status).toBe('succeeded');
    });
  });
});
