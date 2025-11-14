// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcrypt';

/**
 * T018: Integration Test - Account Linking with Verified Email
 *
 * Test Scenario 4 from quickstart.md:
 * User has existing email/password account with verified email
 * and signs in with OAuth using the same email address
 *
 * Expected Behavior:
 * - OAuth provider should be LINKED to existing account
 * - linked flag should be true in response
 * - Original user ID and data preserved
 * - OAuth fields added to existing user record
 *
 * Security Requirements:
 * - Email MUST be verified before allowing OAuth linking
 * - This prevents account takeover attacks
 *
 * Constitution Compliance:
 * - Principle III (Security): Email verification requirement
 */

describe('T018: OAuth Account Linking (Verified Email) - Integration Test', () => {
  const existingEmail = 'verified@example.com';
  const existingPassword = 'SecurePassword123!';
  let existingUserId: string;

  // Google mock data
  const mockGoogleToken = 'mock_google_token_linking';
  const mockGooglePayload = {
    sub: '123456789012345678901',
    email: existingEmail, // Same as existing account
    email_verified: true,
    given_name: 'Verified',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/verified-user',
  };

  // Apple mock data
  const mockAppleToken = 'mock_apple_token_linking';
  const mockAppleNonce = 'nonce_linking_xyz123';
  const mockApplePayload = {
    sub: '005678.linking.apple.3456',
    email: existingEmail, // Same as existing account
    email_verified: 'true',
    is_private_email: 'false',
  };

  beforeEach(async () => {
    // Clean database
    await db('parents').del();
    await db('users').del();

    // Create existing email/password user with VERIFIED email
    const passwordHash = await bcrypt.hash(existingPassword, 12);
    const [user] = await db('users')
      .insert({
        email: existingEmail,
        password_hash: passwordHash,
        email_verified: true, // VERIFIED email (key requirement)
        phone: '+15551234567',
        phone_verified: true,
        account_status: 'active',
        created_at: new Date('2024-01-01T00:00:00Z'),
      })
      .returning('*');

    existingUserId = user.id;

    // Create parent profile for existing user
    await db('parents').insert({
      user_id: existingUserId,
      first_name: 'Verified',
      last_name: 'User',
      children_count: 2,
      children_age_groups: ['toddler', 'school-age'],
      city: 'Portland',
      state: 'OR',
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

  describe('Google Account Linking', () => {
    it('should link Google OAuth to existing verified email/password account', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Validate response flags
      expect(response.body).toMatchObject({
        success: true,
        isNew: false, // Not a new user
        linked: true, // OAuth provider was linked
      });

      // Validate existing user ID preserved
      expect(response.body.user.id).toBe(existingUserId);
      expect(response.body.user.email).toBe(existingEmail);

      // Validate OAuth fields added
      expect(response.body.user.oauthProvider).toBe('google');
      expect(response.body.user.oauthProviderId).toBe('123456789012345678901');
      expect(response.body.user.oauthProfilePicture).toContain('googleusercontent.com');

      // Validate original user data preserved
      expect(response.body.user.phone).toBe('+15551234567');
      expect(response.body.user.phoneVerified).toBe(true);

      // Verify database state
      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe('123456789012345678901');
      expect(dbUser.password_hash).not.toBeNull(); // Original password preserved
      expect(dbUser.phone).toBe('+15551234567'); // Original phone preserved
    });

    it('should preserve parent profile data after Google OAuth linking', async () => {
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbParent = await db('parents')
        .where({ user_id: existingUserId })
        .first();

      // Original parent data should be preserved
      expect(dbParent.first_name).toBe('Verified');
      expect(dbParent.last_name).toBe('User');
      expect(dbParent.children_count).toBe(2);
      expect(dbParent.children_age_groups).toEqual(['toddler', 'school-age']);
      expect(dbParent.city).toBe('Portland');
      expect(dbParent.state).toBe('OR');
    });

    it('should allow signin with Google after linking', async () => {
      // First, link the account
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Second signin should work and return linked=false (already linked)
      const secondResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(secondResponse.body).toMatchObject({
        success: true,
        isNew: false,
        linked: false, // Already linked, not linking again
      });

      expect(secondResponse.body.user.id).toBe(existingUserId);
      expect(secondResponse.body.user.oauthProvider).toBe('google');
    });

    it('should still allow signin with original password after Google linking', async () => {
      // Link Google account
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Original email/password login should still work
      const passwordLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: existingPassword,
        })
        .expect(200);

      expect(passwordLoginResponse.body.data.userId).toBe(existingUserId);
    });
  });

  describe('Apple Account Linking', () => {
    it('should link Apple OAuth to existing verified email/password account', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
          fullName: {
            givenName: 'Apple',
            familyName: 'Link',
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        isNew: false,
        linked: true,
      });

      expect(response.body.user.id).toBe(existingUserId);
      expect(response.body.user.oauthProvider).toBe('apple');
      expect(response.body.user.oauthProviderId).toBe('005678.linking.apple.3456');

      // Verify database
      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('apple');
      expect(dbUser.oauth_provider_id).toBe('005678.linking.apple.3456');
      expect(dbUser.password_hash).not.toBeNull(); // Password preserved
    });

    it('should NOT overwrite parent name when linking Apple (preserve original)', async () => {
      await request(app)
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

      const dbParent = await db('parents')
        .where({ user_id: existingUserId })
        .first();

      // Original name should be preserved
      expect(dbParent.first_name).toBe('Verified');
      expect(dbParent.last_name).toBe('User');
    });

    it('should allow signin with Apple after linking', async () => {
      // Link Apple account
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      // Second Apple signin should work
      const secondResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      expect(secondResponse.body.isNew).toBe(false);
      expect(secondResponse.body.linked).toBe(false); // Already linked
      expect(secondResponse.body.user.id).toBe(existingUserId);
    });

    it('should still allow signin with password after Apple linking', async () => {
      // Link Apple account
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      // Password login should still work
      const passwordLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: existingPassword,
        })
        .expect(200);

      expect(passwordLoginResponse.body.success).toBe(true);
      expect(passwordLoginResponse.body.data.userId).toBe(existingUserId);
    });
  });

  describe('Multi-Device Scenarios', () => {
    it('should support user signing in with different methods on different devices', async () => {
      // Device 1: Password login
      const passwordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: existingPassword,
        })
        .expect(200);

      const passwordToken = passwordResponse.body.data.accessToken;

      // Device 2: Link and use Google OAuth
      const googleResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const googleToken = googleResponse.body.tokens.accessToken;

      // Both tokens should work simultaneously
      const profileCheck1 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${passwordToken}`)
        .expect(200);

      const profileCheck2 = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${googleToken}`)
        .expect(200);

      expect(profileCheck1.body.user.id).toBe(existingUserId);
      expect(profileCheck2.body.user.id).toBe(existingUserId);
    });
  });

  describe('Account Verification Status', () => {
    it('should maintain verification badges after OAuth linking', async () => {
      // User has phone verification badge
      expect(
        (await db('users').where({ id: existingUserId }).first()).phone_verified
      ).toBe(true);

      // Link Google account
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Phone verification should still be active
      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      expect(dbUser.phone_verified).toBe(true);
      expect(dbUser.email_verified).toBe(true);
    });
  });

  describe('Timestamp Updates', () => {
    it('should update last_login but preserve created_at after OAuth linking', async () => {
      const originalCreatedAt = new Date('2024-01-01T00:00:00Z');
      const beforeLinking = new Date();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      // created_at should NOT change
      expect(new Date(dbUser.created_at).toISOString()).toBe(originalCreatedAt.toISOString());

      // last_login should be updated
      expect(dbUser.last_login).toBeDefined();
      expect(new Date(dbUser.last_login).getTime()).toBeGreaterThanOrEqual(beforeLinking.getTime());
    });
  });

  describe('Profile Picture Handling', () => {
    it('should add Google profile picture when linking to account without picture', async () => {
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      expect(dbUser.oauth_profile_picture).toBe('https://lh3.googleusercontent.com/a/verified-user');
    });

    it('should NOT add profile picture when linking Apple (Apple provides none)', async () => {
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      expect(dbUser.oauth_profile_picture).toBeNull();
    });
  });

  describe('Database Constraints Validation', () => {
    it('should satisfy oauth_consistency_check constraint after linking', async () => {
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      // Both provider and provider_id should be set (constraint satisfied)
      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe('123456789012345678901');
      expect(dbUser.oauth_provider).not.toBeNull();
      expect(dbUser.oauth_provider_id).not.toBeNull();
    });

    it('should satisfy auth_method_check constraint after linking', async () => {
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      const dbUser = await db('users')
        .where({ id: existingUserId })
        .first();

      // User should have BOTH password AND OAuth (valid state)
      expect(dbUser.password_hash).not.toBeNull();
      expect(dbUser.oauth_provider).not.toBeNull();
    });
  });

  describe('Account Linking Reversibility', () => {
    it('should allow unlinking OAuth provider (remove OAuth fields while preserving password)', async () => {
      // Link Google account
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      // Verify linked
      let dbUser = await db('users').where({ id: existingUserId }).first();
      expect(dbUser.oauth_provider).toBe('google');

      // Unlink OAuth (admin operation or user request)
      await db('users')
        .where({ id: existingUserId })
        .update({
          oauth_provider: null,
          oauth_provider_id: null,
          oauth_profile_picture: null,
        });

      // Verify unlinked
      dbUser = await db('users').where({ id: existingUserId }).first();
      expect(dbUser.oauth_provider).toBeNull();
      expect(dbUser.oauth_provider_id).toBeNull();
      expect(dbUser.password_hash).not.toBeNull(); // Password preserved

      // Password login should still work
      const passwordLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: existingEmail,
          password: existingPassword,
        })
        .expect(200);

      expect(passwordLoginResponse.body.success).toBe(true);
    });
  });
});
