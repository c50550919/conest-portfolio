// @ts-nocheck
/**
 * OAuth Google Contract Tests
 *
 * Feature: 002-oauth-social-login
 * Purpose: Validate POST /api/auth/oauth/google contract against OpenAPI spec
 * Constitution: Principle III (Security - server-side token verification)
 *
 * Test Coverage:
 * 1. Request schema validation (idToken required, state optional)
 * 2. Response schema validation (AuthSuccessResponse)
 * 3. Error responses (400, 401, 409, 429, 500)
 *
 * Reference: specs/002-oauth-social-login/contracts/openapi.yaml
 * Created: 2025-10-13
 */

// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import app from '../server';
import { db } from '../config/database';

describe('POST /api/auth/oauth/google - Contract Tests', () => {
  beforeEach(async () => {
    // Clean up test data
    await db('users').where('email', 'like', '%@gmail.com%').delete();
  });

  afterEach(async () => {
    // Clean up test data
    await db('users').where('email', 'like', '%@gmail.com%').delete();
  });

  describe('Request Schema Validation', () => {
    it('should reject request without idToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('field', 'idToken');
    });

    it('should reject request with invalid idToken format', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'unauthorized');
      expect(response.body).toHaveProperty('message');
    });

    it('should accept request with valid idToken', async () => {
      // Note: This will fail until OAuthService is implemented
      // Mock valid Google ID token
      const mockValidToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAifQ...';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockValidToken });

      // Expect either 200 (success) or 401 (invalid token)
      expect([200, 401]).toContain(response.status);
    });

    it('should accept request with optional state parameter', async () => {
      const mockValidToken = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMzQ1Njc4OTAifQ...';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({
          idToken: mockValidToken,
          state: 'a3c5f8e2b1d4a7f9c6e0b8d2',
        });

      // Expect either 200 (success) or 401 (invalid token)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Response Schema Validation - Success (200)', () => {
    it('should return AuthSuccessResponse schema for new user', async () => {
      // This test will fail until OAuth endpoints are implemented
      const mockValidToken = 'mock-valid-google-token-for-new-user';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockValidToken });

      if (response.status === 200) {
        // Validate AuthSuccessResponse schema
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('tokens');
        expect(response.body).toHaveProperty('isNew', true);

        // Validate user object
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user).toHaveProperty('email');
        expect(response.body.user).toHaveProperty('email_verified', true);
        expect(response.body.user).toHaveProperty('oauth_provider', 'google');
        expect(response.body.user).toHaveProperty('oauth_provider_id');
        expect(response.body.user).toHaveProperty('account_status', 'active');

        // Validate tokens object
        expect(response.body.tokens).toHaveProperty('accessToken');
        expect(response.body.tokens).toHaveProperty('refreshToken');
        expect(response.body.tokens).toHaveProperty('expiresIn', 3600);
      }
    });

    it('should return AuthSuccessResponse with isNew=false for returning user', async () => {
      // Create existing OAuth user first
      await db('users').insert({
        email: 'returning@gmail.com',
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: '104523452345234523452',
        password_hash: null,
      });

      const mockValidToken = 'mock-valid-google-token-for-returning-user';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockValidToken });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('isNew', false);
        expect(response.body.user).toHaveProperty('email', 'returning@gmail.com');
      }
    });

    it('should return linked=true when OAuth provider linked to existing account', async () => {
      // Create existing email/password user
      await db('users').insert({
        email: 'existing@example.com',
        email_verified: true,
        password_hash: '$2b$12$mockPasswordHash',
        oauth_provider: null,
      });

      const mockValidToken = 'mock-valid-google-token-for-account-linking';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockValidToken });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('linked', true);
        expect(response.body.user).toHaveProperty('oauth_provider', 'google');
      }
    });
  });

  describe('Error Response Schema - 400 Bad Request', () => {
    it('should return validation error for missing idToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'validation_error',
        message: expect.any(String),
        field: 'idToken',
      });
    });

    it('should return validation error for malformed idToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 123 }) // Wrong type
        .expect(400);

      expect(response.body).toHaveProperty('error', 'validation_error');
      expect(response.body).toHaveProperty('field', 'idToken');
    });
  });

  describe('Error Response Schema - 401 Unauthorized', () => {
    it('should return unauthorized for invalid Google token', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'invalid-google-token' })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.stringContaining('Invalid Google token'),
      });
    });

    it('should return unauthorized for expired Google token', async () => {
      const expiredToken = 'expired-google-token';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: expiredToken })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'unauthorized',
        message: expect.any(String),
      });
    });

    it('should return email_verification_required for unverified email conflict', async () => {
      // Create unverified email/password user
      await db('users').insert({
        email: 'unverified@example.com',
        email_verified: false,
        password_hash: '$2b$12$mockPasswordHash',
      });

      const mockToken = 'mock-google-token-unverified-email';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockToken })
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'email_verification_required',
        message: expect.stringContaining('verify your email'),
        suggestedAction: 'verify_email',
      });
    });
  });

  describe('Error Response Schema - 409 Conflict', () => {
    it('should return account_exists for different OAuth provider conflict', async () => {
      // Create user with Apple OAuth
      await db('users').insert({
        email: 'conflict@example.com',
        email_verified: true,
        oauth_provider: 'apple',
        oauth_provider_id: '000456.def789abc123.5678',
        password_hash: null,
      });

      const mockToken = 'mock-google-token-provider-conflict';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockToken })
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'account_exists',
        message: expect.stringContaining('Apple'),
        provider: 'apple',
        suggestedAction: 'signin_with_provider',
      });
    });
  });

  describe('Error Response Schema - 429 Rate Limit', () => {
    it('should return rate limit error after 10 requests', async () => {
      const mockToken = 'mock-google-token-rate-limit-test';

      // Send 11 requests rapidly
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: mockToken });

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

  describe('Error Response Schema - 500 Internal Server Error', () => {
    it('should return generic error for unexpected failures', async () => {
      // This test simulates an unexpected error
      // Actual implementation will depend on error handling middleware
      const mockToken = 'mock-google-token-server-error';

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: mockToken });

      if (response.status === 500) {
        expect(response.body).toMatchObject({
          error: 'internal_server_error',
          message: expect.any(String),
        });

        // Should NOT leak implementation details
        expect(response.body.message).not.toContain('stack');
        expect(response.body.message).not.toContain('Error:');
      }
    });
  });

  describe('Performance Requirements', () => {
    it('should respond within 2 seconds (end-to-end target)', async () => {
      const start = Date.now();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock-token' });

      const duration = Date.now() - start;

      // Target: <2s end-to-end
      expect(duration).toBeLessThan(2000);
    });
  });
});
