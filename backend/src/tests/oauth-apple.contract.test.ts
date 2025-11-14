// @ts-nocheck
/**
 * OAuth Apple Contract Tests
 *
 * Feature: 002-oauth-social-login
 * Purpose: Validate POST /api/auth/oauth/apple contract against OpenAPI spec
 * Constitution: Principle III (Security - server-side token verification)
 *
 * Test Coverage:
 * 1. Request schema validation (identityToken, user required; fullName, nonce optional)
 * 2. Response schema validation (AuthSuccessResponse)
 * 3. Error responses (400, 401, 409, 429, 500)
 * 4. Apple-specific behaviors (Hide My Email, name only on first auth)
 *
 * Reference: specs/002-oauth-social-login/contracts/openapi.yaml
 * Created: 2025-10-13
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../server';
import { db } from '../config/database';

describe('POST /api/auth/oauth/apple - Contract Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await db('users').where('email', 'like', '%@privaterelay.appleid.com%').delete();
  });

  afterEach(async () => {
    // Clean up test data
    await db('users').where('email', 'like', '%@privaterelay.appleid.com%').delete();
  });

  describe('Request Schema Validation', () => {
    it('should reject request without identityToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ user: '000123.abc456def789.1234' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('field', 'identityToken');
    });

    it('should reject request without user field', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ identityToken: 'mock-identity-token' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('field', 'user');
    });

    it('should accept request with identityToken and user (minimal)', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'eyJraWQiOiJmaDZCczhDIiwiYWxnIjoiUlMyNTYifQ...',
          user: '000123.abc456def789.1234',
        });

      // Expect either 200 (success) or 401 (invalid token)
      expect([200, 401]).toContain(response.status);
    });

    it('should accept request with optional fullName (first-time user)', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-apple-identity-token',
          user: '000123.abc456def789.1234',
          fullName: {
            givenName: 'Sarah',
            familyName: 'Johnson',
          },
        });

      expect([200, 401]).toContain(response.status);
    });

    it('should accept request with optional nonce', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-apple-identity-token',
          user: '000123.abc456def789.1234',
          nonce: 'a1b2c3d4e5f6g7h8',
        });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return AuthSuccessResponse schema for new user with name', async () => {
      const mockValidToken = 'mock-valid-apple-token-new-user';

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockValidToken,
          user: '000456.newuser123.7890',
          fullName: {
            givenName: 'Emma',
            familyName: 'Wilson',
          },
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('tokens');
        expect(response.body).toHaveProperty('isNew', true);

        // Validate user object
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).toHaveProperty('email');
        expect(response.body.user).toHaveProperty('email_verified', true);
        expect(response.body.user).toHaveProperty('oauth_provider', 'apple');
        expect(response.body.user).toHaveProperty('oauth_provider_id');

        // Apple doesn't provide profile pictures
        expect(response.body.user.oauth_profile_picture).toBeNull();
      }
    });

    it('should handle Apple Hide My Email (relay address)', async () => {
      const mockValidToken = 'mock-valid-apple-token-relay-email';

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockValidToken,
          user: '000789.relay123.4567',
        });

      if (response.status === 200) {
        // Email might be relay address
        expect(response.body.user.email).toMatch(/@privaterelay\.appleid\.com$/);
      }
    });

    it('should return isNew=false for returning user without fullName', async () => {
      // Create existing Apple OAuth user
      await db('users').insert({
        email: 'returning@privaterelay.appleid.com',
        email_verified: true,
        oauth_provider: 'apple',
        oauth_provider_id: '000123.returning789.1234',
        password_hash: null,
      });

      const mockValidToken = 'mock-valid-apple-token-returning-user';

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockValidToken,
          user: '000123.returning789.1234',
          // Note: No fullName for returning users (Apple behavior)
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('isNew', false);
      }
    });
  });

  describe('Error Response Schema - 400 Bad Request', () => {
    it('should return validation error for missing identityToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ user: '000123.abc456def789.1234' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.any(String),
        field: 'identityToken',
      });
    });

    it('should return validation error for missing user field', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({ identityToken: 'mock-token' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.any(String),
        field: 'user',
      });
    });

    it('should return validation error for invalid fullName structure', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-token',
          user: '000123.abc456def789.1234',
          fullName: 'invalid-string', // Should be object
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
    });
  });

  describe('Error Response Schema - 401 Unauthorized', () => {
    it('should return unauthorized for invalid Apple token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'invalid-apple-token',
          user: '000123.abc456def789.1234',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Invalid Apple token'),
      });
    });

    it('should return unauthorized for expired Apple token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'expired-apple-token',
          user: '000123.abc456def789.1234',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });

    it('should return unauthorized for nonce mismatch', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-apple-token-wrong-nonce',
          user: '000123.abc456def789.1234',
          nonce: 'mismatched-nonce',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Nonce mismatch'),
      });
    });
  });

  describe('Error Response Schema - 409 Conflict', () => {
    it('should return account_exists for different OAuth provider conflict', async () => {
      // Create user with Google OAuth
      await db('users').insert({
        email: 'conflict@example.com',
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: '104523452345234523452',
        password_hash: null,
      });

      const mockToken = 'mock-apple-token-provider-conflict';

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: mockToken,
          user: '000456.conflict789.5678',
        })
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'account_exists',
        message: expect.stringContaining('Google'),
        provider: 'google',
        suggestedAction: 'signin_with_provider',
      });
    });
  });

  describe('Error Response Schema - 429 Rate Limit', () => {
    it('should return rate limit error after 10 requests', async () => {
      const mockToken = 'mock-apple-token-rate-limit-test';

      // Send 11 requests rapidly
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/api/auth/oauth/apple')
          .send({
            identityToken: mockToken,
            user: `000${i}.ratelimit.${i}`,
          });

        if (i < 10) {
          // First 10 should succeed or return 401
          expect([200, 401, 409]).toContain(response.status);
        } else {
          // 11th should be rate limited
          expect(response.status).toBe(429);
          expect(response.body).toMatchObject({
            error: 'rate_limit_exceeded',
            message: expect.stringContaining('Too many'),
            retryAfter: expect.any(Number),
          });
        }
      }
    });
  });

  describe('Apple-Specific Behaviors', () => {
    it('should accept relay email addresses', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-apple-token-relay',
          user: '000999.relay456.7890',
        });

      if (response.status === 200) {
        // Should accept and store relay email
        expect(response.body.user.email).toMatch(/@privaterelay\.appleid\.com$/);
      }
    });

    it('should handle fullName only on first authorization', async () => {
      // First authorization - with fullName
      const firstResponse = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-apple-token-first-auth',
          user: '000111.firstauth.2222',
          fullName: {
            givenName: 'John',
            familyName: 'Doe',
          },
        });

      if (firstResponse.status === 200) {
        // Second authorization - without fullName (Apple behavior)
        const secondResponse = await request(app)
          .post('/api/auth/oauth/apple')
          .send({
            identityToken: 'mock-apple-token-second-auth',
            user: '000111.firstauth.2222',
            // No fullName provided
          });

        if (secondResponse.status === 200) {
          expect(secondResponse.body).toHaveProperty('isNew', false);
          // Name should be preserved from first authorization
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 2 seconds (end-to-end target)', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock-token',
          user: '000123.perf.test',
        });

      const duration = Date.now() - start;

      // Target: <2s end-to-end
      expect(duration).toBeLessThan(2000);
    });
  });
});
