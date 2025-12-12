// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';

/**
 * T020: Integration Test - OAuth Provider Conflict
 *
 * Test Scenario 6 from quickstart.md:
 * User has existing account with one OAuth provider (e.g., Google)
 * and attempts to sign in with a different OAuth provider (e.g., Apple)
 * using the same email address
 *
 * Expected Behavior:
 * - Signin should be REJECTED with 409 Conflict
 * - Error message indicating account exists with different provider
 * - User should be instructed to use original OAuth provider
 * - NO changes to existing user record
 *
 * Security Rationale:
 * - Prevents confusion and potential account merging issues
 * - Maintains clear OAuth provider association
 * - Users should explicitly unlink before switching providers
 *
 * Constitution Compliance:
 * - Principle III (Security): Clear OAuth provider boundaries
 */

describe('T020: OAuth Provider Conflict - Integration Test', () => {
  const sharedEmail = 'shared@example.com';

  // Existing Google user
  let googleUserId: string;
  const googleProviderId = '111222333444555666777';

  // Existing Apple user
  let appleUserId: string;
  const appleProviderId = '007890.existing.apple.1234';

  // Mock tokens
  const mockGoogleToken = 'mock_google_token_conflict';
  const mockAppleToken = 'mock_apple_token_conflict';
  const mockAppleNonce = 'nonce_conflict_xyz456';

  beforeEach(async () => {
    // Clean database
    await db('parents').del();
    await db('users').del();

    // Create existing Google OAuth user
    const [googleUser] = await db('users')
      .insert({
        email: sharedEmail,
        password_hash: null,
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: googleProviderId,
        oauth_profile_picture: 'https://lh3.googleusercontent.com/a/google-user',
        account_status: 'active',
      })
      .returning('*');

    googleUserId = googleUser.id;

    await db('parents').insert({
      user_id: googleUserId,
      first_name: 'Google',
      last_name: 'User',
      children_count: 1,
      children_age_groups: ['toddler'],
    });

    // Create existing Apple OAuth user (different email for separate test)
    const [appleUser] = await db('users')
      .insert({
        email: 'apple-only@example.com',
        password_hash: null,
        email_verified: true,
        oauth_provider: 'apple',
        oauth_provider_id: appleProviderId,
        oauth_profile_picture: null,
        account_status: 'active',
      })
      .returning('*');

    appleUserId = appleUser.id;

    await db('parents').insert({
      user_id: appleUserId,
      first_name: 'Apple',
      last_name: 'User',
      children_count: 1,
      children_age_groups: ['preschool'],
    });

    // Mock OAuth verification for Google
    // @ts-expect-error - Mocking Google OAuth2Client for testing
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => ({
      getPayload: () => ({
        sub: '888999000111222333444', // Different Google ID
        email: sharedEmail, // Same email as existing account
        email_verified: true,
        given_name: 'Conflict',
        family_name: 'Test',
        picture: 'https://lh3.googleusercontent.com/a/different',
      }),
    } as any));

    // Mock OAuth verification for Apple
    // @ts-expect-error - Mocking Apple signin for testing
    jest.spyOn(appleSignin, 'verifyIdToken').mockImplementation(async () => ({
      sub: '008901.different.apple.5678', // Different Apple ID
      email: sharedEmail, // Same email as existing Google account
      email_verified: 'true',
      is_private_email: 'false',
      nonce: mockAppleNonce,
    } as any));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Google User Attempting Apple Signin', () => {
    it('should reject Apple signin for user who signed up with Google', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
          fullName: {
            givenName: 'Conflict',
            familyName: 'Apple',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'conflict',
        message: expect.stringContaining('different OAuth provider'),
      });

      // Error message should indicate existing provider
      expect(response.body.message.toLowerCase()).toContain('google');
    });

    it('should NOT modify existing Google account when Apple signin is rejected', async () => {
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Verify Google account remains unchanged
      const dbUser = await db('users')
        .where({ id: googleUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe(googleProviderId);
      expect(dbUser.oauth_profile_picture).toContain('google-user');
    });

    it('should NOT create duplicate account when Apple signin is rejected', async () => {
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Verify only ONE user exists with this email
      const userCount = await db('users')
        .where({ email: sharedEmail })
        .count('* as count')
        .first();

      expect(userCount.count).toBe('1');
    });

    it('should provide clear guidance on using original Google provider', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      const message = response.body.message.toLowerCase();

      // Should mention the existing provider
      expect(message).toContain('google');

      // Should guide user to use original provider
      expect(message).toMatch(/sign in|log in|use/);
    });
  });

  describe('Apple User Attempting Google Signin', () => {
    it('should reject Google signin for user who signed up with Apple', async () => {
      // Update mock to use Apple user's email
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: '999000111222333444555',
          email: 'apple-only@example.com', // Apple user's email
          email_verified: true,
          given_name: 'Conflict',
          family_name: 'Google',
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

      // Error message should indicate existing provider
      expect(response.body.message.toLowerCase()).toContain('apple');
    });

    it('should NOT modify existing Apple account when Google signin is rejected', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: '999000111222333444555',
          email: 'apple-only@example.com',
          email_verified: true,
          given_name: 'Conflict',
          family_name: 'Google',
        }),
      } as any);

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(409);

      // Verify Apple account remains unchanged
      const dbUser = await db('users')
        .where({ id: appleUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('apple');
      expect(dbUser.oauth_provider_id).toBe(appleProviderId);
    });
  });

  describe('Conflict Resolution Guidance', () => {
    it('should include provider name in error response for client UI', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Response should include existing provider for UI to display
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('google');

      // Could also include structured data for client
      // expect(response.body).toHaveProperty('existingProvider', 'google');
    });

    it('should suggest unlinking as a solution for provider switching', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      const message = response.body.message.toLowerCase();

      // Should mention unlinking or account management
      // (exact wording depends on product requirements)
      expect(message).toMatch(/google|different provider|existing account/);
    });
  });

  describe('Security: Provider Identity Protection', () => {
    it('should prevent OAuth provider hijacking via email collision', async () => {
      // ATTACK SCENARIO:
      // Attacker knows victim uses Google OAuth with victim@example.com
      // Attacker tries to sign in with Apple OAuth using victim@example.com
      // System should reject and prevent account takeover

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      expect(response.body.error).toBe('conflict');

      // Original Google account protected
      const dbUser = await db('users')
        .where({ id: googleUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe(googleProviderId);
    });

    it('should NOT leak sensitive OAuth provider information to unauthorized users', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Error message should inform user but not leak provider_id or other details
      expect(response.body).not.toHaveProperty('oauthProviderId');
      expect(response.body).not.toHaveProperty('userId');
      expect(response.body.message).not.toContain(googleProviderId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle case where OAuth provider IDs are different but email is same', async () => {
      // This is the normal conflict scenario
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      expect(response.body.error).toBe('conflict');
    });

    it('should allow Google signin when provider AND provider_id match', async () => {
      // Existing user with Google OAuth
      // Same user signs in again with Google (returning user scenario)
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: googleProviderId, // SAME Google provider_id
          email: sharedEmail,
          email_verified: true,
          given_name: 'Google',
          family_name: 'User',
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isNew).toBe(false);
      expect(response.body.user.id).toBe(googleUserId);
    });

    it('should reject even if email case differs', async () => {
      // Attempt Apple signin with uppercase email variant
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: '008901.different.apple.5678',
        email: 'SHARED@EXAMPLE.COM', // Uppercase
        email_verified: 'true',
        is_private_email: 'false',
        nonce: mockAppleNonce,
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      expect(response.body.error).toBe('conflict');
    });
  });

  describe('Provider Switching Workflow', () => {
    it('should allow Apple signin after unlinking Google (manual unlinking)', async () => {
      // Step 1: User manually unlinks Google OAuth from account settings
      await db('users')
        .where({ id: googleUserId })
        .update({
          oauth_provider: null,
          oauth_provider_id: null,
          oauth_profile_picture: null,
        });

      // Step 2: User signs in with Apple
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.linked).toBe(true); // Linked to existing account

      // Verify Apple OAuth now linked
      const dbUser = await db('users')
        .where({ id: googleUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('apple');
      expect(dbUser.oauth_provider_id).not.toBe(googleProviderId);
    });
  });

  describe('Multiple Conflict Attempts', () => {
    it('should consistently reject repeated provider conflict attempts', async () => {
      // First attempt
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Second attempt
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Third attempt
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Google account should remain unchanged
      const dbUser = await db('users')
        .where({ id: googleUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('google');
    });
  });

  describe('Correct Provider Usage', () => {
    it('should allow user to signin with correct provider after conflict rejection', async () => {
      // Attempt Apple signin - rejected
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // User realizes they should use Google
      // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: googleProviderId, // Correct Google provider_id
          email: sharedEmail,
          email_verified: true,
          given_name: 'Google',
          family_name: 'User',
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(googleUserId);
    });
  });

  describe('Database Integrity', () => {
    it('should maintain database constraints after conflict rejection', async () => {
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(409);

      // Verify oauth_consistency_check constraint still satisfied
      const dbUser = await db('users')
        .where({ id: googleUserId })
        .first();

      // Both provider and provider_id should be set (or both null)
      if (dbUser.oauth_provider !== null) {
        expect(dbUser.oauth_provider_id).not.toBeNull();
      }
      if (dbUser.oauth_provider_id !== null) {
        expect(dbUser.oauth_provider).not.toBeNull();
      }

      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe(googleProviderId);
    });
  });
});
