// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcrypt';

/**
 * T017: Integration Test - Returning User Signin
 *
 * Test Scenario 3 from quickstart.md:
 * Returning user signs in with their OAuth provider
 *
 * Purpose: End-to-end test validating returning user authentication
 * for users who previously signed up with Google or Apple OAuth
 *
 * Key Behaviors:
 * - isNew flag should be false
 * - User data should be returned from existing database record
 * - New JWT tokens should be generated
 * - last_login should be updated
 *
 * Constitution Compliance:
 * - Principle III (Security): Secure token rotation
 */

describe('T017: OAuth Returning User Signin - Integration Test', () => {
  // Google mock data
  const mockGoogleToken = 'mock_google_id_token_returning';
  const mockGooglePayload = {
    sub: '999888777666555444333',
    email: 'returning@gmail.com',
    email_verified: true,
    given_name: 'Returning',
    family_name: 'GoogleUser',
    picture: 'https://lh3.googleusercontent.com/a/returning-user',
  };

  // Apple mock data
  const mockAppleToken = 'mock_apple_identity_token_returning';
  const mockAppleNonce = 'nonce_returning_user_xyz';
  const mockApplePayload = {
    sub: '004567.returning.apple.8901',
    email: 'returning@icloud.com',
    email_verified: 'true',
    is_private_email: 'false',
  };

  let existingGoogleUserId: string;
  let existingAppleUserId: string;

  beforeEach(async () => {
    // Clean database
    await db('parents').del();
    await db('users').del();

    // Create existing Google OAuth user
    const [googleUser] = await db('users')
      .insert({
        email: 'returning@gmail.com',
        password_hash: null, // OAuth user has no password
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: '999888777666555444333',
        oauth_profile_picture: 'https://lh3.googleusercontent.com/a/returning-user',
        account_status: 'active',
        created_at: new Date('2024-01-15T10:00:00Z'), // Created a while ago
      })
      .returning('*');

    existingGoogleUserId = googleUser.id;

    // Create parent profile for Google user
    await db('parents').insert({
      user_id: existingGoogleUserId,
      first_name: 'Returning',
      last_name: 'GoogleUser',
      children_count: 2,
      children_age_groups: ['toddler', 'preschool'],
    });

    // Create existing Apple OAuth user
    const [appleUser] = await db('users')
      .insert({
        email: 'returning@icloud.com',
        password_hash: null,
        email_verified: true,
        oauth_provider: 'apple',
        oauth_provider_id: '004567.returning.apple.8901',
        oauth_profile_picture: null, // Apple doesn't provide photos
        account_status: 'active',
        created_at: new Date('2024-02-20T14:30:00Z'),
      })
      .returning('*');

    existingAppleUserId = appleUser.id;

    // Create parent profile for Apple user
    await db('parents').insert({
      user_id: existingAppleUserId,
      first_name: 'Returning',
      last_name: 'AppleUser',
      children_count: 1,
      children_age_groups: ['school-age'],
    });

    // Mock OAuth verification
    // @ts-expect-error - Mocking Google OAuth2Client for testing
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
      getPayload: () => mockGooglePayload,
    } as any);

    // @ts-expect-error - Mocking Apple signin for testing
    jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
      sub: mockApplePayload.sub,
      email: mockApplePayload.email,
      email_verified: mockApplePayload.email_verified,
      is_private_email: mockApplePayload.is_private_email,
      nonce: mockAppleNonce,
    } as any);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Google OAuth - Returning User', () => {
    it('should authenticate returning Google user and return isNew=false', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Validate response structure
      expect(response.body).toMatchObject({
        success: true,
        isNew: false, // Key assertion: returning user
        linked: false,
      });

      // Validate user object matches existing user
      expect(response.body.user).toMatchObject({
        id: existingGoogleUserId,
        email: 'returning@gmail.com',
        emailVerified: true,
        accountStatus: 'active',
        oauthProvider: 'google',
        oauthProviderId: '999888777666555444333',
      });

      // Validate new tokens generated
      expect(response.body.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: 900,
      });
    });

    it('should update last_login timestamp on returning Google user signin', async () => {
      const beforeSignin = new Date();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users').where({ id: existingGoogleUserId }).first();

      expect(dbUser.last_login).toBeDefined();
      expect(new Date(dbUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeSignin.getTime());
    });

    it('should NOT create duplicate user for returning Google user', async () => {
      // First signin
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Second signin
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Verify still only ONE user in database
      const userCount = await db('users')
        .where({ email: 'returning@gmail.com' })
        .count('* as count')
        .first();

      expect(userCount.count).toBe('1');
    });

    it('should generate different access tokens on each Google signin', async () => {
      const firstResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const firstAccessToken = firstResponse.body.tokens.accessToken;

      // Wait 1 second to ensure different token
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const secondResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const secondAccessToken = secondResponse.body.tokens.accessToken;

      // Tokens should be different (token rotation)
      expect(secondAccessToken).not.toBe(firstAccessToken);

      // But both tokens should be valid
      const profileCheck1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${firstAccessToken}`)
        .expect(200);

      const profileCheck2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(200);

      expect(profileCheck1.body.user.email).toBe('returning@gmail.com');
      expect(profileCheck2.body.user.email).toBe('returning@gmail.com');
    });
  });

  describe('Apple OAuth - Returning User', () => {
    it('should authenticate returning Apple user and return isNew=false', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
          // No fullName (Apple doesn't provide on subsequent signins)
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        isNew: false,
        linked: false,
      });

      expect(response.body.user).toMatchObject({
        id: existingAppleUserId,
        email: 'returning@icloud.com',
        emailVerified: true,
        oauthProvider: 'apple',
        oauthProviderId: '004567.returning.apple.8901',
      });

      expect(response.body.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });

    it('should update last_login timestamp on returning Apple user signin', async () => {
      const beforeSignin = new Date();

      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      const dbUser = await db('users').where({ id: existingAppleUserId }).first();

      expect(dbUser.last_login).toBeDefined();
      expect(new Date(dbUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeSignin.getTime());
    });

    it('should NOT update parent name when fullName provided on subsequent Apple signin', async () => {
      // Apple might send fullName again, but we should keep original name
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
          fullName: {
            givenName: 'DifferentFirst',
            familyName: 'DifferentLast',
          },
        })
        .expect(200);

      // Parent name should NOT change
      const dbParent = await db('parents').where({ user_id: existingAppleUserId }).first();

      expect(dbParent.first_name).toBe('Returning'); // Original name preserved
      expect(dbParent.last_name).toBe('AppleUser'); // Original name preserved
    });

    it('should NOT create duplicate user for returning Apple user', async () => {
      // First signin
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      // Second signin
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      // Verify still only ONE user
      const userCount = await db('users')
        .where({ email: 'returning@icloud.com' })
        .count('* as count')
        .first();

      expect(userCount.count).toBe('1');
    });
  });

  describe('Suspended Account Handling', () => {
    it('should reject signin for suspended Google OAuth account', async () => {
      // Suspend the Google user account
      await db('users').where({ id: existingGoogleUserId }).update({ account_status: 'suspended' });

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'forbidden',
        message: expect.stringContaining('suspended'),
      });
    });

    it('should reject signin for deactivated Apple OAuth account', async () => {
      // Deactivate the Apple user account
      await db('users')
        .where({ id: existingAppleUserId })
        .update({ account_status: 'deactivated' });

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'forbidden',
        message: expect.stringContaining('deactivated'),
      });
    });
  });

  describe('OAuth Profile Updates', () => {
    it('should update Google profile picture if changed', async () => {
      // Mock Google returns new profile picture URL
      // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          ...mockGooglePayload,
          picture: 'https://lh3.googleusercontent.com/a/new-profile-pic', // Updated
        }),
      } as any);

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users').where({ id: existingGoogleUserId }).first();

      expect(dbUser.oauth_profile_picture).toBe(
        'https://lh3.googleusercontent.com/a/new-profile-pic',
      );
    });

    it('should NOT overwrite verified data with OAuth updates', async () => {
      // User manually updated their email verification status
      await db('users')
        .where({ id: existingGoogleUserId })
        .update({ phone_verified: true, phone: '+15551234567' });

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Phone verification should remain unchanged
      const dbUser = await db('users').where({ id: existingGoogleUserId }).first();

      expect(dbUser.phone_verified).toBe(true);
      expect(dbUser.phone).toBe('+15551234567');
    });
  });

  describe('Token Lifecycle', () => {
    it('should allow multiple active sessions for returning user (multi-device)', async () => {
      // First device login
      const device1Response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const device1Token = device1Response.body.tokens.accessToken;

      // Second device login
      const device2Response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const device2Token = device2Response.body.tokens.accessToken;

      // Both tokens should work simultaneously
      const check1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${device1Token}`)
        .expect(200);

      const check2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${device2Token}`)
        .expect(200);

      expect(check1.body.user.id).toBe(existingGoogleUserId);
      expect(check2.body.user.id).toBe(existingGoogleUserId);
    });
  });

  describe('Cross-Provider Edge Cases', () => {
    it('should NOT allow Google signin for user who signed up with Apple', async () => {
      // Attempt Google signin with Apple user's email
      // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: 'different_google_sub_123',
          email: 'returning@icloud.com', // Apple user's email
          email_verified: true,
          given_name: 'Wrong',
          family_name: 'Provider',
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'conflict',
        message: expect.stringContaining('different OAuth provider'),
      });
    });

    it('should NOT allow Apple signin for user who signed up with Google', async () => {
      // Attempt Apple signin with Google user's email
      // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: 'different_apple_sub_456',
        email: 'returning@gmail.com', // Google user's email
        email_verified: 'true',
        nonce: mockAppleNonce,
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'conflict',
        message: expect.stringContaining('different OAuth provider'),
      });
    });
  });
});
