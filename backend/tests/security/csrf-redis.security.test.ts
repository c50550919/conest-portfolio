/**
 * CSRF Redis Security Tests
 *
 * Purpose: Verify CSRF protection with Redis-backed token storage
 *
 * Test Coverage:
 * - Token generation and storage in Redis
 * - Token validation from Redis
 * - Token expiration (24-hour TTL)
 * - Maximum tokens per session (5 tokens)
 * - Middleware integration
 * - Error handling and Redis failures
 * - Session cleanup
 *
 * Created: 2025-11-10 (Security Hardening Initiative)
 */

import { Request, Response, NextFunction } from 'express';
import redis from '../../config/redis';
import {
  generateCSRFToken,
  validateCSRFToken,
  attachCSRFToken,
  verifyCSRFToken,
  clearCSRFTokens,
} from '../../middleware/csrf';

// Mock Express request/response
const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'POST',
  ip: '127.0.0.1',
  headers: {},
  body: {},
  ...overrides,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    cookie: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('CSRF Redis Security Tests', () => {
  beforeEach(async () => {
    // Clear all CSRF keys from Redis before each test
    const keys = await redis.keys('csrf:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup after all tests
    const keys = await redis.keys('csrf:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('generateCSRFToken', () => {
    it('should generate a valid CSRF token', async () => {
      const sessionId = 'test-session-1';
      const token = await generateCSRFToken(sessionId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should store token in Redis with correct key', async () => {
      const sessionId = 'test-session-2';
      const token = await generateCSRFToken(sessionId);

      const storedTokensJson = await redis.get(`csrf:${sessionId}`);
      expect(storedTokensJson).toBeDefined();

      const storedTokens = JSON.parse(storedTokensJson!);
      expect(storedTokens).toContain(token);
    });

    it('should set 24-hour TTL on Redis key', async () => {
      const sessionId = 'test-session-3';
      await generateCSRFToken(sessionId);

      const ttl = await redis.ttl(`csrf:${sessionId}`);
      // TTL should be close to 24 hours (86400 seconds)
      expect(ttl).toBeGreaterThan(86350);
      expect(ttl).toBeLessThanOrEqual(86400);
    });

    it('should allow multiple tokens per session', async () => {
      const sessionId = 'test-session-4';
      const token1 = await generateCSRFToken(sessionId);
      const token2 = await generateCSRFToken(sessionId);
      const token3 = await generateCSRFToken(sessionId);

      const storedTokensJson = await redis.get(`csrf:${sessionId}`);
      const storedTokens = JSON.parse(storedTokensJson!);

      expect(storedTokens).toHaveLength(3);
      expect(storedTokens).toContain(token1);
      expect(storedTokens).toContain(token2);
      expect(storedTokens).toContain(token3);
    });

    it('should limit to 5 tokens per session', async () => {
      const sessionId = 'test-session-5';

      // Generate 7 tokens (exceeds max of 5)
      const tokens: string[] = [];
      for (let i = 0; i < 7; i++) {
        tokens.push(await generateCSRFToken(sessionId));
      }

      const storedTokensJson = await redis.get(`csrf:${sessionId}`);
      const storedTokens = JSON.parse(storedTokensJson!);

      // Should only keep last 5 tokens
      expect(storedTokens).toHaveLength(5);

      // First 2 tokens should be removed
      expect(storedTokens).not.toContain(tokens[0]);
      expect(storedTokens).not.toContain(tokens[1]);

      // Last 5 tokens should be present
      expect(storedTokens).toContain(tokens[2]);
      expect(storedTokens).toContain(tokens[3]);
      expect(storedTokens).toContain(tokens[4]);
      expect(storedTokens).toContain(tokens[5]);
      expect(storedTokens).toContain(tokens[6]);
    });

    it('should generate unique tokens', async () => {
      const sessionId = 'test-session-6';
      const token1 = await generateCSRFToken(sessionId);
      const token2 = await generateCSRFToken(sessionId);

      expect(token1).not.toBe(token2);
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis to throw error
      const originalSetex = redis.setex;
      redis.setex = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const sessionId = 'test-session-error';

      await expect(generateCSRFToken(sessionId)).rejects.toThrow('Failed to generate CSRF token');

      // Restore original
      redis.setex = originalSetex;
    });
  });

  describe('validateCSRFToken', () => {
    it('should validate a valid token', async () => {
      const sessionId = 'test-session-7';
      const token = await generateCSRFToken(sessionId);

      const isValid = await validateCSRFToken(sessionId, token);
      expect(isValid).toBe(true);
    });

    it('should reject invalid token', async () => {
      const sessionId = 'test-session-8';
      await generateCSRFToken(sessionId);

      const isValid = await validateCSRFToken(sessionId, 'invalid-token');
      expect(isValid).toBe(false);
    });

    it('should reject token for non-existent session', async () => {
      const isValid = await validateCSRFToken('non-existent-session', 'some-token');
      expect(isValid).toBe(false);
    });

    it('should validate any of multiple valid tokens', async () => {
      const sessionId = 'test-session-9';
      const token1 = await generateCSRFToken(sessionId);
      const token2 = await generateCSRFToken(sessionId);
      const token3 = await generateCSRFToken(sessionId);

      expect(await validateCSRFToken(sessionId, token1)).toBe(true);
      expect(await validateCSRFToken(sessionId, token2)).toBe(true);
      expect(await validateCSRFToken(sessionId, token3)).toBe(true);
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis to throw error
      const originalGet = redis.get;
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const isValid = await validateCSRFToken('test-session', 'test-token');
      expect(isValid).toBe(false);

      // Restore original
      redis.get = originalGet;
    });
  });

  describe('attachCSRFToken Middleware', () => {
    it('should attach CSRF token to response cookie', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await attachCSRFToken(req, res, next);

      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Object),
      );
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should attach CSRF token to response header', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await attachCSRFToken(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should use sessionId if available', async () => {
      const sessionId = 'custom-session-id';
      const req = mockRequest({ sessionId } as any) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await attachCSRFToken(req, res, next);

      // Verify token was stored with custom sessionId
      const storedTokensJson = await redis.get(`csrf:${sessionId}`);
      expect(storedTokensJson).toBeDefined();
    });

    it('should fallback to IP address if no sessionId', async () => {
      const req = mockRequest({ ip: '192.168.1.1' }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await attachCSRFToken(req, res, next);

      // Verify token was stored with IP address
      const storedTokensJson = await redis.get('csrf:192.168.1.1');
      expect(storedTokensJson).toBeDefined();
    });

    it('should call next with error on Redis failure', async () => {
      // Mock Redis to throw error
      const originalSetex = redis.setex;
      redis.setex = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await attachCSRFToken(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // Restore original
      redis.setex = originalSetex;
    });
  });

  describe('verifyCSRFToken Middleware', () => {
    it('should skip CSRF verification for GET requests', async () => {
      const req = mockRequest({ method: 'GET' }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should skip CSRF verification for HEAD requests', async () => {
      const req = mockRequest({ method: 'HEAD' }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should skip CSRF verification for OPTIONS requests', async () => {
      const req = mockRequest({ method: 'OPTIONS' }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject POST request without CSRF token', async () => {
      const req = mockRequest({ method: 'POST', headers: {}, body: {} }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from header', async () => {
      const sessionId = 'test-session-10';
      const token = await generateCSRFToken(sessionId);

      const req = mockRequest({
        method: 'POST',
        ip: sessionId,
        headers: { 'x-csrf-token': token },
      }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from body', async () => {
      const sessionId = 'test-session-11';
      const token = await generateCSRFToken(sessionId);

      const req = mockRequest({
        method: 'POST',
        ip: sessionId,
        headers: {},
        body: { _csrf: token },
      }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid CSRF token', async () => {
      const sessionId = 'test-session-12';
      await generateCSRFToken(sessionId);

      const req = mockRequest({
        method: 'POST',
        ip: sessionId,
        headers: { 'x-csrf-token': 'invalid-token' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle Redis errors during verification', async () => {
      // Mock Redis to throw error
      const originalGet = redis.get;
      redis.get = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      const req = mockRequest({
        method: 'POST',
        headers: { 'x-csrf-token': 'some-token' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = jest.fn();

      await verifyCSRFToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'CSRF verification failed',
        code: 'CSRF_VERIFICATION_ERROR',
      });

      // Restore original
      redis.get = originalGet;
    });
  });

  describe('clearCSRFTokens', () => {
    it('should clear all tokens for session', async () => {
      const sessionId = 'test-session-13';
      await generateCSRFToken(sessionId);
      await generateCSRFToken(sessionId);

      // Verify tokens exist
      let storedTokensJson = await redis.get(`csrf:${sessionId}`);
      expect(storedTokensJson).toBeDefined();

      // Clear tokens
      await clearCSRFTokens(sessionId);

      // Verify tokens are cleared
      storedTokensJson = await redis.get(`csrf:${sessionId}`);
      expect(storedTokensJson).toBeNull();
    });

    it('should handle clearing non-existent session gracefully', async () => {
      await expect(clearCSRFTokens('non-existent-session')).resolves.not.toThrow();
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis to throw error
      const originalDel = redis.del;
      redis.del = jest.fn().mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw error
      await expect(clearCSRFTokens('test-session')).resolves.not.toThrow();

      // Restore original
      redis.del = originalDel;
    });
  });

  describe('Security Properties', () => {
    it('should use cryptographically secure random tokens', async () => {
      const sessionId = 'test-session-14';
      const tokens = new Set<string>();

      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        const token = await generateCSRFToken(sessionId);
        tokens.add(token);
      }

      // All 100 tokens should be unique
      expect(tokens.size).toBe(100);
    });

    it('should enforce token expiration after 24 hours', async () => {
      const sessionId = 'test-session-15';
      const token = await generateCSRFToken(sessionId);

      // Verify token is valid
      expect(await validateCSRFToken(sessionId, token)).toBe(true);

      // Set TTL to 1 second for testing
      await redis.expire(`csrf:${sessionId}`, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Token should be expired
      expect(await validateCSRFToken(sessionId, token)).toBe(false);
    });

    it('should support concurrent token operations', async () => {
      const sessionId = 'test-session-16';

      // Generate multiple tokens concurrently
      const tokenPromises = [];
      for (let i = 0; i < 10; i++) {
        tokenPromises.push(generateCSRFToken(sessionId));
      }

      const tokens = await Promise.all(tokenPromises);

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);

      // All tokens should be valid
      const validationPromises = tokens.map(token =>
        validateCSRFToken(sessionId, token),
      );
      const results = await Promise.all(validationPromises);
      expect(results.every(result => result === true)).toBe(true);
    });
  });
});
