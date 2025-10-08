/**
 * T031: Contract Test - POST /api/household/:id/members
 *
 * Tests API contract compliance for adding members to household.
 *
 * Security: Only household admins can add new members
 * Business Rule: User cannot be added twice to same household
 */

import request from 'supertest';
import { app } from '../../src/app';
import { z } from 'zod';

// AddMember request schema
const AddMemberRequestSchema = z.object({
  userId: z.string().uuid(),
  rentShare: z.number().int().positive(), // Amount in cents
  role: z.enum(['admin', 'member']).optional(),
});

// AddMember response schema
const AddMemberResponseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member']),
  rentShare: z.number().int().positive(),
  joinedAt: z.string().datetime(),
  status: z.enum(['active', 'inactive']),
});

describe('POST /api/household/:id/members - Contract Tests', () => {
  let adminToken: string;
  let memberToken: string;
  let nonMemberToken: string;
  let householdId: string;
  let newUserId: string;

  beforeAll(async () => {
    // Mock authentication tokens
    adminToken = 'mock-jwt-token-household-admin';
    memberToken = 'mock-jwt-token-household-member';
    nonMemberToken = 'mock-jwt-token-non-member';
    householdId = 'household-123';
    newUserId = 'new-user-456';
  });

  describe('Success Cases', () => {
    it('should return 201 when admin adds new member successfully', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000, // $500.00 in cents
          role: 'member',
        })
        .expect(201);

      // Schema validation
      const result = AddMemberResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);
    });

    it('should return created member with all required fields', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('householdId', householdId);
      expect(response.body).toHaveProperty('userId', newUserId);
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('rentShare', 50000);
      expect(response.body).toHaveProperty('joinedAt');
      expect(response.body).toHaveProperty('status', 'active');

      // Validate UUID formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(response.body.id).toMatch(uuidRegex);
      expect(response.body.householdId).toMatch(uuidRegex);
      expect(response.body.userId).toMatch(uuidRegex);

      // Validate timestamp
      expect(() => new Date(response.body.joinedAt).toISOString()).not.toThrow();
    });

    it('should default role to "member" when not specified', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(201);

      expect(response.body.role).toBe('member');
    });

    it('should allow admin to add another admin', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
          role: 'admin',
        })
        .expect(201);

      expect(response.body.role).toBe('admin');
    });

    it('should set status to "active" for newly added member', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(201);

      expect(response.body.status).toBe('active');
    });
  });

  describe('Authorization & Permission Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 403 if user is not household admin', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not authorized|admin only|insufficient permissions/i);
    });

    it('should return 403 if user is not a household member', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Validation Error Cases', () => {
    it('should return 400 for missing userId', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rentShare: 50000,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/userId/i);
    });

    it('should return 400 for missing rentShare', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/rentShare/i);
    });

    it('should return 422 for invalid userId format', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'invalid-uuid',
          rentShare: 50000,
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/userId/i);
    });

    it('should return 422 for invalid household UUID format', async () => {
      const response = await request(app)
        .post('/api/household/invalid-uuid/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 422 for rentShare ≤ 0', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 0,
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/rentShare/i);
    });

    it('should return 422 for negative rentShare', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: -100,
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/rentShare/i);
    });

    it('should return 422 for non-integer rentShare', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 500.50, // Should be in cents (integer)
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/rentShare.*integer/i);
    });

    it('should return 422 for invalid role', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
          role: 'owner', // Invalid role
        })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/role/i);
    });
  });

  describe('Business Logic Error Cases', () => {
    it('should return 400 if user already exists in household', async () => {
      const existingUserId = 'existing-member-789';

      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: existingUserId,
          rentShare: 50000,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/already.*member|duplicate/i);
    });

    it('should return 404 for non-existent household', async () => {
      const response = await request(app)
        .post('/api/household/non-existent-uuid/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should return 404 if user to be added does not exist', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'non-existent-user-uuid',
          rentShare: 50000,
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/user.*not found/i);
    });

    it('should return 400 if adding user to inactive household', async () => {
      const inactiveHouseholdId = 'inactive-household-uuid';

      const response = await request(app)
        .post(`/api/household/${inactiveHouseholdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/inactive|not active/i);
    });
  });

  describe('Data Quality & Response Schema', () => {
    it('should return ISO 8601 joinedAt timestamp', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(201);

      expect(() => new Date(response.body.joinedAt).toISOString()).not.toThrow();
      expect(new Date(response.body.joinedAt).toISOString()).toBe(response.body.joinedAt);
    });

    it('should not expose sensitive user data in response', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(201);

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('password');
      expect(responseString).not.toContain('password_hash');
      expect(responseString).not.toContain('refresh_token');
      expect(responseString).not.toContain('accessToken');
    });

    it('should validate rentShare is in cents (integer)', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 75000, // $750.00 in cents
        })
        .expect(201);

      expect(typeof response.body.rentShare).toBe('number');
      expect(Number.isInteger(response.body.rentShare)).toBe(true);
      expect(response.body.rentShare).toBe(75000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large rentShare values (up to $999,999.99)', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 99999999, // $999,999.99
        })
        .expect(201);

      expect(response.body.rentShare).toBe(99999999);
    });

    it('should handle minimum rentShare value ($0.01)', async () => {
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 1, // $0.01
        })
        .expect(201);

      expect(response.body.rentShare).toBe(1);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond in <200ms when adding new member', async () => {
      const start = Date.now();
      await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: newUserId,
          rentShare: 50000,
        })
        .expect(201);
      const duration = Date.now() - start;

      console.log(`Response time: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Idempotency & Concurrency', () => {
    it('should prevent duplicate adds with same userId', async () => {
      const userId = 'duplicate-test-user';

      // First add should succeed
      await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          rentShare: 50000,
        })
        .expect(201);

      // Second add should fail
      const response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId,
          rentShare: 50000,
        })
        .expect(400);

      expect(response.body.error).toMatch(/already.*member|duplicate/i);
    });
  });
});
