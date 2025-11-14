// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';

/**
 * T015: Integration Test - New User Google Signup Flow
 *
 * Test Scenario 1 from quickstart.md:
 * New user signs up with Google Sign In
 *
 * Purpose: End-to-end test validating the complete flow of a new user
 * signing up using Google OAuth for the first time
 *
 * Constitution Compliance:
 * - Principle III (Security): OAuth token verification, JWT generation
 * - Principle I (Child Safety): Ensures no child PII is collected during OAuth
 */

describe('T015: OAuth Google Signup - Integration Test', () => {
  const mockGoogleToken = 'mock_google_id_token_new_user';
  const mockGoogleProfile = {
    sub: '112233445566778899001', // Google user ID
    email: 'newparent@gmail.com',
    email_verified: true,
    given_name: 'Sarah',
    family_name: 'Johnson',
    picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
  };

  beforeEach(async () => {
    // Clean database before each test
    await db('parents').del();
    await db('users').del();

    // Mock Google OAuth verification
    // @ts-expect-error - Mocking Google OAuth2Client for testing
    // @ts-expect-error - Mocking Google OAuth2Client for testing
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => mockGoogleProfile,
    } as any);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Complete New User Signup Flow', () => {
    it('should create new user account and parent profile on first Google signin', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        success: true,
        isNew: true,
        linked: false,
      });

      // Validate user object
      expect(response.body.user).toMatchObject({
        id: expect.any(String),
        email: 'newparent@gmail.com',
        emailVerified: true,
        accountStatus: 'active',
      });

      // Validate OAuth fields
      expect(response.body.user.oauthProvider).toBe('google');
      expect(response.body.user.oauthProviderId).toBe('112233445566778899001');
      expect(response.body.user.oauthProfilePicture).toContain('googleusercontent.com');

      // Validate tokens
      expect(response.body.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900, // 15 minutes
      });

      // Verify database state - user created
      const dbUser = await db('users')
        .where({ email: 'newparent@gmail.com' })
        .first();

      expect(dbUser).toBeDefined();
      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe('112233445566778899001');
      expect(dbUser.password_hash).toBeNull(); // OAuth users have no password
      expect(dbUser.email_verified).toBe(true); // Google verifies emails

      // Verify database state - parent profile created
      const dbParent = await db('parents')
        .where({ user_id: dbUser.id })
        .first();

      expect(dbParent).toBeDefined();
      expect(dbParent.first_name).toBe('Sarah');
      expect(dbParent.last_name).toBe('Johnson');
    });

    it('should handle Google profiles without given_name gracefully', async () => {
      // Mock Google profile without name fields (edge case)
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: '998877665544332211',
          email: 'noname@gmail.com',
          email_verified: true,
          // No given_name or family_name
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('noname@gmail.com');

      // Verify parent profile created with empty names
      const dbUser = await db('users').where({ email: 'noname@gmail.com' }).first();
      const dbParent = await db('parents').where({ user_id: dbUser.id }).first();

      expect(dbParent.first_name).toBe('');
      expect(dbParent.last_name).toBe('');
    });
  });

  describe('Token Validation', () => {
    it('should return valid JWT access token that can be used for authenticated requests', async () => {
      const signupResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const { accessToken } = signupResponse.body.tokens;

      // Use access token for authenticated request (e.g., get profile)
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('user');
      expect(profileResponse.body.user.email).toBe('newparent@gmail.com');
    });

    it('should return valid refresh token that can be used to get new access token', async () => {
      const signupResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const { refreshToken } = signupResponse.body.tokens;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
    });
  });

  describe('Idempotency - Repeated Signin', () => {
    it('should return existing user on second Google signin (not create duplicate)', async () => {
      // First signin - creates account
      const firstResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(firstResponse.body.isNew).toBe(true);
      const firstUserId = firstResponse.body.user.id;

      // Second signin - returns existing account
      const secondResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(secondResponse.body.isNew).toBe(false);
      expect(secondResponse.body.user.id).toBe(firstUserId);
      expect(secondResponse.body.user.email).toBe('newparent@gmail.com');

      // Verify only ONE user exists in database
      const userCount = await db('users')
        .where({ email: 'newparent@gmail.com' })
        .count('* as count')
        .first();

      expect(userCount.count).toBe('1');
    });
  });

  describe('Child Safety Compliance', () => {
    it('should NOT collect or store any child PII during OAuth signup', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Verify response contains NO child data
      expect(response.body.user).not.toHaveProperty('childrenNames');
      expect(response.body.user).not.toHaveProperty('childrenPhotos');
      expect(response.body.user).not.toHaveProperty('childrenAges');
      expect(response.body.user).not.toHaveProperty('childrenSchools');

      // Verify database contains NO child PII
      const dbUser = await db('users')
        .where({ email: 'newparent@gmail.com' })
        .first();

      const dbParent = await db('parents')
        .where({ user_id: dbUser.id })
        .first();

      // Only aggregate child data allowed (Constitution Principle I)
      expect(dbParent).toHaveProperty('children_count');
      expect(dbParent).toHaveProperty('children_age_groups');
      expect(dbParent.children_count).toBe(0); // Default
      expect(dbParent.children_age_groups).toEqual([]); // Default
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid Google token', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token signature')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token_123' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('Invalid Google token'),
      });
    });

    it('should reject expired Google token', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Token used too late')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
      });
    });

    it('should reject Google token with unverified email', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          ...mockGoogleProfile,
          email_verified: false, // Unverified email
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('Email not verified'),
      });
    });
  });

  describe('Account Status', () => {
    it('should create new user with active account status', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.user.accountStatus).toBe('active');

      // Verify database
      const dbUser = await db('users')
        .where({ email: 'newparent@gmail.com' })
        .first();

      expect(dbUser.account_status).toBe('active');
    });

    it('should update last_login timestamp on signup', async () => {
      const beforeSignup = new Date();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users')
        .where({ email: 'newparent@gmail.com' })
        .first();

      expect(dbUser.last_login).toBeDefined();
      expect(new Date(dbUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeSignup.getTime());
    });
  });
});
