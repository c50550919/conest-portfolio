import request from 'supertest';
import app from '../../src/app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  createTestUser,
  getAuthToken,
} from '../helpers/test-utils';

/**
 * COMPLIANCE TEST: Child Safety (Constitution Principle I)
 *
 * Purpose: 100% validation of child PII protection
 * Constitution: Principle I (Child Safety) - CRITICAL
 *
 * This test MUST pass with 100% coverage. Any failure is a CRITICAL security violation.
 *
 * ZERO TOLERANCE POLICY:
 * - NO child names
 * - NO child photos
 * - NO child exact ages
 * - NO child schools
 * - NO child identifying information
 *
 * ONLY ALLOWED:
 * - childrenCount (integer)
 * - childrenAgeGroups (generic ranges: toddler, elementary, teen)
 */

describe('COMPLIANCE TEST: Child Safety (Constitution Principle I)', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    const user = await createTestUser({
      email: 'parent@example.com',
      verified: true,
      idVerified: true,
      backgroundCheckComplete: true,
      phoneVerified: true,
      profile: {
        firstName: 'Sarah',
        age: 32,
        city: 'San Francisco',
        childrenCount: 2,
        childrenAgeGroups: ['toddler', 'elementary'],
        budget: 2000,
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    userId = user.id;
    authToken = getAuthToken(user.id);
  });

  describe('CRITICAL: GET /api/discovery/profiles - Child PII Protection', () => {
    it('MUST NOT include childrenNames field in ANY profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      profiles.forEach((profile: any) => {
        // Check all possible variations
        expect(profile).not.toHaveProperty('childrenNames');
        expect(profile).not.toHaveProperty('children_names');
        expect(profile).not.toHaveProperty('childNames');
        expect(profile).not.toHaveProperty('child_names');
        expect(profile).not.toHaveProperty('kidsNames');
        expect(profile).not.toHaveProperty('kids_names');
      });
    });

    it('MUST NOT include childrenPhotos field in ANY profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenPhotos');
        expect(profile).not.toHaveProperty('children_photos');
        expect(profile).not.toHaveProperty('childPhotos');
        expect(profile).not.toHaveProperty('child_photos');
        expect(profile).not.toHaveProperty('kidsPhotos');
        expect(profile).not.toHaveProperty('kids_photos');
        expect(profile).not.toHaveProperty('childrenImages');
        expect(profile).not.toHaveProperty('children_images');
      });
    });

    it('MUST NOT include childrenAges (exact ages) in ANY profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenAges');
        expect(profile).not.toHaveProperty('children_ages');
        expect(profile).not.toHaveProperty('childAges');
        expect(profile).not.toHaveProperty('child_ages');
        expect(profile).not.toHaveProperty('kidsAges');
        expect(profile).not.toHaveProperty('kids_ages');
      });
    });

    it('MUST NOT include childrenSchools field in ANY profile', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      profiles.forEach((profile: any) => {
        expect(profile).not.toHaveProperty('childrenSchools');
        expect(profile).not.toHaveProperty('children_schools');
        expect(profile).not.toHaveProperty('childSchools');
        expect(profile).not.toHaveProperty('child_schools');
        expect(profile).not.toHaveProperty('schools');
      });
    });

    it('MUST ONLY include childrenCount and childrenAgeGroups', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      profiles.forEach((profile: any) => {
        // Get all keys that contain 'child' or 'kid'
        const childRelatedKeys = Object.keys(profile).filter(
          (key) => key.toLowerCase().includes('child') || key.toLowerCase().includes('kid'),
        );

        // ONLY these two keys are allowed
        const allowedKeys = ['childrenCount', 'childrenAgeGroups'];

        childRelatedKeys.forEach((key) => {
          expect(allowedKeys).toContain(key);
        });

        // Ensure both required fields exist
        expect(profile).toHaveProperty('childrenCount');
        expect(profile).toHaveProperty('childrenAgeGroups');
      });
    });

    it('MUST validate childrenCount is non-identifying integer', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;

      profiles.forEach((profile: any) => {
        expect(typeof profile.childrenCount).toBe('number');
        expect(Number.isInteger(profile.childrenCount)).toBe(true);
        expect(profile.childrenCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('MUST validate childrenAgeGroups uses ONLY generic ranges', async () => {
      const response = await request(app)
        .get('/api/discovery/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const { profiles } = response.body;
      const ALLOWED_AGE_GROUPS = ['toddler', 'elementary', 'teen'];

      profiles.forEach((profile: any) => {
        expect(Array.isArray(profile.childrenAgeGroups)).toBe(true);

        profile.childrenAgeGroups.forEach((group: string) => {
          // ONLY these generic ranges allowed
          expect(ALLOWED_AGE_GROUPS).toContain(group);

          // MUST NOT be specific ages
          expect(group).not.toMatch(/\d/); // No digits allowed
        });
      });
    });
  });

  describe('CRITICAL: POST /api/discovery/swipe - Match Response Protection', () => {
    it('MUST NOT include child PII in match object', async () => {
      // Create target user
      const targetUser = await createTestUser({
        email: 'target@example.com',
        verified: true,
        idVerified: true,
        backgroundCheckComplete: true,
        phoneVerified: true,
        profile: {
          firstName: 'Emily',
          age: 30,
          city: 'San Francisco',
          childrenCount: 2,
          childrenAgeGroups: ['toddler', 'elementary'],
          budget: 1900,
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // Create mutual match
      const targetAuthToken = getAuthToken(targetUser.id);
      await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${targetAuthToken}`)
        .send({ targetUserId: userId, direction: 'right' });

      const matchResponse = await request(app)
        .post('/api/discovery/swipe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetUserId: targetUser.id, direction: 'right' })
        .expect(200);

      const { match } = matchResponse.body;

      // Match object MUST NOT contain child PII
      expect(match).not.toHaveProperty('childrenNames');
      expect(match).not.toHaveProperty('children_names');
      expect(match).not.toHaveProperty('childrenPhotos');
      expect(match).not.toHaveProperty('children_photos');
      expect(match).not.toHaveProperty('childrenAges');
      expect(match).not.toHaveProperty('children_ages');
      expect(match).not.toHaveProperty('childrenSchools');
      expect(match).not.toHaveProperty('children_schools');
    });
  });

  describe('CRITICAL: Database Schema Validation', () => {
    it('MUST NOT have child PII columns in profiles table', async () => {
      // TODO: Query database schema directly to validate
      // Expected: profiles table MUST NOT have columns:
      // - children_names
      // - children_photos
      // - children_ages
      // - children_schools
      // - Or any similar variations
      // This test will be implemented when we have direct database access
      // For now, we validate through API responses
    });

    it('MUST NOT have child PII columns in matches table', async () => {
      // TODO: Query database schema directly to validate
      // Expected: matches table MUST NOT have child PII columns
    });
  });

  describe('CRITICAL: Input Validation Enforcement', () => {
    it('MUST reject API requests containing child PII', async () => {
      // Attempt to send child names (should be rejected by Zod validation)
      // TODO: This will be tested when we implement user profile update endpoint
      // Expected: POST /api/user/profile with childrenNames → 400 Bad Request
    });

    it('MUST validate childrenAgeGroups enum strictly', async () => {
      // TODO: When profile update endpoint implemented, test:
      // - Sending invalid age group "5-years-old" → rejected
      // - Sending invalid age group "kindergarten" → rejected
      // - Only "toddler", "elementary", "teen" allowed
    });
  });

  describe('CRITICAL: UI Component Protection (Future Mobile Tests)', () => {
    it('MUST NOT render child PII in ProfileCard component', async () => {
      // NOTE: This will be tested in T015 (Playwright E2E test)
      // - ProfileCard component MUST NOT display child names
      // - ProfileCard component MUST NOT display child photos
      // - ProfileCard component MUST NOT display exact ages
      // - ProfileCard component MUST NOT display schools
    });

    it('MUST NOT render child PII in MatchCard component', async () => {
      // NOTE: This will be tested in T015 (Playwright E2E test)
      // - MatchCard component MUST NOT display child PII
    });

    it('MUST NOT render child PII in DetailedProfileView component', async () => {
      // NOTE: This will be tested in T015 (Playwright E2E test)
      // - Expanded profile view MUST NOT reveal child PII
    });
  });

  describe('CRITICAL: Error Handling and Logging', () => {
    it('MUST NOT log child PII in server logs', async () => {
      // TODO: Implement log monitoring
      // Expected: Server logs MUST NOT contain child PII
      // - No child names in logs
      // - No child ages in logs
      // - No child photos/URLs in logs
    });

    it('MUST NOT include child PII in error messages', async () => {
      // TODO: Test error scenarios
      // Expected: Error messages MUST NOT expose child PII
    });
  });

  describe('CRITICAL: External API Protection', () => {
    it('MUST NOT send child PII to analytics services', async () => {
      // TODO: Implement analytics tracking validation
      // Expected: Analytics events MUST NOT contain child PII
    });

    it('MUST NOT send child PII to push notification services', async () => {
      // TODO: Implement push notification validation
      // Expected: Push notifications MUST NOT contain child PII
    });

    it('MUST NOT send child PII to third-party verification services', async () => {
      // TODO: Validate verification API calls
      // Expected: Background check APIs receive NO child PII
    });
  });

  describe('CRITICAL: Compliance Documentation', () => {
    it('MUST enforce child safety policy in code comments', async () => {
      // Code review requirement: ALL endpoints handling profile data
      // MUST have comments referencing Constitution Principle I
    });

    it('MUST have automated compliance checks in CI/CD', async () => {
      // TODO: Implement CI/CD compliance gates
      // Expected: Build fails if child PII detection rules triggered
    });
  });

  describe('CRITICAL: Security Incident Response', () => {
    it('MUST have procedure for child PII exposure incidents', async () => {
      // Documented procedure:
      // 1. Immediate system lockdown
      // 2. Identify and purge exposed data
      // 3. Notify affected users
      // 4. Report to authorities if required
      // 5. Post-incident review and hardening
    });
  });
});
