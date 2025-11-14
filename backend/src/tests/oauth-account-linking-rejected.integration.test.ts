// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcrypt';

/**
 * T019: Integration Test - Account Linking Rejected (Unverified Email)
 *
 * Test Scenario 5 from quickstart.md:
 * User has existing email/password account with UNVERIFIED email
 * and attempts to sign in with OAuth using the same email
 *
 * Expected Behavior:
 * - OAuth linking should be REJECTED for security
 * - 403 Forbidden response
 * - Error message indicating email verification required
 * - NO OAuth fields should be added to user record
 *
 * Security Rationale:
 * Prevents account takeover attack where attacker:
 * 1. Creates account with victim's email (victim@example.com)
 * 2. Doesn't verify email (account remains unverified)
 * 3. Victim tries to sign in with Google OAuth using same email
 * 4. WITHOUT this check, OAuth would link to attacker's account
 * 5. Attacker gains access to victim's OAuth profile data
 *
 * Constitution Compliance:
 * - Principle III (Security): Account takeover prevention
 */

describe('T019: OAuth Account Linking Rejected (Unverified Email) - Integration Test', () => {
  const unverifiedEmail = 'unverified@example.com';
  const existingPassword = 'Password123!';
  let unverifiedUserId: string;

  // Google mock data
  const mockGoogleToken = 'mock_google_token_unverified';
  const mockGooglePayload = {
    sub: '987654321098765432109',
    email: unverifiedEmail, // Same as unverified account
    email_verified: true, // Google says email is verified
    given_name: 'Unverified',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/a/unverified',
  };

  // Apple mock data
  const mockAppleToken = 'mock_apple_token_unverified';
  const mockAppleNonce = 'nonce_unverified_abc789';
  const mockApplePayload = {
    sub: '006789.unverified.apple.4567',
    email: unverifiedEmail, // Same as unverified account
    email_verified: 'true',
    is_private_email: 'false',
  };

  beforeEach(async () => {
    // Clean database
    await db('parents').del();
    await db('users').del();

    // Create existing email/password user with UNVERIFIED email
    const passwordHash = await bcrypt.hash(existingPassword, 12);
    const [user] = await db('users')
      .insert({
        email: unverifiedEmail,
        password_hash: passwordHash,
        email_verified: false, // UNVERIFIED (key security test)
        phone: '+15559876543',
        phone_verified: false,
        account_status: 'active',
        created_at: new Date('2024-03-01T00:00:00Z'),
      })
      .returning('*');

    unverifiedUserId = user.id;

    // Create parent profile
    await db('parents').insert({
      user_id: unverifiedUserId,
      first_name: 'Unverified',
      last_name: 'User',
      children_count: 0,
      children_age_groups: [],
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

  describe('Google OAuth Linking Rejection', () => {
    it('should reject Google OAuth linking for account with unverified email', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // Validate error response
      expect(response.body).toMatchObject({
        success: false,
        error: 'forbidden',
        message: expect.stringContaining('email verification'),
      });

      // Ensure error message is clear for user
      expect(response.body.message.toLowerCase()).toContain('verify');
      expect(response.body.message.toLowerCase()).toContain('email');
    });

    it('should NOT add OAuth fields to unverified account after rejection', async () => {
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // Verify database - OAuth fields should remain NULL
      const dbUser = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(dbUser.oauth_provider).toBeNull();
      expect(dbUser.oauth_provider_id).toBeNull();
      expect(dbUser.oauth_profile_picture).toBeNull();
      expect(dbUser.email_verified).toBe(false); // Still unverified
    });

    it('should NOT update last_login after rejection', async () => {
      const originalLastLogin = await db('users')
        .where({ id: unverifiedUserId })
        .select('last_login')
        .first();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      const updatedLastLogin = await db('users')
        .where({ id: unverifiedUserId })
        .select('last_login')
        .first();

      // last_login should NOT change
      expect(updatedLastLogin.last_login).toBe(originalLastLogin.last_login);
    });

    it('should NOT return JWT tokens after rejection', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(response.body).not.toHaveProperty('tokens');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
    });
  });

  describe('Apple OAuth Linking Rejection', () => {
    it('should reject Apple OAuth linking for account with unverified email', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
          fullName: {
            givenName: 'Unverified',
            familyName: 'Apple',
          },
        })
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'forbidden',
        message: expect.stringContaining('email verification'),
      });
    });

    it('should NOT add OAuth fields to unverified account after Apple rejection', async () => {
      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(403);

      const dbUser = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(dbUser.oauth_provider).toBeNull();
      expect(dbUser.oauth_provider_id).toBeNull();
      expect(dbUser.email_verified).toBe(false);
    });
  });

  describe('Security: Account Takeover Prevention', () => {
    it('should prevent account takeover attack via OAuth linking', async () => {
      // ATTACK SCENARIO:
      // 1. Attacker creates account with victim's email but doesn't verify
      // 2. Victim tries to sign in with Google OAuth using their real email
      // 3. System correctly rejects linking to prevent takeover

      // Attacker's unverified account exists (created in beforeEach)
      const attackerAccount = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(attackerAccount.email_verified).toBe(false);
      expect(attackerAccount.oauth_provider).toBeNull();

      // Victim attempts Google signin (legitimate user with verified Google email)
      const victimAttempt = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // System correctly rejects linking
      expect(victimAttempt.body.error).toBe('forbidden');

      // Attacker's account remains unchanged (no OAuth data added)
      const attackerAccountAfter = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(attackerAccountAfter.oauth_provider).toBeNull();
      expect(attackerAccountAfter.oauth_provider_id).toBeNull();

      // Victim is protected from account takeover
    });

    it('should provide clear guidance to user on how to proceed after rejection', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // Error message should guide user to verify their email first
      const message = response.body.message.toLowerCase();
      expect(message).toContain('verify');
      expect(message).toContain('email');

      // Should NOT leak information about existing account
      expect(message).not.toContain('password');
      expect(message).not.toContain('account exists');
    });
  });

  describe('Verification Flow Integration', () => {
    it('should allow OAuth linking AFTER user verifies their email', async () => {
      // First attempt - rejected
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // User verifies their email (simulate verification)
      await db('users')
        .where({ id: unverifiedUserId })
        .update({ email_verified: true });

      // Second attempt - should succeed
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        isNew: false,
        linked: true, // Now linking is allowed
      });

      // Verify OAuth fields added
      const dbUser = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe('987654321098765432109');
    });
  });

  describe('Password Login Still Works', () => {
    it('should still allow password login for unverified account', async () => {
      // OAuth linking is rejected
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // But password login should still work
      const passwordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: unverifiedEmail,
          password: existingPassword,
        })
        .expect(200);

      expect(passwordResponse.body.success).toBe(true);
      expect(passwordResponse.body.data.userId).toBe(unverifiedUserId);
    });
  });

  describe('Edge Cases', () => {
    it('should reject OAuth linking even if phone is verified but email is not', async () => {
      // Update account to have verified phone but unverified email
      await db('users')
        .where({ id: unverifiedUserId })
        .update({ phone_verified: true });

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(response.body.error).toBe('forbidden');

      // Email verification is the requirement, not phone
      const dbUser = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(dbUser.phone_verified).toBe(true); // Phone verified
      expect(dbUser.email_verified).toBe(false); // Email NOT verified
      expect(dbUser.oauth_provider).toBeNull(); // No OAuth linking
    });

    it('should reject both Google and Apple for same unverified account', async () => {
      // Try Google - rejected
      const googleResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(googleResponse.body.error).toBe('forbidden');

      // Try Apple - also rejected
      const appleResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockAppleToken,
          nonce: mockAppleNonce,
        })
        .expect(403);

      expect(appleResponse.body.error).toBe('forbidden');

      // Account remains unchanged
      const dbUser = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(dbUser.oauth_provider).toBeNull();
      expect(dbUser.email_verified).toBe(false);
    });

    it('should handle case where user verifies email between requests', async () => {
      // First request - rejected
      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // User verifies email immediately
      await db('users')
        .where({ id: unverifiedUserId })
        .update({ email_verified: true });

      // Second request (moments later) - should succeed
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(200);

      expect(response.body.linked).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should log rejected OAuth linking attempts for security monitoring', async () => {
      // This test validates that rejected linking attempts are logged
      // (actual logging implementation would be tested separately)

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      // Verify response includes enough context for audit logging
      expect(response.body).toMatchObject({
        success: false,
        error: 'forbidden',
        message: expect.any(String),
      });

      // In production, this would trigger an audit log entry:
      // - Timestamp
      // - Email address (unverified@example.com)
      // - OAuth provider (google)
      // - Reason (email_not_verified)
      // - Action (linking_rejected)
    });
  });

  describe('Multiple Rejection Attempts', () => {
    it('should consistently reject repeated OAuth linking attempts', async () => {
      // First attempt
      const attempt1 = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(attempt1.body.error).toBe('forbidden');

      // Second attempt (user retries)
      const attempt2 = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(attempt2.body.error).toBe('forbidden');

      // Third attempt (user still trying)
      const attempt3 = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockGoogleToken })
        .expect(403);

      expect(attempt3.body.error).toBe('forbidden');

      // Account should still be unlinked
      const dbUser = await db('users')
        .where({ id: unverifiedUserId })
        .first();

      expect(dbUser.oauth_provider).toBeNull();
      expect(dbUser.email_verified).toBe(false);
    });
  });
});
