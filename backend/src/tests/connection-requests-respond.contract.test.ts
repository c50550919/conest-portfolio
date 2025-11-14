/**
 * Contract Test: POST /api/connection-requests/:id/respond
 *
 * Test Scope:
 * - Accept/reject connection requests
 * - Payment verification requirement (both parties)
 * - Background check verification requirement
 * - Status transitions (pending → accepted/rejected)
 * - Notification triggers
 * - Performance requirements (<300ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: POST /api/connection-requests/:id/respond', () => {
  let authToken: string;
  let userId: string;
  let requestId: string;

  beforeAll(() => {
    // Mock authentication (verified, paid receiver)
    authToken = 'mock-jwt-token-verified-paid';
    userId = '75d42448-5f1g-5b52-c648-ec657g37gghh';
    requestId = 'request-001';
  });

  describe('Accept Cases', () => {
    it('should accept connection request successfully', async () => {
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: requestId,
          status: 'accepted',
          verification_unlocked: true,
          responded_at: expect.any(String)
        }
      });
    });

    it('should create match record when accepting request', async () => {
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        match_created: true,
        match_id: expect.any(String)
      });
    });

    it('should trigger notifications when accepting request', async () => {
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        notification_sent: true
      });
    });
  });

  describe('Reject Cases', () => {
    it('should reject connection request successfully', async () => {
      const responseData = {
        action: 'reject'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: requestId,
          status: 'rejected',
          verification_unlocked: false,
          responded_at: expect.any(String)
        }
      });
    });

    it('should not create match when rejecting request', async () => {
      const responseData = {
        action: 'reject'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      expect(response.body.data).toMatchObject({
        match_created: false
      });
    });
  });

  describe('Payment Verification Cases', () => {
    it('should reject accept if receiver has no payment', async () => {
      const unpaidToken = 'mock-jwt-token-unpaid';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${unpaidToken}`)
        .send(responseData)
        .expect(402);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RECEIVER_PAYMENT_REQUIRED',
          message: expect.stringContaining('verification payment required')
        }
      });
    });

    it('should reject accept if sender has no payment', async () => {
      // Request where sender hasn't paid
      const requestIdUnpaidSender = 'request-unpaid-sender';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestIdUnpaidSender}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(402);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SENDER_PAYMENT_REQUIRED',
          message: expect.stringContaining('Sender verification payment required')
        }
      });
    });

    it('should reject accept if receiver background check not approved', async () => {
      const unverifiedToken = 'mock-jwt-token-paid-not-verified';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send(responseData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RECEIVER_VERIFICATION_REQUIRED',
          message: expect.stringContaining('background check must be approved')
        }
      });
    });

    it('should allow reject without payment or verification', async () => {
      const unpaidToken = 'mock-jwt-token-unpaid';
      const responseData = {
        action: 'reject'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${unpaidToken}`)
        .send(responseData)
        .expect(200);

      expect(response.body.data.status).toBe('rejected');
    });
  });

  describe('Authorization Cases', () => {
    it('should reject response without authentication token', async () => {
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .send(responseData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('authentication')
        }
      });
    });

    it('should reject response from non-receiver user', async () => {
      const otherUserToken = 'mock-jwt-token-other-user';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send(responseData)
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_AUTHORIZED',
          message: expect.stringContaining('not authorized to respond')
        }
      });
    });
  });

  describe('Validation Cases', () => {
    it('should reject missing action field', async () => {
      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'action',
              message: expect.stringContaining('required')
            })
          ])
        }
      });
    });

    it('should reject invalid action value', async () => {
      const responseData = {
        action: 'invalid'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'action',
              message: expect.stringContaining('accept or reject')
            })
          ])
        }
      });
    });

    it('should reject invalid UUID format for request ID', async () => {
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post('/api/connection-requests/invalid-uuid/respond')
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('Invalid request ID')
        }
      });
    });
  });

  describe('Status Transition Cases', () => {
    it('should reject response to already accepted request', async () => {
      const acceptedRequestId = 'request-already-accepted';
      const responseData = {
        action: 'reject'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${acceptedRequestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: expect.stringContaining('already been responded to')
        }
      });
    });

    it('should reject response to cancelled request', async () => {
      const cancelledRequestId = 'request-cancelled';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${cancelledRequestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: expect.stringContaining('Request has been cancelled')
        }
      });
    });

    it('should reject response to expired request', async () => {
      const expiredRequestId = 'request-expired';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${expiredRequestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(410);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'REQUEST_EXPIRED',
          message: expect.stringContaining('Request has expired')
        }
      });
    });
  });

  describe('Error Cases', () => {
    it('should return 404 for non-existent request', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const responseData = {
        action: 'accept'
      };

      const response = await request(app)
        .post(`/api/connection-requests/${nonExistentId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CONNECTION_REQUEST_NOT_FOUND',
          message: expect.stringContaining('Connection request not found')
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 300ms (P95)', async () => {
      const responseData = {
        action: 'accept'
      };
      const startTime = Date.now();

      await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Idempotency', () => {
    it('should return same result on duplicate accept', async () => {
      const responseData = {
        action: 'accept'
      };

      // First accept
      const response1 = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(200);

      // Duplicate accept (idempotent)
      const response2 = await request(app)
        .post(`/api/connection-requests/${requestId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData)
        .expect(409);

      expect(response2.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });
});
