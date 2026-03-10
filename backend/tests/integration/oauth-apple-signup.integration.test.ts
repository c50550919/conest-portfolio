// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import appleSignin from 'apple-signin-auth';

/**
 * T016: Integration Test - New User Apple Signup Flow
 *
 * Test Scenario 2 from quickstart.md:
 * New user signs up with Apple Sign In
 *
 * Purpose: End-to-end test validating the complete flow of a new user
 * signing up using Apple OAuth for the first time
 *
 * Apple-Specific Behaviors:
 * - fullName only provided on FIRST authorization
 * - email may be relay address (privaterelay.appleid.com)
 * - nonce validation for replay attack prevention
 *
 * Constitution Compliance:
 * - Principle III (Security): OAuth token verification, nonce validation
 * - Principle I (Child Safety): No child PII collected during OAuth
 */

describe('T016: OAuth Apple Signup - Integration Test', () => {
  const mockAppleToken = 'mock_apple_identity_token_new_user';
  const mockNonce = 'random_nonce_abc123xyz789';
  const mockApplePayload = {
    sub: '001234.abcdef1234567890.9876',
    email: 'newparent@icloud.com',
    email_verified: 'true', // Apple returns string, not boolean
    is_private_email: 'false',
  };

  beforeEach(async () => {
    // Clean database before each test
    await db('parents').del();
    await db('users').del();

    // Mock Apple identity token verification
    // @ts-expect-error - Mocking Apple signin for testing
    jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
      sub: mockApplePayload.sub,
      email: mockApplePayload.email,
      email_verified: mockApplePayload.email_verified,
      is_private_email: mockApplePayload.is_private_email,
      nonce: mockNonce, // Nonce must match for security
    } as any);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Complete New User Signup Flow', () => {
    it('should create new user account and parent profile on first Apple signin', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Michael',
            familyName: 'Chen',
          },
        })
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
        email: 'newparent@icloud.com',
        emailVerified: true,
        accountStatus: 'active',
      });

      // Validate OAuth fields
      expect(response.body.user.oauthProvider).toBe('apple');
      expect(response.body.user.oauthProviderId).toBe('001234.abcdef1234567890.9876');
      expect(response.body.user.oauthProfilePicture).toBeNull(); // Apple doesn't provide photos

      // Validate tokens
      expect(response.body.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900,
      });

      // Verify database state - user created
      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();

      expect(dbUser).toBeDefined();
      expect(dbUser.oauth_provider).toBe('apple');
      expect(dbUser.oauth_provider_id).toBe('001234.abcdef1234567890.9876');
      expect(dbUser.password_hash).toBeNull();
      expect(dbUser.email_verified).toBe(true);

      // Verify parent profile created with Apple-provided name
      const dbParent = await db('parents').where({ user_id: dbUser.id }).first();

      expect(dbParent).toBeDefined();
      expect(dbParent.first_name).toBe('Michael');
      expect(dbParent.last_name).toBe('Chen');
    });

    it('should handle Apple relay email addresses correctly', async () => {
      // Mock Apple private relay email
      // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: '002345.xyz789abc123.1234',
        email: 'abc123xyz789@privaterelay.appleid.com',
        email_verified: 'true',
        is_private_email: 'true', // Privacy-enabled email
        nonce: mockNonce,
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Privacy',
            familyName: 'User',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('abc123xyz789@privaterelay.appleid.com');

      // Verify database accepts relay email
      const dbUser = await db('users')
        .where({ email: 'abc123xyz789@privaterelay.appleid.com' })
        .first();

      expect(dbUser).toBeDefined();
      expect(dbUser.email_verified).toBe(true); // Apple verifies even relay emails
    });

    it('should handle missing fullName gracefully (subsequent Apple signins)', async () => {
      // Apple only provides fullName on FIRST authorization
      // Subsequent signins don't include fullName
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          // No fullName provided
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify parent profile created with empty names
      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();
      const dbParent = await db('parents').where({ user_id: dbUser.id }).first();

      expect(dbParent.first_name).toBe('');
      expect(dbParent.last_name).toBe('');
    });
  });

  describe('Nonce Validation (Replay Attack Prevention)', () => {
    it('should reject Apple token with mismatched nonce', async () => {
      // Mock returns different nonce than what was sent
      // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: mockApplePayload.sub,
        email: mockApplePayload.email,
        email_verified: mockApplePayload.email_verified,
        nonce: 'different_nonce_attack', // MISMATCH
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce, // Original nonce
          fullName: {
            givenName: 'Attack',
            familyName: 'Attempt',
          },
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('nonce mismatch'),
      });

      // Verify NO user created in database
      const userCount = await db('users').count('* as count').first();
      expect(userCount.count).toBe('0');
    });

    it('should require nonce parameter for Apple signin', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          // Missing nonce
          fullName: {
            givenName: 'Test',
            familyName: 'User',
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'validation_error',
        message: expect.stringContaining('nonce'),
      });
    });
  });

  describe('Token Validation', () => {
    it('should return valid JWT access token that can be used for authenticated requests', async () => {
      const signupResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Token',
            familyName: 'Test',
          },
        })
        .expect(200);

      const { accessToken } = signupResponse.body.tokens;

      // Use access token for authenticated request
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.user.email).toBe('newparent@icloud.com');
    });

    it('should return valid refresh token for token rotation', async () => {
      const signupResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Refresh',
            familyName: 'Test',
          },
        })
        .expect(200);

      const { refreshToken } = signupResponse.body.tokens;

      // Use refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.data).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe('Idempotency - Repeated Signin', () => {
    it('should return existing user on second Apple signin (not create duplicate)', async () => {
      // First signin - creates account
      const firstResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Repeat',
            familyName: 'User',
          },
        })
        .expect(200);

      expect(firstResponse.body.isNew).toBe(true);
      const firstUserId = firstResponse.body.user.id;

      // Second signin - returns existing account (no fullName this time)
      const secondResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          // No fullName (Apple behavior)
        })
        .expect(200);

      expect(secondResponse.body.isNew).toBe(false);
      expect(secondResponse.body.user.id).toBe(firstUserId);
      expect(secondResponse.body.user.email).toBe('newparent@icloud.com');

      // Verify only ONE user exists
      const userCount = await db('users')
        .where({ email: 'newparent@icloud.com' })
        .count('* as count')
        .first();

      expect(userCount.count).toBe('1');
    });
  });

  describe('Child Safety Compliance', () => {
    it('should NOT collect or store any child PII during Apple OAuth signup', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Safety',
            familyName: 'Test',
          },
        })
        .expect(200);

      // Verify response contains NO child data
      expect(response.body.user).not.toHaveProperty('childrenNames');
      expect(response.body.user).not.toHaveProperty('childrenPhotos');
      expect(response.body.user).not.toHaveProperty('childrenAges');

      // Verify database contains NO child PII
      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();

      const dbParent = await db('parents').where({ user_id: dbUser.id }).first();

      // Only aggregate child data allowed
      expect(dbParent).toHaveProperty('children_count');
      expect(dbParent).toHaveProperty('children_age_groups');
      expect(dbParent.children_count).toBe(0);
      expect(dbParent.children_age_groups).toEqual([]);
    });
  });

  describe('Error Scenarios', () => {
    it('should reject invalid Apple identity token', async () => {
      // @ts-expect-error - Mocking Apple signin for testing
      jest
        .spyOn(appleSignin, 'verifyIdToken') // @ts-expect-error - Mocking error
        .mockRejectedValue(new Error('Invalid token signature'));

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'invalid_token_abc123',
          nonce: mockNonce,
          fullName: {
            givenName: 'Invalid',
            familyName: 'Token',
          },
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('Invalid Apple token'),
      });
    });

    it('should reject expired Apple token', async () => {
      // @ts-expect-error - Mocking Apple signin for testing
      jest
        .spyOn(appleSignin, 'verifyIdToken') // @ts-expect-error - Mocking error
        .mockRejectedValue(new Error('Token expired'));

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Expired',
            familyName: 'Token',
          },
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle Apple token without email gracefully', async () => {
      // Edge case: Apple sometimes doesn't return email
      // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: '003456.noemail.5678',
        // No email field
        email_verified: 'false',
        nonce: mockNonce,
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'No',
            familyName: 'Email',
          },
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('email'),
      });
    });
  });

  describe('Account Status', () => {
    it('should create new user with active account status', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Active',
            familyName: 'Account',
          },
        })
        .expect(200);

      expect(response.body.user.accountStatus).toBe('active');

      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();

      expect(dbUser.account_status).toBe('active');
    });

    it('should update last_login timestamp on signup', async () => {
      const beforeSignup = new Date();

      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'Login',
            familyName: 'Timestamp',
          },
        })
        .expect(200);

      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();

      expect(dbUser.last_login).toBeDefined();
      expect(new Date(dbUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeSignup.getTime());
    });
  });

  describe('Apple-Specific Edge Cases', () => {
    it('should handle fullName with only givenName (missing familyName)', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            givenName: 'SingleName',
            // No familyName
          },
        })
        .expect(200);

      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();
      const dbParent = await db('parents').where({ user_id: dbUser.id }).first();

      expect(dbParent.first_name).toBe('SingleName');
      expect(dbParent.last_name).toBe('');
    });

    it('should handle fullName with only familyName (missing givenName)', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockNonce,
          fullName: {
            // No givenName
            familyName: 'OnlyLastName',
          },
        })
        .expect(200);

      const dbUser = await db('users').where({ email: 'newparent@icloud.com' }).first();
      const dbParent = await db('parents').where({ user_id: dbUser.id }).first();

      expect(dbParent.first_name).toBe('');
      expect(dbParent.last_name).toBe('OnlyLastName');
    });
  });
});
