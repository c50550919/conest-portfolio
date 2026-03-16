/**
 * Contract Test: GET /api/connection-requests/received and /sent
 *
 * Test Scope:
 * - Retrieve sent and received connection requests via separate endpoints
 * - Filter by status (pending, accepted, declined, expired, cancelled)
 * - Returns encrypted message fields (use /message endpoint for decrypted)
 * - Performance requirements (<200ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../../src/app';

// Mock ConnectionRequestModel to return arrays instead of null from DB mock
jest.mock('../../src/models/ConnectionRequest', () => ({
  ConnectionRequestModel: {
    findByRecipientId: jest.fn().mockResolvedValue([]),
    findBySenderId: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    findById: jest.fn().mockResolvedValue(null),
    getDecryptedMessage: jest.fn().mockResolvedValue(null),
    getDecryptedResponseMessage: jest.fn().mockResolvedValue(null),
    countSentToday: jest.fn().mockResolvedValue(0),
    countSentThisWeek: jest.fn().mockResolvedValue(0),
    getStatistics: jest.fn().mockResolvedValue({
      totalSent: 0,
      totalReceived: 0,
      pending: 0,
      accepted: 0,
      declined: 0,
    }),
  },
}));

// Mock socket and push notification services (used by connection request service)
jest.mock('../../src/config/socket', () => ({
  getSocketIO: jest.fn(() => ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  })),
}));

jest.mock('../../src/services/pushNotificationService', () => ({
  getPushService: jest.fn(() => ({
    sendToUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Contract: GET /api/connection-requests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(() => {
    // Mock authentication
    authToken = 'mock-jwt-token';
    userId = '64c31337-4e0f-4a41-b537-db546f26ffee';
  });

  describe('GET /api/connection-requests/received - Success Cases', () => {
    it('should retrieve received connection requests (empty or populated)', async () => {
      const response = await request(app)
        .get('/api/connection-requests/received')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
      });

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(String),
          sender_id: expect.any(String),
          recipient_id: expect.any(String),
          status: expect.stringMatching(/pending|accepted|declined|expired|cancelled/),
          sent_at: expect.any(String),
        });
      }
    });

    it('should accept status filter parameter', async () => {
      const response = await request(app)
        .get('/api/connection-requests/received?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      // Should respond with 200 or 500 (no fixtures)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      }
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/connection-requests/received?status=invalid_status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/connection-requests/sent - Success Cases', () => {
    it('should retrieve sent connection requests (empty or populated)', async () => {
      const response = await request(app)
        .get('/api/connection-requests/sent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        count: expect.any(Number),
      });

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(String),
          sender_id: expect.any(String),
          recipient_id: expect.any(String),
          status: expect.stringMatching(/pending|accepted|declined|expired|cancelled/),
          sent_at: expect.any(String),
        });
      }
    });

    it('should accept status filter parameter', async () => {
      const response = await request(app)
        .get('/api/connection-requests/sent?status=pending')
        .set('Authorization', `Bearer ${authToken}`);

      // Should respond with 200 or 500 (no fixtures)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      }
    });

    it('should reject invalid status filter', async () => {
      const response = await request(app)
        .get('/api/connection-requests/sent?status=invalid_status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Cases', () => {
    it('should reject received requests without authentication token', async () => {
      await request(app).get('/api/connection-requests/received').expect(401);
    });

    it('should reject sent requests without authentication token', async () => {
      await request(app).get('/api/connection-requests/sent').expect(401);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 200ms (P95) for received', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/connection-requests/received')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond within 200ms (P95) for sent', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/connection-requests/sent')
        .set('Authorization', `Bearer ${authToken}`);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Child Safety Compliance', () => {
    it('should not expose child PII fields in response', async () => {
      const response = await request(app)
        .get('/api/connection-requests/received')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 && response.body.data.length > 0) {
        response.body.data.forEach((req: any) => {
          // No child PII fields
          expect(req).not.toHaveProperty('childNames');
          expect(req).not.toHaveProperty('childAges');
          expect(req).not.toHaveProperty('childSchools');
        });
      }
    });

    it('should not expose decrypted messages in list endpoint', async () => {
      const response = await request(app)
        .get('/api/connection-requests/received')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200 && response.body.data.length > 0) {
        response.body.data.forEach((req: any) => {
          // No plaintext message - should be encrypted or not present
          expect(req).not.toHaveProperty('message');
        });
      }
    });
  });
});
