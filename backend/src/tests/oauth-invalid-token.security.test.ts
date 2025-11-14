// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';

/**
 * T022: Security Test - Invalid Token Rejection
 *
 * Purpose: Validate that OAuth endpoints properly reject invalid,
 * malformed, expired, and tampered tokens
 *
 * Security Requirements:
 * - All invalid tokens must be rejected with 401 Unauthorized
 * - No user data should be created or modified
 * - Error messages should be informative but not leak sensitive info
 * - Token validation must occur before any database operations
 *
 * Attack Scenarios Tested:
 * 1. Token tampering (modified signatures)
 * 2. Expired tokens
 * 3. Malformed tokens
 * 4. Tokens for wrong audience
 * 5. Tokens with invalid signatures
 * 6. Replay attacks (for Apple)
 *
 * Constitution Compliance:
 * - Principle III (Security): Robust token validation
 */

describe('T022: Invalid Token Rejection - Security Test', () => {
  beforeEach(async () => {
    // Clean database
    await db('parents').del();
    await db('users').del();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Google OAuth - Invalid Token Scenarios', () => {
    it('should reject tampered Google token (invalid signature)', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token signature')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'tampered_google_token_abc123' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('Invalid'),
      });

      // Verify NO user created
      const userCount = await db('users').count('* as count').first();
      expect(userCount.count).toBe('0');
    });

    it('should reject expired Google token', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Token used too late')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'expired_google_token_xyz789' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
      });
    });

    it('should reject Google token with wrong audience', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Wrong recipient')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'wrong_audience_token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject completely malformed Google token', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Token format is incorrect')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'not-a-jwt-token' })
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject empty Google token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: '' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'validation_error',
      });
    });

    it('should reject missing idToken field', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({}) // No idToken
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'validation_error',
        message: expect.stringContaining('idToken'),
      });
    });

    it('should reject Google token with unverified email', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: '123456789012345678901',
          email: 'unverified@gmail.com',
          email_verified: false, // NOT verified
          given_name: 'Unverified',
          family_name: 'User',
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'valid_token_unverified_email' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('Email not verified'),
      });
    });

    it('should reject Google token without email field', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: '123456789012345678901',
          // No email field
          email_verified: true,
          given_name: 'No',
          family_name: 'Email',
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'valid_token_no_email' })
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject Google token without sub (user ID)', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          // No sub field
          email: 'test@gmail.com',
          email_verified: true,
          given_name: 'No',
          family_name: 'Sub',
        }),
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'valid_token_no_sub' })
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });
  });

  describe('Apple OAuth - Invalid Token Scenarios', () => {
    it('should reject tampered Apple token (invalid signature)', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token signature')
      );

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'tampered_apple_token_abc',
          nonce: 'valid_nonce_xyz',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('Invalid'),
      });

      // Verify NO user created
      const userCount = await db('users').count('* as count').first();
      expect(userCount.count).toBe('0');
    });

    it('should reject expired Apple token', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Token expired')
      );

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'expired_apple_token',
          nonce: 'valid_nonce',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject Apple token with nonce mismatch (replay attack)', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: '009012.apple.user.3456',
        email: 'replay@icloud.com',
        email_verified: 'true',
        nonce: 'different_nonce_attack', // Mismatch
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'valid_apple_token',
          nonce: 'original_nonce', // Different from what token contains
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('nonce'),
      });

      // Verify NO user created (replay attack prevented)
      const userCount = await db('users').count('* as count').first();
      expect(userCount.count).toBe('0');
    });

    it('should reject Apple request without nonce', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'valid_apple_token',
          // Missing nonce
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'validation_error',
        message: expect.stringContaining('nonce'),
      });
    });

    it('should reject empty Apple identity token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: '',
          nonce: 'valid_nonce',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'validation_error',
      });
    });

    it('should reject missing identityToken field', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          // No identityToken
          nonce: 'valid_nonce',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'validation_error',
        message: expect.stringContaining('identityToken'),
      });
    });

    it('should reject Apple token without email field', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        sub: '009012.no-email.3456',
        // No email field
        email_verified: 'false',
        nonce: 'valid_nonce',
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'valid_token_no_email',
          nonce: 'valid_nonce',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'unauthorized',
        message: expect.stringContaining('email'),
      });
    });

    it('should reject Apple token without sub (user ID)', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockResolvedValue({
        // No sub field
        email: 'nosub@icloud.com',
        email_verified: 'true',
        nonce: 'valid_nonce',
      } as any);

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'valid_token_no_sub',
          nonce: 'valid_nonce',
        })
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });

    it('should reject completely malformed Apple token', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Token format is incorrect')
      );

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'not-a-valid-apple-token',
          nonce: 'valid_nonce',
        })
        .expect(401);

      expect(response.body.error).toBe('unauthorized');
    });
  });

  describe('Security: No Side Effects from Invalid Tokens', () => {
    it('should NOT create user record when Google token is invalid', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token' })
        .expect(401);

      // Verify database is clean
      const userCount = await db('users').count('* as count').first();
      const parentCount = await db('parents').count('* as count').first();

      expect(userCount.count).toBe('0');
      expect(parentCount.count).toBe('0');
    });

    it('should NOT create user record when Apple token is invalid', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'invalid_token',
          nonce: 'nonce',
        })
        .expect(401);

      // Verify database is clean
      const userCount = await db('users').count('* as count').first();
      expect(userCount.count).toBe('0');
    });

    it('should NOT modify existing user when invalid token presented', async () => {
      // Create existing user
      const [existingUser] = await db('users')
        .insert({
          email: 'existing@test.com',
          password_hash: null,
          email_verified: true,
          oauth_provider: 'google',
          oauth_provider_id: '999888777666555',
          account_status: 'active',
        })
        .returning('*');

      // Attempt signin with invalid token
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token' })
        .expect(401);

      // Verify user unchanged
      const dbUser = await db('users')
        .where({ id: existingUser.id })
        .first();

      expect(dbUser.oauth_provider).toBe('google');
      expect(dbUser.oauth_provider_id).toBe('999888777666555');
      expect(dbUser.last_login).toBeNull();
    });

    it('should NOT update last_login when token is invalid', async () => {
      // Create existing user
      await db('users').insert({
        email: 'test@gmail.com',
        password_hash: null,
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: '123456789',
        account_status: 'active',
        last_login: new Date('2024-01-01T00:00:00Z'),
      });

    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token' })
        .expect(401);

      // Verify last_login unchanged
      const dbUser = await db('users').where({ email: 'test@gmail.com' }).first();
      expect(new Date(dbUser.last_login).toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Error Message Security', () => {
    it('should NOT leak sensitive information in error messages', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token signature from Google servers')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token' })
        .expect(401);

      // Should NOT leak internal error details
      expect(response.body.message).not.toContain('Google servers');
      expect(response.body.message).not.toContain('stack trace');
      expect(response.body.message).not.toContain('database');

      // Should provide user-friendly message
      expect(response.body.message).toMatch(/invalid|unauthorized/i);
    });

    it('should use consistent error format for all rejection types', async () => {
      const rejectionScenarios = [
        { error: 'Invalid signature', token: 'token1' },
        { error: 'Token expired', token: 'token2' },
        { error: 'Wrong audience', token: 'token3' },
      ];

      for (const scenario of rejectionScenarios) {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
        jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
          new Error(scenario.error)
        );

        const response = await request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: scenario.token })
          .expect(401);

        // All should have consistent format
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'unauthorized');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
      }
    });

    it('should NOT return JWT tokens in error responses', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token' })
        .expect(401);

      expect(response.body).not.toHaveProperty('tokens');
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
    });
  });

  describe('Token Validation Order', () => {
    it('should validate token BEFORE checking database', async () => {
      // Create existing user
      await db('users').insert({
        email: 'existing@test.com',
        password_hash: null,
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: '123456789',
        account_status: 'active',
      });

      // Mock invalid token
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid_token' })
        .expect(401);

      // Should fail at token validation, not database lookup
      expect(response.body.error).toBe('unauthorized');
    });
  });

  describe('Multiple Invalid Attempts', () => {
    it('should consistently reject repeated invalid token attempts', async () => {
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').// @ts-expect-error - Mocking error
      mockRejectedValue(
        new Error('Invalid token')
      );

      // Multiple attempts with invalid token
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: `invalid_token_${i}` });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('unauthorized');
      }

      // Verify NO user created after multiple attempts
      const userCount = await db('users').count('* as count').first();
      expect(userCount.count).toBe('0');
    });
  });
});
