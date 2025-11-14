/**
 * Contract Test: POST /api/connection-requests
 *
 * Test Scope:
 * - Create connection request to saved profile owner
 * - Payment verification requirement (paid users only)
 * - Duplicate prevention (one pending request per pair)
 * - Rate limiting (10 requests per 24h)
 * - Message validation (child PII detection)
 * - Performance requirements (<300ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: POST /api/connection-requests', () => {
  let authToken: string;
  let userId: string;
  let receiverId: string;

  beforeAll(() => {
    // Mock authentication (paid user with active subscription)
    authToken = 'mock-jwt-token-paid';
    userId = '64c31337-4e0f-4a41-b537-db546f26ffee';
    receiverId = '75d42448-5f1g-5b52-c648-ec657g37gghh';
  });

  describe('Success Cases', () => {
    it('should create connection request successfully', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Hi! I think we would be great roommates. Would love to connect.'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          senderId: userId,
          receiverId: receiverId,
          message: requestData.message,
          status: 'pending',
          createdAt: expect.any(String)
        }
      });
    });

    it('should create request with minimum valid message (20 chars)', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Would love to connect'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.data.message).toBe(requestData.message);
    });

    it('should create request with maximum valid message (500 chars)', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'a'.repeat(500)
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.data.message.length).toBe(500);
    });
  });

  describe('Payment Verification Cases', () => {
    it('should reject request from non-verified user', async () => {
      const unverifiedToken = 'mock-jwt-token-unverified';
      const requestData = {
        receiverId: receiverId,
        message: 'Trying to connect without verification'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send(requestData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VERIFICATION_REQUIRED',
          message: expect.stringContaining('verification and payment required'),
          details: {
            verificationStatus: 'pending',
            paymentStatus: 'unpaid',
            requiredActions: ['complete_verification', 'make_payment']
          }
        }
      });
    });

    it('should reject request from user with unpaid verification', async () => {
      const unpaidToken = 'mock-jwt-token-unpaid';
      const requestData = {
        receiverId: receiverId,
        message: 'Trying to connect without payment'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${unpaidToken}`)
        .send(requestData)
        .expect(402);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'PAYMENT_REQUIRED',
          message: expect.stringContaining('Verification payment required'),
          details: {
            verificationStatus: 'approved',
            paymentStatus: 'unpaid',
            amount: 4900,
            currency: 'usd'
          }
        }
      });
    });

    it('should allow request from user with verification under review (grace period)', async () => {
      const reviewToken = 'mock-jwt-token-under-review';
      const requestData = {
        receiverId: receiverId,
        message: 'Connecting during grace period'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${reviewToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        senderId: expect.any(String),
        status: 'pending'
      });
    });
  });

  describe('Duplicate Prevention Cases', () => {
    it('should reject duplicate pending request to same receiver', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Duplicate request attempt'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'REQUEST_ALREADY_EXISTS',
          message: expect.stringContaining('already have a pending request'),
          details: {
            existingRequestId: expect.any(String),
            status: 'pending'
          }
        }
      });
    });

    it('should allow new request after previous was rejected', async () => {
      const receiverRejectedId = 'receiver-rejected-previous';
      const requestData = {
        receiverId: receiverRejectedId,
        message: 'Trying again after rejection'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.data.status).toBe('pending');
    });

    it('should reject request if already connected', async () => {
      const connectedUserId = 'user-already-connected';
      const requestData = {
        receiverId: connectedUserId,
        message: 'Trying to connect again'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ALREADY_CONNECTED',
          message: expect.stringContaining('already connected')
        }
      });
    });
  });

  describe('Rate Limiting Cases', () => {
    it('should enforce 10 requests per 24h limit', async () => {
      // User already sent 10 requests today
      const rateLimitedToken = 'mock-jwt-token-rate-limited';
      const requestData = {
        receiverId: receiverId,
        message: 'Exceeding rate limit'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${rateLimitedToken}`)
        .send(requestData)
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('10 connection requests per 24 hours'),
          details: {
            limit: 10,
            window: '24h',
            resetAt: expect.any(String)
          }
        }
      });
    });

    it('should include rate limit headers in response', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Checking rate limit headers'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.headers).toHaveProperty('x-ratelimit-limit', '10');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Validation Cases', () => {
    it('should reject missing receiverId', async () => {
      const requestData = {
        message: 'Request without receiver'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'receiverId',
              message: expect.stringContaining('required')
            })
          ])
        }
      });
    });

    it('should reject invalid UUID format for receiverId', async () => {
      const requestData = {
        receiverId: 'invalid-uuid',
        message: 'Request with invalid receiver ID'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'receiverId',
              message: expect.stringContaining('valid UUID')
            })
          ])
        }
      });
    });

    it('should reject message shorter than 20 characters', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Too short'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'message',
              message: expect.stringContaining('at least 20 characters')
            })
          ])
        }
      });
    });

    it('should reject message longer than 500 characters', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'a'.repeat(501)
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'message',
              message: expect.stringContaining('maximum 500 characters')
            })
          ])
        }
      });
    });

    it('should reject request to self', async () => {
      const requestData = {
        receiverId: userId, // Same as sender
        message: 'Trying to connect with myself'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: expect.stringContaining('cannot send request to yourself')
        }
      });
    });

    it('should reject request to non-existent user', async () => {
      const requestData = {
        receiverId: '00000000-0000-0000-0000-000000000000',
        message: 'Request to non-existent user'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: expect.stringContaining('Receiver not found')
        }
      });
    });
  });

  describe('Child Safety Compliance', () => {
    it('should reject message containing child PII', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'My son Tommy is 5 years old and goes to Lincoln Elementary School'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CHILD_SAFETY_VIOLATION',
          message: expect.stringContaining('child PII detected'),
          details: {
            violations: expect.arrayContaining(['child_name', 'child_age', 'school_name'])
          }
        }
      });
    });

    it('should allow generic child references without PII', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'I have two children in elementary school. Would love to connect and discuss schedules.'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body.data.message).toBe(requestData.message);
    });
  });

  describe('Authorization Cases', () => {
    it('should reject request without authentication token', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Unauthorized request attempt'
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .send(requestData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authentication')
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 300ms (P95)', async () => {
      const requestData = {
        receiverId: receiverId,
        message: 'Performance test connection request'
      };
      const startTime = Date.now();

      await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(300);
    });
  });
});
