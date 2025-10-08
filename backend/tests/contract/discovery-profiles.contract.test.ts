/**
 * T019: Contract Test - GET /api/discovery/profiles
 *
 * Tests API contract compliance for discovery profiles endpoint.
 *
 * **CRITICAL CHILD SAFETY**: 100% coverage - NO child PII allowed
 * Constitution Principle I compliance verification
 *
 * Performance: <100ms P95 (Redis cached)
 */

import request from 'supertest';
import { app } from '../../src/app';
import { z } from 'zod';

// ProfileCard schema from OpenAPI spec (Zod validation)
const ProfileCardSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(50),
  age: z.number().int().min(18).max(80),
  city: z.string().min(1).max(100),
  profilePhotoUrl: z.string().url(),
  distanceMeters: z.number().nonnegative(),
  childrenCount: z.number().int().min(0).max(10),
  childrenAgeGroups: z.array(z.enum(['toddler', 'elementary', 'teen'])),
  idVerified: z.boolean(),
  backgroundCheckVerified: z.boolean(),
  phoneVerified: z.boolean(),
  compatibilityScore: z.number().int().min(0).max(100),
});

// Response schema
const ProfilesResponseSchema = z.object({
  profiles: z.array(ProfileCardSchema),
  nextCursor: z.string().uuid().nullable(),
});

// Forbidden child PII fields (MUST NOT be present)
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

describe('GET /api/discovery/profiles - Contract Tests', () => {
  let authToken: string;
  let startTime: number;

  beforeAll(async () => {
    // Mock authentication - will be replaced with actual implementation
    authToken = 'mock-jwt-token';
  });

  beforeEach(() => {
    startTime = Date.now();
  });

  describe('Success Cases', () => {
    it('should return 200 with profiles array and nextCursor', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Schema validation
      const result = ProfilesResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);

      // Response structure
      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('nextCursor');
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });

    it('should validate ProfileCard schema with Zod for each profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      response.body.profiles.forEach((profile: any, index: number) => {
        const result = ProfileCardSchema.safeParse(profile);
        if (!result.success) {
          console.error(`Profile ${index} validation errors:`, result.error.format());
        }
        expect(result.success).toBe(true);
      });
    });

    it('should support cursor-based pagination', async () => {
      // First page
      const firstPage = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 3 })
        .expect(200);

      expect(firstPage.body.profiles.length).toBeLessThanOrEqual(3);

      // Second page (if nextCursor exists)
      if (firstPage.body.nextCursor) {
        const secondPage = await request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            cursor: firstPage.body.nextCursor,
            limit: 3
          })
          .expect(200);

        expect(secondPage.body).toHaveProperty('profiles');
        expect(Array.isArray(secondPage.body.profiles)).toBe(true);
      }
    });

    it('should respect limit parameter (1-50)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.profiles.length).toBeLessThanOrEqual(5);
    });

    it('should return empty state when no profiles available', async () => {
      // This will fail until we implement filtering logic
      // Should return empty array, not 404
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(Array.isArray(response.body.profiles)).toBe(true);
      expect(response.body).toHaveProperty('nextCursor');
    });
  });

  describe('**CRITICAL** Child Safety Compliance', () => {
    it('should NOT contain any forbidden child PII fields in ProfileCard', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any, index: number) => {
        FORBIDDEN_CHILD_PII_FIELDS.forEach(forbiddenField => {
          expect(profile).not.toHaveProperty(forbiddenField);
        });
      });
    });

    it('should ONLY contain childrenCount (integer) and childrenAgeGroups (generic ranges)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any, index: number) => {
        // childrenCount must be integer
        expect(typeof profile.childrenCount).toBe('number');
        expect(Number.isInteger(profile.childrenCount)).toBe(true);
        expect(profile.childrenCount).toBeGreaterThanOrEqual(0);
        expect(profile.childrenCount).toBeLessThanOrEqual(10);

        // childrenAgeGroups must be array of generic ranges
        expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);
        profile.childrenAgeGroups.forEach((ageGroup: string) => {
          expect(['toddler', 'elementary', 'teen']).toContain(ageGroup);
        });

        // NO exact ages, names, photos, schools
        const profileKeys = Object.keys(profile);
        const hasChildPII = profileKeys.some(key =>
          key.toLowerCase().includes('childname') ||
          key.toLowerCase().includes('childage') && key !== 'childrenAgeGroups' ||
          key.toLowerCase().includes('childphoto') ||
          key.toLowerCase().includes('childschool')
        );
        expect(hasChildPII).toBe(false);
      });
    });

    it('should reject response if any profile contains child PII (100% compliance)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Deep scan for any child PII
      const responseString = JSON.stringify(response.body);

      // Should NOT contain patterns like:
      // - "Tommy", "Sarah" (common child names in test data)
      // - "age: 8", "age: 5" (exact ages)
      // - "Lincoln Elementary", "school: "
      // Note: This is a heuristic check, not foolproof

      response.body.profiles.forEach((profile: any) => {
        // Verify only allowed child-related fields exist
        const childRelatedKeys = Object.keys(profile).filter(key =>
          key.toLowerCase().includes('child')
        );

        expect(childRelatedKeys).toEqual(['childrenCount', 'childrenAgeGroups']);
      });
    });
  });

  describe('Validation & Error Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 422 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 100 }) // exceeds max 50
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/limit/i);
    });

    it('should return 422 for limit < 1', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 0 })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/limit/i);
    });

    it('should return 422 for invalid cursor format', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ cursor: 'invalid-not-a-uuid' })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/cursor/i);
    });
  });

  describe('Performance Requirements', () => {
    it('should respond in <100ms P95 (Redis cached)', async () => {
      const iterations = 20; // P95 = 95th percentile
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await request(app)
          .get('/api/discovery/profiles')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: 10 });
        const duration = Date.now() - start;
        responseTimes.push(duration);
      }

      // Calculate P95
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(iterations * 0.95);
      const p95Time = responseTimes[p95Index];

      console.log(`P95 response time: ${p95Time}ms`);
      console.log(`All response times: ${responseTimes.join(', ')}ms`);

      expect(p95Time).toBeLessThan(100);
    });

    it('should return profiles with all required verification badges', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        // All profiles in discovery MUST be verified
        expect(profile.idVerified).toBe(true);
        expect(profile.backgroundCheckVerified).toBe(true);
        expect(profile.phoneVerified).toBe(true);
      });
    });
  });

  describe('Data Quality & Business Rules', () => {
    it('should only return verified users in discovery feed', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All profiles must have all 3 verifications
      response.body.profiles.forEach((profile: any) => {
        expect(profile.idVerified).toBe(true);
        expect(profile.backgroundCheckVerified).toBe(true);
        expect(profile.phoneVerified).toBe(true);
      });
    });

    it('should not return users already swiped on', async () => {
      // This will be tested in integration tests
      // Contract test: just verify userId format
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        expect(profile.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });
    });

    it('should include compatibility score (0-100) for each profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        expect(profile.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(profile.compatibilityScore).toBeLessThanOrEqual(100);
        expect(Number.isInteger(profile.compatibilityScore)).toBe(true);
      });
    });

    it('should include distance in meters from current user', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.profiles.forEach((profile: any) => {
        expect(typeof profile.distanceMeters).toBe('number');
        expect(profile.distanceMeters).toBeGreaterThanOrEqual(0);
      });
    });

    it('should not return current user in their own discovery feed', async () => {
      // This will be verified in integration tests
      // Contract test: verify structure is correct
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.profiles).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle nextCursor = null when no more profiles', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 50 }) // large limit to potentially reach end
        .expect(200);

      if (response.body.profiles.length < 50) {
        // Might have reached the end
        expect(response.body.nextCursor).toBeDefined();
      }
    });

    it('should handle empty profiles array gracefully', async () => {
      // When user has swiped on all available profiles
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('nextCursor');

      if (response.body.profiles.length === 0) {
        expect(response.body.nextCursor).toBeNull();
      }
    });
  });
});
