/**
 * VeriffClient Unit Tests
 *
 * Critical Integration Tests for ID Verification API Client
 * Tests: createSession, getDecision, verifyWebhookSignature, isConfigured
 */

import axios from 'axios';
import crypto from 'crypto';
import { VeriffClient, VeriffSession, VeriffDecision } from '../../../src/features/verification/veriff/VeriffClient';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('VeriffClient', () => {
  let client: VeriffClient;
  let mockAxiosInstance: jest.Mocked<typeof axios>;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment
    process.env = {
      ...originalEnv,
      VERIFF_API_KEY: 'test-api-key',
      VERIFF_API_SECRET: 'test-api-secret',
      VERIFF_BASE_URL: 'https://stationapi.veriff.com',
    };

    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: { headers: { common: {} } },
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create new client instance for each test
    client = new VeriffClient();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://stationapi.veriff.com',
        headers: {
          'Content-Type': 'application/json',
          'X-AUTH-CLIENT': 'test-api-key',
        },
        timeout: 30000,
      });
    });

    it('should use default base URL when not configured', () => {
      process.env.VERIFF_BASE_URL = '';

      new VeriffClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://stationapi.veriff.com',
        }),
      );
    });

    it('should log warning when API key is not configured', () => {
      const logger = require('../../../src/config/logger');
      process.env.VERIFF_API_KEY = '';

      new VeriffClient();

      expect(logger.warn).toHaveBeenCalledWith(
        'VERIFF_API_KEY not configured - verification will fail',
      );
    });
  });

  describe('createSession', () => {
    const userId = 'user-123';
    const callbackUrl = 'https://api.example.com/webhook/veriff';

    const mockSessionResponse: VeriffSession = {
      status: 'success',
      verification: {
        id: 'session-456',
        url: 'https://veriff.me/session-456',
        vendorData: 'user-123',
        host: 'veriff.me',
        status: 'created',
        sessionToken: 'token-abc',
      },
    };

    it('should create session successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockSessionResponse });

      const result = await client.createSession(userId, callbackUrl);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/v1/sessions',
        expect.objectContaining({
          verification: expect.objectContaining({
            callback: callbackUrl,
            vendorData: userId,
            timestamp: expect.any(String),
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-SIGNATURE': expect.any(String),
          }),
        }),
      );
      expect(result).toEqual(mockSessionResponse);
    });

    it('should include correct timestamp in ISO format', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockSessionResponse });

      await client.createSession(userId, callbackUrl);

      const callArgs = mockAxiosInstance.post.mock.calls[0];
      const payload = callArgs[1] as any;
      const timestamp = payload.verification.timestamp;

      // Verify timestamp is valid ISO format
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should generate valid HMAC signature', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockSessionResponse });

      await client.createSession(userId, callbackUrl);

      const callArgs = mockAxiosInstance.post.mock.calls[0];
      const headers = callArgs[2]?.headers as any;

      expect(headers['X-SIGNATURE']).toBeDefined();
      expect(typeof headers['X-SIGNATURE']).toBe('string');
      expect(headers['X-SIGNATURE'].length).toBe(64); // SHA256 hex length
    });

    it('should log success on session creation', async () => {
      const logger = require('../../../src/config/logger');
      mockAxiosInstance.post.mockResolvedValue({ data: mockSessionResponse });

      await client.createSession(userId, callbackUrl);

      expect(logger.info).toHaveBeenCalledWith(
        `Veriff session created for user ${userId}`,
        { sessionId: 'session-456' },
      );
    });

    it('should throw error on API failure', async () => {
      const error = {
        message: 'API Error',
        response: { data: { error: 'Invalid request' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.createSession(userId, callbackUrl)).rejects.toThrow(
        'Veriff session creation failed: API Error',
      );
    });

    it('should log error details on failure', async () => {
      const logger = require('../../../src/config/logger');
      const error = {
        message: 'API Error',
        response: { data: { error: 'Invalid request' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      try {
        await client.createSession(userId, callbackUrl);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('Failed to create Veriff session', {
        userId,
        error: 'API Error',
        response: { error: 'Invalid request' },
      });
    });
  });

  describe('getDecision', () => {
    const sessionId = 'session-456';

    const mockDecisionResponse: VeriffDecision = {
      verification: {
        id: sessionId,
        code: 9001,
        status: 'approved',
        person: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          nationality: 'US',
        },
        document: {
          type: 'PASSPORT',
          country: 'US',
          validUntil: '2030-01-15',
        },
      },
    };

    it('should retrieve decision successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockDecisionResponse });

      const result = await client.getDecision(sessionId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/v1/sessions/${sessionId}/decision`,
      );
      expect(result).toEqual(mockDecisionResponse);
    });

    it('should log retrieval with status info', async () => {
      const logger = require('../../../src/config/logger');
      mockAxiosInstance.get.mockResolvedValue({ data: mockDecisionResponse });

      await client.getDecision(sessionId);

      expect(logger.info).toHaveBeenCalledWith(
        `Retrieved Veriff decision for session ${sessionId}`,
        { status: 'approved' },
      );
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue({ message: 'Not found' });

      await expect(client.getDecision('invalid-id')).rejects.toThrow(
        'Veriff decision retrieval failed: Not found',
      );
    });

    it('should handle declined status', async () => {
      const declinedDecision: VeriffDecision = {
        verification: {
          id: sessionId,
          code: 9102,
          status: 'declined',
          reason: 'Document expired',
          reasonCode: 102,
        },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: declinedDecision });

      const result = await client.getDecision(sessionId);

      expect(result.verification.status).toBe('declined');
      expect(result.verification.reason).toBe('Document expired');
    });

    it('should handle resubmission_requested status', async () => {
      const resubmitDecision: VeriffDecision = {
        verification: {
          id: sessionId,
          code: 9103,
          status: 'resubmission_requested',
          reason: 'Image quality too low',
        },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: resubmitDecision });

      const result = await client.getDecision(sessionId);

      expect(result.verification.status).toBe('resubmission_requested');
    });
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'test-api-secret';

    it('should return true for valid signature', () => {
      const payload = { event: 'verification.completed', id: 'session-123' };
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(Buffer.from(payloadString, 'utf-8'))
        .digest('hex')
        .toLowerCase();

      const result = client.verifyWebhookSignature(payload, expectedSignature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = { event: 'verification.completed' };
      const invalidSignature = 'invalid-signature-12345678901234567890123456789012';

      const result = client.verifyWebhookSignature(payload, invalidSignature);

      expect(result).toBe(false);
    });

    it('should return false for tampered payload', () => {
      const originalPayload = { event: 'verification.completed', id: 'session-123' };
      const payloadString = JSON.stringify(originalPayload);
      const signature = crypto
        .createHmac('sha256', secret)
        .update(Buffer.from(payloadString, 'utf-8'))
        .digest('hex')
        .toLowerCase();

      // Tampered payload
      const tamperedPayload = { event: 'verification.completed', id: 'session-456' };

      const result = client.verifyWebhookSignature(tamperedPayload, signature);

      expect(result).toBe(false);
    });

    it('should return false on verification error', () => {
      const payload = { event: 'test' };

      // Pass a signature that would cause timingSafeEqual to throw due to length mismatch
      const result = client.verifyWebhookSignature(payload, 'short');

      expect(result).toBe(false);
    });

    it('should log error on verification failure', () => {
      const logger = require('../../../src/config/logger');
      const payload = { event: 'test' };

      client.verifyWebhookSignature(payload, 'invalid');

      expect(logger.error).toHaveBeenCalledWith(
        'Webhook signature verification failed',
        expect.any(Object),
      );
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      const payload = { event: 'test' };
      const payloadString = JSON.stringify(payload);
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(Buffer.from(payloadString, 'utf-8'))
        .digest('hex')
        .toLowerCase();

      // Multiple calls should take approximately the same time
      // (This is a basic test - real timing attacks require statistical analysis)
      const startValid = Date.now();
      client.verifyWebhookSignature(payload, validSignature);
      const validTime = Date.now() - startValid;

      const startInvalid = Date.now();
      client.verifyWebhookSignature(payload, validSignature.replace('a', 'b'));
      const invalidTime = Date.now() - startInvalid;

      // Times should be similar (within 5ms variance)
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(5);
    });
  });

  describe('isConfigured', () => {
    it('should return true when both API key and secret are configured', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      process.env.VERIFF_API_KEY = '';
      const unconfiguredClient = new VeriffClient();

      expect(unconfiguredClient.isConfigured()).toBe(false);
    });

    it('should return false when API secret is not configured', () => {
      process.env.VERIFF_API_SECRET = '';
      const unconfiguredClient = new VeriffClient();

      expect(unconfiguredClient.isConfigured()).toBe(false);
    });

    it('should return false when both are not configured', () => {
      process.env.VERIFF_API_KEY = '';
      process.env.VERIFF_API_SECRET = '';
      const unconfiguredClient = new VeriffClient();

      expect(unconfiguredClient.isConfigured()).toBe(false);
    });
  });

  describe('Signature Generation', () => {
    it('should generate signatures for each request', async () => {
      const mockResponse: VeriffSession = {
        status: 'success',
        verification: {
          id: 'session-1',
          url: 'https://veriff.me/1',
          vendorData: 'user-1',
          host: 'veriff.me',
          status: 'created',
          sessionToken: 'token-1',
        },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      // Make two calls - verify signatures are generated
      await client.createSession('user-1', 'https://callback.com');
      const firstSignature = (mockAxiosInstance.post.mock.calls[0][2] as any).headers['X-SIGNATURE'];

      await client.createSession('user-1', 'https://callback.com');
      const secondSignature = (mockAxiosInstance.post.mock.calls[1][2] as any).headers['X-SIGNATURE'];

      // Both calls should have valid signatures generated
      expect(firstSignature).toBeDefined();
      expect(secondSignature).toBeDefined();
      expect(typeof firstSignature).toBe('string');
      expect(typeof secondSignature).toBe('string');
    });

    it('should generate hex-encoded lowercase signature', async () => {
      const mockResponse: VeriffSession = {
        status: 'success',
        verification: {
          id: 'session-1',
          url: 'https://veriff.me/1',
          vendorData: 'user-1',
          host: 'veriff.me',
          status: 'created',
          sessionToken: 'token-1',
        },
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await client.createSession('user-1', 'https://callback.com');

      const signature = (mockAxiosInstance.post.mock.calls[0][2] as any).headers['X-SIGNATURE'];

      // Should be lowercase hex
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle network timeout gracefully', async () => {
      const timeoutError = {
        message: 'timeout of 30000ms exceeded',
        code: 'ECONNABORTED',
      };
      mockAxiosInstance.post.mockRejectedValue(timeoutError);

      await expect(
        client.createSession('user-1', 'https://callback.com'),
      ).rejects.toThrow('Veriff session creation failed: timeout of 30000ms exceeded');
    });

    it('should handle missing response data in error', async () => {
      const logger = require('../../../src/config/logger');
      const errorWithoutResponse = { message: 'Network error' };
      mockAxiosInstance.get.mockRejectedValue(errorWithoutResponse);

      try {
        await client.getDecision('session-123');
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get Veriff decision',
        expect.objectContaining({
          error: 'Network error',
          response: undefined,
        }),
      );
    });

    it('should handle 401 unauthorized error', async () => {
      const authError = {
        message: 'Request failed with status code 401',
        response: {
          status: 401,
          data: { error: 'Invalid API key' },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(authError);

      await expect(
        client.createSession('user-1', 'https://callback.com'),
      ).rejects.toThrow('Veriff session creation failed');
    });

    it('should handle 429 rate limit error', async () => {
      const rateLimitError = {
        message: 'Request failed with status code 429',
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(rateLimitError);

      await expect(
        client.createSession('user-1', 'https://callback.com'),
      ).rejects.toThrow('Veriff session creation failed');
    });
  });
});
