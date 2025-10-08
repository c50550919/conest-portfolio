/**
 * T029: Contract Test - GET /api/household/:id/members
 *
 * Tests API contract compliance for fetching household members.
 *
 * **CRITICAL CHILD SAFETY**: NO child PII in member profiles
 * Constitution Principle I compliance verification
 *
 * Security: Only household members can access member list
 */

import request from 'supertest';
import { app } from '../../src/app';
import { z } from 'zod';

// HouseholdMember schema from API spec (Zod validation)
const HouseholdMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(50),
  profilePhotoUrl: z.string().url().optional(),
  role: z.enum(['admin', 'member']),
  rentShare: z.number().int().positive(), // Amount in cents
  joinedAt: z.string().datetime(),
  status: z.enum(['active', 'inactive']),
});

// Response schema
const HouseholdMembersResponseSchema = z.object({
  members: z.array(HouseholdMemberSchema),
});

// Forbidden child PII fields (MUST NOT be present in member profiles)
const FORBIDDEN_CHILD_PII_FIELDS = [
  'childrenNames',
  'childrenPhotos',
  'childrenAges',
  'childrenSchools',
  'childrenGenders',
  'childrenBirthdays',
  'childName',
  'childPhoto',
  'childAge',
  'childSchool',
];

describe('GET /api/household/:id/members - Contract Tests', () => {
  let authToken: string;
  let householdId: string;
  let nonMemberToken: string;

  beforeAll(async () => {
    // Mock authentication tokens
    authToken = 'mock-jwt-token-household-member';
    nonMemberToken = 'mock-jwt-token-non-member';
    householdId = 'household-123';
  });

  describe('Success Cases', () => {
    it('should return 200 with members array for household member', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Schema validation
      const result = HouseholdMembersResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);

      // Response structure
      expect(response.body).toHaveProperty('members');
      expect(Array.isArray(response.body.members)).toBe(true);
    });

    it('should validate HouseholdMember schema with Zod for each member', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.members.forEach((member: any, index: number) => {
        const result = HouseholdMemberSchema.safeParse(member);
        if (!result.success) {
          console.error(`Member ${index} validation errors:`, result.error.format());
        }
        expect(result.success).toBe(true);
      });
    });

    it('should include required member fields', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.members.length).toBeGreaterThan(0);

      response.body.members.forEach((member: any) => {
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('userId');
        expect(member).toHaveProperty('firstName');
        expect(member).toHaveProperty('role');
        expect(member).toHaveProperty('rentShare');
        expect(member).toHaveProperty('joinedAt');
        expect(member).toHaveProperty('status');

        // Validate role
        expect(['admin', 'member']).toContain(member.role);

        // Validate status
        expect(['active', 'inactive']).toContain(member.status);

        // Validate rentShare is positive integer in cents
        expect(typeof member.rentShare).toBe('number');
        expect(Number.isInteger(member.rentShare)).toBe(true);
        expect(member.rentShare).toBeGreaterThan(0);
      });
    });

    it('should only return active members by default', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.members.forEach((member: any) => {
        expect(member.status).toBe('active');
      });
    });
  });

  describe('**CRITICAL** Child Safety Compliance', () => {
    it('should NOT contain any forbidden child PII fields in member profiles', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.members.forEach((member: any, index: number) => {
        FORBIDDEN_CHILD_PII_FIELDS.forEach(forbiddenField => {
          expect(member).not.toHaveProperty(forbiddenField);
        });
      });
    });

    it('should NOT expose child-related information in member objects', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.members.forEach((member: any) => {
        const memberKeys = Object.keys(member);
        const hasChildPII = memberKeys.some(key =>
          key.toLowerCase().includes('childname') ||
          key.toLowerCase().includes('childphoto') ||
          key.toLowerCase().includes('childschool')
        );
        expect(hasChildPII).toBe(false);
      });
    });

    it('should reject response if any member contains child PII (100% compliance)', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Deep scan for any child PII
      const responseString = JSON.stringify(response.body);

      // Verify no child-related keys beyond what's explicitly allowed (NONE)
      response.body.members.forEach((member: any) => {
        const childRelatedKeys = Object.keys(member).filter(key =>
          key.toLowerCase().includes('child')
        );
        expect(childRelatedKeys).toEqual([]);
      });
    });
  });

  describe('Authorization & Error Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 403 if user is not a household member', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not authorized|not a member/i);
    });

    it('should return 404 for non-existent household', async () => {
      const response = await request(app)
        .get('/api/household/non-existent-uuid/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should return 422 for invalid household UUID format', async () => {
      const response = await request(app)
        .get('/api/household/invalid-uuid/members')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Data Quality & Business Rules', () => {
    it('should include at least one admin member in household', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const adminMembers = response.body.members.filter(
        (member: any) => member.role === 'admin'
      );
      expect(adminMembers.length).toBeGreaterThanOrEqual(1);
    });

    it('should have valid UUID format for member IDs', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      response.body.members.forEach((member: any) => {
        expect(member.id).toMatch(uuidRegex);
        expect(member.userId).toMatch(uuidRegex);
      });
    });

    it('should have joinedAt timestamp in ISO 8601 format', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.members.forEach((member: any) => {
        expect(() => new Date(member.joinedAt).toISOString()).not.toThrow();
        expect(new Date(member.joinedAt).toISOString()).toBe(member.joinedAt);
      });
    });

    it('should not expose sensitive user data (password, tokens)', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('password');
      expect(responseString).not.toContain('password_hash');
      expect(responseString).not.toContain('refresh_token');
      expect(responseString).not.toContain('accessToken');
    });
  });

  describe('Edge Cases', () => {
    it('should handle household with single member', async () => {
      // Household with only creator/admin
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.members.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty profilePhotoUrl gracefully', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // profilePhotoUrl is optional
      response.body.members.forEach((member: any) => {
        if (member.profilePhotoUrl) {
          expect(member.profilePhotoUrl).toMatch(/^https?:\/\/.+/);
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond in <200ms for typical household (2-4 members)', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Response time: ${duration}ms`);
      expect(duration).toBeLessThan(200);
    });
  });
});
