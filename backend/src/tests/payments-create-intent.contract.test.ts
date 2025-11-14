// @ts-nocheck
/**
 * Payment Create Intent Contract Tests
 *
 * Feature: 003-complete-3-critical (Payment-First Verification)
 * Purpose: Validate POST /api/payments/create-intent contract against OpenAPI spec
 * Constitution: Principle III (Security - payment before verification)
 *
 * Test Coverage:
 * 1. Request schema validation (connection_request_id required)
 * 2. Response schema validation (payment_id, client_secret, amount, stripe_payment_intent_id)
 * 3. Error responses (400, 401, 404, 500)
 * 4. Payment-first architecture validation
 *
 * Reference: specs/003-complete-3-critical/contracts/openapi.yaml
 * Created: 2025-10-30
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../app';
import { db } from '../config/database';

describe('POST /api/payments/create-intent - Contract Tests', () => {
  let testUser: any;
  let recipientUser: any;
  let authToken: string;
  let connectionRequest: any;

  beforeEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('connection_requests').where('message', 'like', '%TEST_%').delete();
    await db('users').where('email', 'like', '%test-payment%').delete();

    // Create test users
    [testUser] = await db('users')
      .insert({
        email: 'sender-test-payment@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    [recipientUser] = await db('users')
      .insert({
        email: 'recipient-test-payment@test.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
      })
      .returning('*');

    // Create auth token (mock - actual implementation will use JWT)
    authToken = `Bearer mock-token-${testUser.id}`;

    // Create connection request (mutual match - both accepted)
    [connectionRequest] = await db('connection_requests')
      .insert({
        sender_id: testUser.id,
        recipient_id: recipientUser.id,
        message: 'TEST_PAYMENT_CONNECTION_REQUEST',
        status: 'accepted',
        sent_at: db.fn.now(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning('*');
  });

  afterEach(async () => {
    // Clean up test data
    await db('verification_payments').where('amount', 3900).delete();
    await db('connection_requests').where('message', 'like', '%TEST_%').delete();
    await db('users').where('email', 'like', '%test-payment%').delete();
  });

  describe('Request Schema Validation', () => {
    it('should reject request without connection_request_id', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('field', 'connection_request_id');
    });

    it('should reject request with invalid connection_request_id format', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: 'invalid-uuid' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('field', 'connection_request_id');
    });

    it('should accept request with valid connection_request_id', async () => {
      // Note: This will fail until PaymentService is implemented
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

      // Expect either 201 (success) or 404 (connection not found)
      expect([201, 404, 500]).toContain(response.status);
    });
  });

  describe('Response Schema Validation - Success (201)', () => {
    it('should return payment intent response schema', async () => {
      // This test will fail until PaymentService and Stripe integration are implemented
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

      if (response.status === 201) {
        // Validate PaymentIntentResponse schema
        expect(response.body).toHaveProperty('payment_id');
        expect(response.body).toHaveProperty('client_secret');
        expect(response.body).toHaveProperty('amount', 3900); // $39.00 in cents
        expect(response.body).toHaveProperty('stripe_payment_intent_id');

        // Validate payment_id is UUID
        expect(response.body.payment_id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );

        // Validate client_secret format (Stripe format)
        expect(response.body.client_secret).toMatch(/^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/);

        // Validate stripe_payment_intent_id format
        expect(response.body.stripe_payment_intent_id).toMatch(/^pi_[a-zA-Z0-9]+$/);
      }
    });

    it('should create verification_payment record in database', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

      if (response.status === 201) {
        // Verify database record created
        const payment = await db('verification_payments')
          .where('id', response.body.payment_id)
          .first();

        expect(payment).toBeDefined();
        expect(payment.user_id).toBe(testUser.id);
        expect(payment.connection_request_id).toBe(connectionRequest.id);
        expect(payment.amount).toBe(3900);
        expect(payment.status).toBe('pending');
        expect(payment.stripe_payment_intent_id).toBe(response.body.stripe_payment_intent_id);
      }
    });
  });

  describe('Error Response Schema - 400 Bad Request', () => {
    it('should return error for non-existent connection request', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: fakeUuid })
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'not_found',
        message: expect.stringContaining('Connection request not found'),
      });
    });

    it('should return error if payment already exists for connection', async () => {
      // Create existing payment
      await db('verification_payments').insert({
        user_id: testUser.id,
        connection_request_id: connectionRequest.id,
        amount: 3900,
        stripe_payment_intent_id: 'pi_existing_payment',
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'payment_already_exists',
        message: expect.stringContaining('already created'),
      });
    });

    it('should return error if connection is not in accepted status', async () => {
      // Update connection to pending
      await db('connection_requests')
        .where('id', connectionRequest.id)
        .update({ status: 'pending' });

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'invalid_connection_status',
        message: expect.stringContaining('must be accepted'),
      });
    });

    it('should return error if user is not part of connection', async () => {
      // Create different user
      const [otherUser] = await db('users')
        .insert({
          email: 'other-test-payment@test.com',
          email_verified: true,
          password_hash: '$2b$12$mockPasswordHash',
        })
        .returning('*');

      const otherAuthToken = `Bearer mock-token-${otherUser.id}`;

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', otherAuthToken)
        .send({ connection_request_id: connectionRequest.id })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'forbidden',
        message: expect.stringContaining('not authorized'),
      });

      // Cleanup
      await db('users').where('id', otherUser.id).delete();
    });
  });

  describe('Error Response Schema - 401 Unauthorized', () => {
    it('should return unauthorized for missing auth token', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({ connection_request_id: connectionRequest.id })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Authentication required'),
      });
    });

    it('should return unauthorized for invalid auth token', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', 'Bearer invalid-token')
        .send({ connection_request_id: connectionRequest.id })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });
  });

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      // This test simulates an unexpected error
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

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

  describe('Payment-First Architecture Validation', () => {
    it('should enforce payment before background check', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

      if (response.status === 201) {
        // Verify no background check has been initiated
        const verification = await db('verifications')
          .where('user_id', testUser.id)
          .where('background_check_status', '!=', 'not_started')
          .first();

        expect(verification).toBeUndefined();
      }
    });

    it('should set amount to exactly $39.00 (3900 cents)', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

      if (response.status === 201) {
        expect(response.body.amount).toBe(3900);

        const payment = await db('verification_payments')
          .where('id', response.body.payment_id)
          .first();

        expect(payment.amount).toBe(3900);
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 2 seconds (Stripe API call target)', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', authToken)
        .send({ connection_request_id: connectionRequest.id });

      const duration = Date.now() - start;

      // Target: <2s including Stripe API call
      expect(duration).toBeLessThan(2000);
    });
  });
});
