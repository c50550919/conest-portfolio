/**
 * Contract Test: GET /api/connection-requests
 *
 * Test Scope:
 * - Retrieve sent and received connection requests
 * - Filter by status (pending, accepted, rejected)
 * - Pagination and sorting
 * - Performance requirements (<200ms P95)
 *
 * Technology: Jest + Supertest
 * Pattern: OAuth contract test pattern (arrange-act-assert)
 */

import request from 'supertest';
import app from '../app';

describe('Contract: GET /api/connection-requests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(() => {
    // Mock authentication
    authToken = 'mock-jwt-token';
    userId = '64c31337-4e0f-4a41-b537-db546f26ffee';
  });

  describe('Success Cases', () => {
    it('should retrieve all connection requests (sent + received)', async () => {
      const response = await request(app)
        .get('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          sent: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              senderId: userId,
              receiverId: expect.any(String),
              status: expect.stringMatching(/pending|accepted|rejected/),
              message: expect.any(String),
              createdAt: expect.any(String)
            })
          ]),
          received: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              senderId: expect.any(String),
              receiverId: userId,
              status: expect.stringMatching(/pending|accepted|rejected/),
              message: expect.any(String),
              createdAt: expect.any(String)
            })
          ])
        }
      });
    });

    it('should filter by status=pending', async () => {
      const response = await request(app)
        .get('/api/connection-requests?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.sent).toSatisfy((sent: any[]) =>
        sent.every((req) => req.status === 'pending')
      );
      expect(response.body.data.received).toSatisfy((received: any[]) =>
        received.every((req) => req.status === 'pending')
      );
    });

    it('should filter by status=accepted', async () => {
      const response = await request(app)
        .get('/api/connection-requests?status=accepted')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.sent).toSatisfy((sent: any[]) =>
        sent.every((req) => req.status === 'accepted')
      );
      expect(response.body.data.received).toSatisfy((received: any[]) =>
        received.every((req) => req.status === 'accepted')
      );
    });

    it('should filter by type=sent', async () => {
      const response = await request(app)
        .get('/api/connection-requests?type=sent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        sent: expect.any(Array),
        received: []
      });

      expect(response.body.data.sent).toSatisfy((sent: any[]) =>
        sent.every((req) => req.senderId === userId)
      );
    });

    it('should filter by type=received', async () => {
      const response = await request(app)
        .get('/api/connection-requests?type=received')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        sent: [],
        received: expect.any(Array)
      });

      expect(response.body.data.received).toSatisfy((received: any[]) =>
        received.every((req) => req.receiverId === userId)
      );
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/connection-requests?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          sent: expect.any(Array),
          received: expect.any(Array)
        },
        pagination: {
          limit: 5,
          offset: 0,
          total: expect.any(Number)
        }
      });

      expect(response.body.data.sent.length + response.body.data.received.length).toBeLessThanOrEqual(5);
    });

    it('should sort by createdAt descending (newest first)', async () => {
      const response = await request(app)
        .get('/api/connection-requests?sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const allRequests = [
        ...response.body.data.sent,
        ...response.body.data.received
      ];

      const dates = allRequests.map((req) => new Date(req.createdAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);

      expect(dates).toEqual(sortedDates);
    });

    it('should return empty arrays when no connection requests exist', async () => {
      const newUserToken = 'mock-jwt-token-new-user';

      const response = await request(app)
        .get('/api/connection-requests')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          sent: [],
          received: []
        }
      });
    });
  });

  describe('Authorization Cases', () => {
    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .get('/api/connection-requests')
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

  describe('Validation Cases', () => {
    it('should reject invalid status filter value', async () => {
      const response = await request(app)
        .get('/api/connection-requests?status=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('status'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'status',
              message: expect.stringContaining('pending, accepted, rejected')
            })
          ])
        }
      });
    });

    it('should reject invalid type filter value', async () => {
      const response = await request(app)
        .get('/api/connection-requests?type=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('type'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'type',
              message: expect.stringContaining('sent, received')
            })
          ])
        }
      });
    });

    it('should reject negative limit value', async () => {
      const response = await request(app)
        .get('/api/connection-requests?limit=-5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('limit'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'limit',
              message: expect.stringContaining('positive integer')
            })
          ])
        }
      });
    });

    it('should reject limit exceeding maximum (100)', async () => {
      const response = await request(app)
        .get('/api/connection-requests?limit=150')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('limit'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'limit',
              message: expect.stringContaining('maximum 100')
            })
          ])
        }
      });
    });

    it('should reject negative offset value', async () => {
      const response = await request(app)
        .get('/api/connection-requests?offset=-5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('offset'),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'offset',
              message: expect.stringContaining('non-negative')
            })
          ])
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 200ms (P95)', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });
  });

  describe('Child Safety Compliance', () => {
    it('should not expose child PII in connection request messages', async () => {
      const response = await request(app)
        .get('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const allRequests = [
        ...response.body.data.sent,
        ...response.body.data.received
      ];

      allRequests.forEach((req) => {
        // No child names, ages, schools
        expect(req.message).not.toMatch(/\b(child|kid|son|daughter)\s+(name|age|school)/i);
        expect(req).not.toHaveProperty('childNames');
        expect(req).not.toHaveProperty('childAges');
        expect(req).not.toHaveProperty('childSchools');
      });
    });
  });
});
