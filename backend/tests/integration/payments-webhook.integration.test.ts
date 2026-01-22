/**
 * Payment Webhook Integration Tests
 *
 * Purpose: Test the complete Stripe webhook → DB flow with REAL database
 * Unlike contract tests, these tests verify actual PostgreSQL persistence.
 *
 * Test Flow:
 * 1. Create test user in real DB
 * 2. Create pending verification payment record
 * 3. POST Stripe webhook with valid signature
 * 4. Assert: verification_payments.status = 'succeeded'
 * 5. Assert: stripe_webhook_events has completed record
 *
 * Prerequisites:
 *   docker-compose -f docker-compose.test.yml up -d
 *
 * Run with:
 *   npm run test:integration -- payments-webhook
 */

import request from 'supertest';
import app from '../../src/app';
import {
  db,
  createIntegrationTestUser,
  createStripeSignature,
} from '../setup-integration';
import { VerificationPaymentModel } from '../../src/models/VerificationPayment';

describe('Stripe Webhook Integration', () => {
  describe('POST /api/stripe/webhook - Verification Payment Success', () => {
    it('should update verification payment status to succeeded on payment_intent.succeeded', async () => {
      // 1. Setup: Create test user
      const testUser = await createIntegrationTestUser({
        email: `webhook-test-${Date.now()}@test.com`,
        emailVerified: true,
        phoneVerified: true,
      });

      // 2. Setup: Create pending verification payment record
      const stripePaymentIntentId = `pi_test_${Date.now()}`;
      const verificationPayment = await VerificationPaymentModel.create({
        user_id: testUser.id,
        amount: 3900, // $39.00
        stripe_payment_intent_id: stripePaymentIntentId,
      });

      expect(verificationPayment.status).toBe('pending');

      // 3. Create Stripe webhook event payload
      const webhookPayload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: stripePaymentIntentId,
            object: 'payment_intent',
            amount: 3900,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              type: 'verification',
              user_id: testUser.id,
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      // 4. Create valid Stripe signature
      const payloadString = JSON.stringify(webhookPayload);
      const signature = createStripeSignature(payloadString);

      // 5. POST webhook request
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);

      // 6. Assert: verification_payments.status = 'succeeded'
      const updatedPayment = await VerificationPaymentModel.findById(verificationPayment.id);
      expect(updatedPayment).toBeDefined();
      expect(updatedPayment!.status).toBe('succeeded');
      expect(updatedPayment!.paid_at).not.toBeNull();

      // 7. Assert: stripe_webhook_events has record
      const webhookEvent = await db('stripe_webhook_events')
        .where({ stripe_event_id: webhookPayload.id })
        .first();

      expect(webhookEvent).toBeDefined();
      expect(webhookEvent.event_type).toBe('payment_intent.succeeded');
      expect(webhookEvent.processing_status).toBe('completed');
    });

    it('should update verification payment status to failed on payment_intent.payment_failed', async () => {
      // 1. Setup: Create test user
      const testUser = await createIntegrationTestUser({
        email: `webhook-fail-${Date.now()}@test.com`,
      });

      // 2. Setup: Create pending verification payment record
      const stripePaymentIntentId = `pi_test_fail_${Date.now()}`;
      const verificationPayment = await VerificationPaymentModel.create({
        user_id: testUser.id,
        amount: 3900,
        stripe_payment_intent_id: stripePaymentIntentId,
      });

      // 3. Create Stripe webhook event payload for payment failure
      const webhookPayload = {
        id: `evt_test_fail_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: stripePaymentIntentId,
            object: 'payment_intent',
            amount: 3900,
            currency: 'usd',
            status: 'requires_payment_method',
            metadata: {
              type: 'verification',
              user_id: testUser.id,
            },
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined.',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      // 4. Create valid Stripe signature
      const payloadString = JSON.stringify(webhookPayload);
      const signature = createStripeSignature(payloadString);

      // 5. POST webhook request
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(response.status).toBe(200);

      // 6. Assert: verification_payments.status = 'failed'
      const updatedPayment = await VerificationPaymentModel.findById(verificationPayment.id);
      expect(updatedPayment).toBeDefined();
      expect(updatedPayment!.status).toBe('failed');
    });

    it('should skip duplicate webhook events (idempotency)', async () => {
      // 1. Setup: Create test user and payment
      const testUser = await createIntegrationTestUser({
        email: `webhook-dupe-${Date.now()}@test.com`,
      });

      const stripePaymentIntentId = `pi_test_dupe_${Date.now()}`;
      const verificationPayment = await VerificationPaymentModel.create({
        user_id: testUser.id,
        amount: 3900,
        stripe_payment_intent_id: stripePaymentIntentId,
      });

      // 2. Create webhook event with fixed event ID
      const eventId = `evt_test_dupe_${Date.now()}`;
      const webhookPayload = {
        id: eventId,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: stripePaymentIntentId,
            object: 'payment_intent',
            amount: 3900,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              type: 'verification',
              user_id: testUser.id,
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createStripeSignature(payloadString);

      // 3. First webhook call - should process
      const response1 = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(response1.status).toBe(200);

      // 4. Verify payment was updated
      const paymentAfterFirst = await VerificationPaymentModel.findById(verificationPayment.id);
      expect(paymentAfterFirst!.status).toBe('succeeded');

      // 5. Second webhook call with same event ID - should be skipped
      const response2 = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(response2.status).toBe(200);

      // 6. Verify event was tracked
      const webhookEvents = await db('stripe_webhook_events')
        .where({ stripe_event_id: eventId })
        .select('processing_status');

      // Should still be 'completed' (not processed twice)
      expect(webhookEvents).toHaveLength(1);
      // Status should be completed OR skipped (depending on timing)
      expect(['completed', 'skipped']).toContain(webhookEvents[0].processing_status);
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        id: `evt_test_invalid_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: `pi_test_invalid_${Date.now()}`,
            object: 'payment_intent',
            amount: 3900,
            currency: 'usd',
            status: 'succeeded',
            metadata: { type: 'verification' },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      const payloadString = JSON.stringify(webhookPayload);
      // Use wrong secret for signature
      const invalidSignature = createStripeSignature(payloadString, 'wrong_secret');

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', invalidSignature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('signature');
    });

    it('should reject webhook without signature header', async () => {
      const webhookPayload = {
        id: `evt_test_nosig_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test', metadata: { type: 'verification' } },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(webhookPayload));

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No signature');
    });
  });

  describe('Webhook Event Tracking', () => {
    it('should record webhook event in stripe_webhook_events table', async () => {
      const testUser = await createIntegrationTestUser({
        email: `webhook-track-${Date.now()}@test.com`,
      });

      const stripePaymentIntentId = `pi_test_track_${Date.now()}`;
      await VerificationPaymentModel.create({
        user_id: testUser.id,
        amount: 3900,
        stripe_payment_intent_id: stripePaymentIntentId,
      });

      const eventId = `evt_test_track_${Date.now()}`;
      const webhookPayload = {
        id: eventId,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: stripePaymentIntentId,
            object: 'payment_intent',
            amount: 3900,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              type: 'verification',
              user_id: testUser.id,
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createStripeSignature(payloadString);

      await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      // Verify webhook event record
      const webhookEvent = await db('stripe_webhook_events')
        .where({ stripe_event_id: eventId })
        .first();

      expect(webhookEvent).toBeDefined();
      expect(webhookEvent.stripe_event_id).toBe(eventId);
      expect(webhookEvent.event_type).toBe('payment_intent.succeeded');
      expect(webhookEvent.processing_status).toBe('completed');
      expect(webhookEvent.received_at).toBeDefined();
      expect(webhookEvent.processed_at).toBeDefined();
      expect(webhookEvent.error_message).toBeNull();
    });
  });

  describe('Regular Payment Webhook (Non-Verification)', () => {
    it('should handle regular payment_intent.succeeded without verification metadata', async () => {
      // Create a regular payment webhook (not verification type)
      const eventId = `evt_test_regular_${Date.now()}`;
      const paymentIntentId = `pi_test_regular_${Date.now()}`;

      const webhookPayload = {
        id: eventId,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: paymentIntentId,
            object: 'payment_intent',
            amount: 50000, // $500.00 rent payment
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              type: 'rent',
              household_id: 'test_household',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createStripeSignature(payloadString);

      // Should not error even without a payment record
      // The service handles missing payment_id gracefully
      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(response.status).toBe(200);

      // Webhook event should still be recorded
      const webhookEvent = await db('stripe_webhook_events')
        .where({ stripe_event_id: eventId })
        .first();

      expect(webhookEvent).toBeDefined();
      expect(webhookEvent.processing_status).toBe('completed');
    });
  });
});
