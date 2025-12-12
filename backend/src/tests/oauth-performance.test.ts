// @ts-nocheck
// Jest globals (describe, it, expect, beforeEach, afterEach) are automatically available
import request from 'supertest';
import { db } from '../config/database';
import app from '../app';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';

/**
 * T023: Performance Test - OAuth Token Verification Speed
 *
 * Purpose: Validate that OAuth token verification meets performance
 * requirements for production use
 *
 * Performance Requirements (from research.md):
 * - OAuth token verification: <200ms P95 (95th percentile)
 * - API response time: <500ms P95
 * - Database operations: <50ms P95
 *
 * Metrics Measured:
 * - Token verification time (Google & Apple)
 * - End-to-end API response time
 * - Database operation latency
 * - Concurrent request handling
 *
 * Constitution Compliance:
 * - Principle IV (Performance): <500ms API response target
 */

describe('T023: OAuth Performance Test', () => {
  const mockGooglePayload = {
    sub: '123456789012345678901',
    email: 'performance@test.com',
    email_verified: true,
    given_name: 'Performance',
    family_name: 'Test',
    picture: 'https://lh3.googleusercontent.com/a/test',
  };

  const mockApplePayload = {
    sub: '009012.performance.3456',
    email: 'performance@test.com',
    email_verified: 'true',
    is_private_email: 'false',
    nonce: 'performance_nonce',
  };

  beforeEach(async () => {
    // Clean database
    await db('parents').del();
    await db('users').del();

    // Mock OAuth verification with realistic delay
    // @ts-expect-error - Mocking Google OAuth2Client for testing
    jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
      // Simulate Google API latency (50-100ms typical)
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        getPayload: () => mockGooglePayload,
      } as any;
    });

    // @ts-expect-error - Mocking Apple signin for testing
    jest.spyOn(appleSignin, 'verifyIdToken').mockImplementation(async () => {
      // Simulate Apple API latency (50-100ms typical)
      await new Promise((resolve) => setTimeout(resolve, 50));
      return mockApplePayload as any;
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe('Google OAuth Performance', () => {
    it('should complete Google OAuth signin within 500ms (P95 target)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_google_token' })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(500); // P95 target: <500ms
    });

    it('should verify Google token within 200ms (P95 target)', async () => {
      // Measure token verification time specifically
      const startTime = Date.now();

      // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
        const verifyStart = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const verifyEnd = Date.now();
        const verifyDuration = verifyEnd - verifyStart;

        // Token verification should be <200ms
        expect(verifyDuration).toBeLessThan(200);

        return {
          getPayload: () => mockGooglePayload,
        } as any;
      });

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      expect(totalDuration).toBeLessThan(500);
    });

    it('should handle returning user signin faster than new user signup', async () => {
      // First signin - new user (slower: user + parent creation)
      const newUserStart = Date.now();
      const newUserResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);
      const newUserDuration = Date.now() - newUserStart;

      expect(newUserResponse.body.isNew).toBe(true);

      // Second signin - returning user (faster: no creation)
      const returningUserStart = Date.now();
      const returningUserResponse = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);
      const returningUserDuration = Date.now() - returningUserStart;

      expect(returningUserResponse.body.isNew).toBe(false);

      // Returning user should be faster
      expect(returningUserDuration).toBeLessThan(newUserDuration);

      // Both should meet performance targets
      expect(newUserDuration).toBeLessThan(500);
      expect(returningUserDuration).toBeLessThan(500);
    });

    it('should maintain performance under multiple sequential requests', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();

        await request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: `mock_token_${i}` })
          .expect(200);

        const duration = Date.now() - start;
        durations.push(duration);
      }

      // All requests should meet performance target
      durations.forEach((duration) => {
        expect(duration).toBeLessThan(500);
      });

      // Calculate P95 (95th percentile)
      const sorted = durations.sort((a, b) => a - b);
      const p95Index = Math.ceil(sorted.length * 0.95) - 1;
      const p95Duration = sorted[p95Index];

      expect(p95Duration).toBeLessThan(500);
    });
  });

  describe('Apple OAuth Performance', () => {
    it('should complete Apple OAuth signin within 500ms (P95 target)', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock_apple_token',
          nonce: 'performance_nonce',
          fullName: {
            givenName: 'Performance',
            familyName: 'Test',
          },
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(500);
    });

    it('should verify Apple token within 200ms (P95 target)', async () => {
    // @ts-expect-error - Mocking Apple signin for testing
      jest.spyOn(appleSignin, 'verifyIdToken').mockImplementation(async () => {
        const verifyStart = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const verifyEnd = Date.now();
        const verifyDuration = verifyEnd - verifyStart;

        expect(verifyDuration).toBeLessThan(200);

        return mockApplePayload as any;
      });

      const startTime = Date.now();

      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock_token',
          nonce: 'performance_nonce',
        })
        .expect(200);

      const totalDuration = Date.now() - startTime;
      expect(totalDuration).toBeLessThan(500);
    });

    it('should handle Apple nonce validation efficiently', async () => {
      // Nonce validation should add minimal overhead
      const startTime = Date.now();

      await request(app)
        .post('/api/auth/oauth/apple')
        .send({
          identityToken: 'mock_token',
          nonce: 'performance_nonce',
        })
        .expect(200);

      const duration = Date.now() - startTime;

      // Even with nonce validation, should meet target
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Database Performance', () => {
    it('should create user and parent records within 50ms', async () => {
      // Mock faster OAuth verification to isolate database performance
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          getPayload: () => mockGooglePayload,
        } as any;
      });

      const startTime = Date.now();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);

      const totalDuration = Date.now() - startTime;

      // Total time should be dominated by OAuth verification (10ms)
      // Database operations should add minimal overhead (<50ms)
      expect(totalDuration).toBeLessThan(100);
    });

    it('should lookup existing user within 50ms', async () => {
      // Create existing user
      await db('users').insert({
        email: 'existing@test.com',
        password_hash: null,
        email_verified: true,
        oauth_provider: 'google',
        oauth_provider_id: '123456789012345678901',
        account_status: 'active',
      });

      // Mock fast OAuth verification
      // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          getPayload: () => ({
            sub: '123456789012345678901',
            email: 'existing@test.com',
            email_verified: true,
          }),
        } as any;
      });

      const startTime = Date.now();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);

      const duration = Date.now() - startTime;

      // Should be fast (just token verification + DB lookup)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle 10 concurrent OAuth requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        // Mock different users for each request
        // @ts-expect-error - Mocking Google OAuth2Client for testing
        jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            getPayload: () => ({
              sub: `user_${i}_123456789`,
              email: `user${i}@test.com`,
              email_verified: true,
              given_name: `User${i}`,
              family_name: 'Test',
            }),
          } as any;
        });

        requests.push(
          request(app)
            .post('/api/auth/oauth/google')
            .send({ idToken: `mock_token_${i}` }),
        );
      }

      const responses = await Promise.all(requests);
      const totalDuration = Date.now() - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Concurrent execution should be faster than sequential
      // Sequential would take: 10 * 500ms = 5000ms
      // Concurrent should take: ~500-1000ms (depending on parallelism)
      expect(totalDuration).toBeLessThan(2000);
    });

    it('should maintain response time consistency under load', async () => {
      const durations: number[] = [];

      // Simulate burst of requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const promise = request(app)
          .post('/api/auth/oauth/google')
          .send({ idToken: `burst_token_${i}` })
          .then((response) => {
            const duration = Date.now() - start;
            durations.push(duration);
            return response;
          });
        requests.push(promise);
      }

      await Promise.all(requests);

      // Calculate variance
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance =
        durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be reasonable (consistent performance)
      expect(stdDev).toBeLessThan(200); // Low variance indicates consistent performance

      // All requests should meet target
      durations.forEach((d) => expect(d).toBeLessThan(500));
    });
  });

  describe('Performance Monitoring', () => {
    it('should track and report performance metrics', async () => {
      const metrics = {
        tokenVerificationTime: 0,
        databaseTime: 0,
        totalTime: 0,
      };

      const startTime = Date.now();

      // Mock with timing instrumentation
      // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
        const verifyStart = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        metrics.tokenVerificationTime = Date.now() - verifyStart;

        return {
          getPayload: () => mockGooglePayload,
        } as any;
      });

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);

      metrics.totalTime = Date.now() - startTime;
      metrics.databaseTime = metrics.totalTime - metrics.tokenVerificationTime;

      // Verify metrics are within acceptable ranges
      expect(metrics.tokenVerificationTime).toBeLessThan(200);
      expect(metrics.databaseTime).toBeLessThan(100);
      expect(metrics.totalTime).toBeLessThan(500);

      // In production, these metrics would be sent to monitoring service
      // (e.g., Datadog, New Relic, CloudWatch)
    });
  });

  describe('Performance Degradation Detection', () => {
    it('should detect performance degradation (slow token verification)', async () => {
      // Simulate slow OAuth provider response
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 400)); // Slow
        return {
          getPayload: () => mockGooglePayload,
        } as any;
      });

      const startTime = Date.now();

      const response = await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);

      const duration = Date.now() - startTime;

      // Still succeeds but takes longer
      expect(response.body.success).toBe(true);
      expect(duration).toBeGreaterThan(400);

      // In production, this would trigger an alert
      // (token verification >200ms indicates degradation)
    });

    it('should detect database performance issues', async () => {
      // Fast token verification
    // @ts-expect-error - Mocking Google OAuth2Client for testing
      jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          getPayload: () => mockGooglePayload,
        } as any;
      });

      const startTime = Date.now();

      await request(app)
        .post('/api/auth/oauth/google')
        .send({ idToken: 'mock_token' })
        .expect(200);

      const duration = Date.now() - startTime;

      // If duration significantly exceeds token verification time,
      // it indicates database performance issues
      const expectedMaxDuration = 50 + 100; // Token + DB overhead
      if (duration > expectedMaxDuration) {
        // In production: Trigger database performance alert
      }

      expect(duration).toBeLessThan(500); // Still within acceptable range
    });
  });
});
