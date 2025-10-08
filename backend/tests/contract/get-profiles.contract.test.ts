import request from 'supertest';
import app from '../../src/app';
import { setupTestDatabase, teardownTestDatabase, createTestUser, getAuthToken } from '../helpers/test-utils';

/**
 * Contract Test: GET /api/discovery/profiles
 *
 * Purpose: Validate API contract for profile discovery endpoint
 * Constitution: Principle I (Child Safety), Principle V (TDD)
 *
 * CRITICAL: This test MUST verify NO child PII in responses
 */

describe('Contract Test: GET /api/discovery/profiles', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Create verified test user
    const user = await createTestUser({
      email: 'test@example.com',
      verified: true,
      backgroundCheckComplete: true,
    });
    userId = user.id;
    authToken = getAuthToken(user.id);
  });

  describe('Authentication', () => {
    it('should return 401 without JWT token', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 401 with invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 200 with valid JWT token', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
    });
  });

  describe('Query Parameters', () => {
    it('should accept optional cursor parameter (UUID)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ cursor: '123e4567-e89b-12d3-a456-426614174000' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
    });

    it('should accept optional limit parameter (1-50)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
    });

    it('should reject limit > 50', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });

    it('should reject limit < 1', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid cursor format', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ cursor: 'not-a-uuid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('cursor');
    });
  });

  describe('Response Schema', () => {
    it('should return profiles array and nextCursor', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(Array.isArray(response.body.profiles)).toBe(true);
      expect(response.body).toHaveProperty('nextCursor');
    });

    it('should return nextCursor as UUID or null', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { nextCursor } = response.body;
      if (nextCursor !== null) {
        // UUID v4 regex
        expect(nextCursor).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      }
    });
  });

  describe('ProfileCard Schema Validation', () => {
    it('should include all required ProfileCard fields', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      if (profiles.length > 0) {
        const profile = profiles[0];

        // Required fields
        expect(profile).toHaveProperty('userId');
        expect(profile).toHaveProperty('firstName');
        expect(profile).toHaveProperty('age');
        expect(profile).toHaveProperty('city');
        expect(profile).toHaveProperty('childrenCount');
        expect(profile).toHaveProperty('childrenAgeGroups');
        expect(profile).toHaveProperty('compatibilityScore');
        expect(profile).toHaveProperty('verificationStatus');

        // Type validation
        expect(typeof profile.userId).toBe('string');
        expect(typeof profile.firstName).toBe('string');
        expect(typeof profile.age).toBe('number');
        expect(typeof profile.city).toBe('string');
        expect(typeof profile.childrenCount).toBe('number');
        expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);
        expect(typeof profile.compatibilityScore).toBe('number');
        expect(typeof profile.verificationStatus).toBe('object');
      }
    });

    it('should validate childrenCount is integer >= 0', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      if (profiles.length > 0) {
        const profile = profiles[0];
        expect(Number.isInteger(profile.childrenCount)).toBe(true);
        expect(profile.childrenCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should validate childrenAgeGroups contains only valid enums', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      const validAgeGroups = ['toddler', 'elementary', 'teen'];

      if (profiles.length > 0) {
        const profile = profiles[0];
        profile.childrenAgeGroups.forEach((group: string) => {
          expect(validAgeGroups).toContain(group);
        });
      }
    });

    it('should validate compatibilityScore is 0-100', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      if (profiles.length > 0) {
        const profile = profiles[0];
        expect(profile.compatibilityScore).toBeGreaterThanOrEqual(0);
        expect(profile.compatibilityScore).toBeLessThanOrEqual(100);
      }
    });

    it('should validate verificationStatus object structure', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      if (profiles.length > 0) {
        const { verificationStatus } = profiles[0];
        expect(verificationStatus).toHaveProperty('idVerified');
        expect(verificationStatus).toHaveProperty('backgroundCheckComplete');
        expect(verificationStatus).toHaveProperty('phoneVerified');
        expect(typeof verificationStatus.idVerified).toBe('boolean');
        expect(typeof verificationStatus.backgroundCheckComplete).toBe('boolean');
        expect(typeof verificationStatus.phoneVerified).toBe('boolean');
      }
    });
  });

  describe('CRITICAL: Child Safety Compliance (Constitution Principle I)', () => {
    it('should NEVER include childrenNames field', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenNames');
        expect(profile).not.toHaveProperty('children_names');
      });
    });

    it('should NEVER include childrenPhotos field', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenPhotos');
        expect(profile).not.toHaveProperty('children_photos');
      });
    });

    it('should NEVER include childrenAges field (exact ages)', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenAges');
        expect(profile).not.toHaveProperty('children_ages');
      });
    });

    it('should NEVER include childrenSchools field', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenSchools');
        expect(profile).not.toHaveProperty('children_schools');
      });
    });

    it('should ONLY include childrenCount and childrenAgeGroups', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      profiles.forEach((profile: any) => {
        // Get all keys that start with 'children'
        const childrenKeys = Object.keys(profile).filter(key =>
          key.toLowerCase().includes('child')
        );

        // Only childrenCount and childrenAgeGroups allowed
        const allowedKeys = ['childrenCount', 'childrenAgeGroups'];
        childrenKeys.forEach(key => {
          expect(allowedKeys).toContain(key);
        });
      });
    });
  });

  describe('Filtering: Only Verified Users', () => {
    it('should only return profiles with full verification', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      profiles.forEach((profile: any) => {
        expect(profile.verificationStatus.idVerified).toBe(true);
        expect(profile.verificationStatus.backgroundCheckComplete).toBe(true);
        expect(profile.verificationStatus.phoneVerified).toBe(true);
      });
    });
  });

  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const limit = 5;
      const response = await request(app)
        .get('/api/discovery/profiles')
        .query({ limit })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      expect(profiles.length).toBeLessThanOrEqual(limit);
    });

    it('should return empty array when no profiles available', async () => {
      // Assuming test user has no compatible profiles
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('profiles');
      expect(response.body).toHaveProperty('nextCursor');
      // Can be empty array if no matches
      expect(Array.isArray(response.body.profiles)).toBe(true);
    });
  });
});
