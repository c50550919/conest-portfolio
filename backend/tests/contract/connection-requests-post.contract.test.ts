/**
 * Contract Test: POST /api/connection-requests
 *
 * Test Scope:
 * - API contract validation (request/response formats)
 * - Authentication and authorization
 * - Input validation
 * - Error response formats
 *
 * Note: Tests that require specific database state (existing records, rate limits)
 * are skipped and should be covered in integration tests with proper fixtures.
 */

import request from 'supertest';
import app from '../../src/app';

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

  describe('Authorization Cases', () => {
    it('should reject request without authentication token', async () => {
      const requestData = {
        recipient_id: receiverId,
        message: 'Unauthorized request attempt',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .send(requestData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject request with invalid token', async () => {
      const requestData = {
        recipient_id: receiverId,
        message: 'Invalid token request',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', 'Bearer invalid-token')
        .send(requestData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Validation Cases', () => {
    it('should reject missing recipient_id', async () => {
      const requestData = {
        message: 'Request without receiver',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid UUID format for recipient_id', async () => {
      const requestData = {
        recipient_id: 'invalid-uuid',
        message: 'Request with invalid receiver ID',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject empty message', async () => {
      const requestData = {
        recipient_id: receiverId,
        message: '',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject message longer than 500 characters', async () => {
      const requestData = {
        recipient_id: receiverId,
        message: 'a'.repeat(501),
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject request to self', async () => {
      const requestData = {
        recipient_id: userId, // Same as sender
        message: 'Trying to connect with myself',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Cannot send connection request to yourself');
    });

    it('should reject missing message field', async () => {
      const requestData = {
        recipient_id: receiverId,
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Response Format', () => {
    it('should return error response format for validation errors', async () => {
      const requestData = {
        recipient_id: 'invalid',
        message: '',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('API Contract', () => {
    it('should accept valid request body schema', async () => {
      // This test verifies the API accepts the expected schema
      // Even if database operation fails, it should not return 400 for schema issues
      const validSchema = {
        recipient_id: '00000000-0000-0000-0000-000000000001',
        message: 'Valid message content',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validSchema);

      // Should not be 400 (validation error) - may be 500 (database) or 201/409 (success/conflict)
      expect([201, 409, 500]).toContain(response.status);
    });

    it('should have consistent error response structure', async () => {
      const invalidData = {
        recipient_id: '', // Invalid
        message: 'test',
      };

      const response = await request(app)
        .post('/api/connection-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      // All error responses should have consistent structure
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });

  // These tests require database state and are skipped for contract testing
  describe('Database-Dependent Cases (Integration)', () => {
    it.skip('should create connection request successfully', () => {
      // Requires: recipient user exists in database
    });

    it.skip('should reject duplicate pending request', () => {
      // Requires: existing pending request in database
    });

    it.skip('should enforce rate limits', () => {
      // Requires: rate limit tracking in database
    });

    it.skip('should check verification/payment status', () => {
      // Requires: subscription/verification records
    });
  });
});
