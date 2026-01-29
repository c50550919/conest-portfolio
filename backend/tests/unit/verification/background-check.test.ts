/**
 * Integration Test: Background Check via Certn
 *
 * Tests the background check flow including:
 * - CertnClient API methods
 * - Webhook signature verification (HMAC-SHA256)
 * - Status parsing (CLEAR, CONSIDER, ADJUDICATION, SUSPENDED)
 * - Replay attack protection
 * - Flagged records extraction
 * - Production mode enforcement
 *
 * TASK-W1-03: Certn Background Check Live
 */

import crypto from 'crypto';
import axios from 'axios';
import { CertnClient } from '../features/verification/certn/CertnClient';
import logger from '../config/logger';

// Mock axios for Certn API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to capture audit logs
jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Background Check Integration', () => {
  const mockApplicantId = 'applicant-123';
  const mockApplicationId = 'application-456';
  const mockWebhookSecret = 'test-webhook-secret-32-characters';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CertnClient Configuration', () => {
    it('should detect when Certn is not configured', () => {
      delete process.env.CERTN_API_KEY;
      const client = new CertnClient();
      expect(client.isConfigured()).toBe(false);
    });

    it('should detect when Certn is configured', () => {
      process.env.CERTN_API_KEY = 'test-api-key';
      const client = new CertnClient();
      expect(client.isConfigured()).toBe(true);
    });

    it('should detect when webhook secret is not configured', () => {
      delete process.env.CERTN_WEBHOOK_SECRET;
      const client = new CertnClient();
      expect(client.isWebhookSecretConfigured()).toBe(false);
    });

    it('should detect when webhook secret is configured', () => {
      process.env.CERTN_WEBHOOK_SECRET = mockWebhookSecret;
      const client = new CertnClient();
      expect(client.isWebhookSecretConfigured()).toBe(true);
    });
  });

  describe('Status Parsing', () => {
    let client: CertnClient;

    beforeEach(() => {
      process.env.CERTN_API_KEY = 'test-api-key';
      client = new CertnClient();
    });

    it('should parse CLEAR status as approved', () => {
      expect(client.parseStatus('CLEAR')).toBe('approved');
    });

    it('should parse CONSIDER status as consider', () => {
      expect(client.parseStatus('CONSIDER')).toBe('consider');
    });

    it('should parse ADJUDICATION status as consider', () => {
      expect(client.parseStatus('ADJUDICATION')).toBe('consider');
    });

    it('should parse SUSPENDED status as rejected', () => {
      expect(client.parseStatus('SUSPENDED')).toBe('rejected');
    });

    it('should parse unknown status as pending', () => {
      expect(client.parseStatus('UNKNOWN')).toBe('pending');
      expect(client.parseStatus('IN_PROGRESS')).toBe('pending');
      expect(client.parseStatus('')).toBe('pending');
    });
  });

  describe('Flagged Records Extraction', () => {
    let client: CertnClient;

    beforeEach(() => {
      process.env.CERTN_API_KEY = 'test-api-key';
      client = new CertnClient();
    });

    it('should return empty array when no reports', () => {
      const application = {
        id: mockApplicationId,
        applicant_id: mockApplicantId,
        status: 'COMPLETED' as const,
      };
      expect(client.extractFlaggedRecords(application)).toEqual([]);
    });

    it('should return empty array when reports have CLEAR status', () => {
      const application = {
        id: mockApplicationId,
        applicant_id: mockApplicantId,
        status: 'COMPLETED' as const,
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'CLEAR' as const,
            records: [{ type: 'record', description: 'test' }],
          },
        ],
      };
      expect(client.extractFlaggedRecords(application)).toEqual([]);
    });

    it('should extract records from CONSIDER status reports', () => {
      const mockRecords = [
        { type: 'criminal', description: 'Minor offense', date: '2020-01-01' },
        { type: 'civil', description: 'Civil judgment', date: '2019-06-15' },
      ];
      const application = {
        id: mockApplicationId,
        applicant_id: mockApplicantId,
        status: 'COMPLETED' as const,
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'CONSIDER' as const,
            records: mockRecords,
          },
        ],
      };
      expect(client.extractFlaggedRecords(application)).toEqual(mockRecords);
    });

    it('should extract records from ADJUDICATION status reports', () => {
      const mockRecords = [{ type: 'criminal', description: 'Pending review' }];
      const application = {
        id: mockApplicationId,
        applicant_id: mockApplicantId,
        status: 'COMPLETED' as const,
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'ADJUDICATION' as const,
            records: mockRecords,
          },
        ],
      };
      expect(client.extractFlaggedRecords(application)).toEqual(mockRecords);
    });

    it('should combine records from multiple flagged reports', () => {
      const records1 = [{ type: 'criminal', description: 'Record 1' }];
      const records2 = [{ type: 'civil', description: 'Record 2' }];
      const application = {
        id: mockApplicationId,
        applicant_id: mockApplicantId,
        status: 'COMPLETED' as const,
        reports: [
          { id: 'report-1', type: 'criminal', status: 'CONSIDER' as const, records: records1 },
          { id: 'report-2', type: 'civil', status: 'CLEAR' as const, records: [] },
          { id: 'report-3', type: 'other', status: 'ADJUDICATION' as const, records: records2 },
        ],
      };
      expect(client.extractFlaggedRecords(application)).toEqual([...records1, ...records2]);
    });
  });

  describe('Webhook Signature Verification', () => {
    let client: CertnClient;

    beforeEach(() => {
      process.env.CERTN_API_KEY = 'test-api-key';
      process.env.CERTN_WEBHOOK_SECRET = mockWebhookSecret;
      process.env.CERTN_WEBHOOK_TOLERANCE_SECONDS = '300';
      client = new CertnClient();
    });

    afterEach(() => {
      delete process.env.CERTN_WEBHOOK_SECRET;
      delete process.env.CERTN_WEBHOOK_TOLERANCE_SECONDS;
    });

    function generateValidSignature(payload: any, timestamp: number): string {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const signedPayload = `${timestamp}.${payloadString}`;
      const signature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');
      return `t=${timestamp},v1=${signature}`;
    }

    it('should accept valid signature with current timestamp', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = generateValidSignature(payload, timestamp);

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(true);
    });

    it('should accept valid signature with timestamp within tolerance', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const timestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const signatureHeader = generateValidSignature(payload, timestamp);

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(true);
    });

    it('should reject signature with timestamp outside tolerance (replay attack)', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const timestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signatureHeader = generateValidSignature(payload, timestamp);

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Certn webhook rejected: Timestamp outside tolerance',
        expect.any(Object),
      );
    });

    it('should reject invalid signature', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = `t=${timestamp},v1=invalid_signature_here`;

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Certn webhook rejected: Invalid signature',
        expect.any(Object),
      );
    });

    it('should reject missing signature header', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };

      expect(client.verifyWebhookSignature(payload, '')).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Certn webhook rejected: Missing Certn-Signature header',
      );
    });

    it('should reject malformed signature header (missing timestamp)', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const signatureHeader = 'v1=some_signature';

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Certn webhook rejected: Invalid signature header format',
        expect.any(Object),
      );
    });

    it('should reject malformed signature header (missing signature)', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureHeader = `t=${timestamp}`;

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Certn webhook rejected: Invalid signature header format',
        expect.any(Object),
      );
    });

    it('should support multiple v1 signatures (secret rotation)', () => {
      const payload = { event: 'application.completed', data: { id: '123' } };
      const timestamp = Math.floor(Date.now() / 1000);
      const payloadString = JSON.stringify(payload);
      const signedPayload = `${timestamp}.${payloadString}`;

      // Generate valid signature
      const validSig = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Generate an old signature with a different secret (simulates secret rotation)
      const oldSecret = 'old-webhook-secret-32-characters!!';
      const oldSig = crypto
        .createHmac('sha256', oldSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Header with old signature first (valid hex but wrong secret), then valid signature
      const signatureHeader = `t=${timestamp},v1=${oldSig},v1=${validSig}`;

      expect(client.verifyWebhookSignature(payload, signatureHeader)).toBe(true);
    });

    it('should handle string payload', () => {
      const payloadString = '{"event":"application.completed","data":{"id":"123"}}';
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payloadString}`;
      const signature = crypto
        .createHmac('sha256', mockWebhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');
      const signatureHeader = `t=${timestamp},v1=${signature}`;

      expect(client.verifyWebhookSignature(payloadString, signatureHeader)).toBe(true);
    });
  });

  describe('Webhook Signature - Production Mode Enforcement', () => {
    it('should reject webhooks in production when secret not configured', () => {
      delete process.env.CERTN_WEBHOOK_SECRET;
      process.env.NODE_ENV = 'production';

      const client = new CertnClient();
      const payload = { event: 'application.completed', data: { id: '123' } };

      expect(client.verifyWebhookSignature(payload, 'any-signature')).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Certn webhook rejected: CERTN_WEBHOOK_SECRET not configured in production',
      );

      process.env.NODE_ENV = 'test';
    });

    it('should reject webhooks when SECURITY_MODE is production and secret not configured', () => {
      delete process.env.CERTN_WEBHOOK_SECRET;
      process.env.SECURITY_MODE = 'production';

      const client = new CertnClient();
      const payload = { event: 'application.completed', data: { id: '123' } };

      expect(client.verifyWebhookSignature(payload, 'any-signature')).toBe(false);

      delete process.env.SECURITY_MODE;
    });

    it('should allow webhooks in development when secret not configured (with warning)', () => {
      delete process.env.CERTN_WEBHOOK_SECRET;
      process.env.NODE_ENV = 'development';
      process.env.SECURITY_MODE = 'development';

      const client = new CertnClient();
      const payload = { event: 'application.completed', data: { id: '123' } };

      expect(client.verifyWebhookSignature(payload, 'any-signature')).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        'Certn webhook signature verification skipped: CERTN_WEBHOOK_SECRET not configured',
      );

      process.env.NODE_ENV = 'test';
      delete process.env.SECURITY_MODE;
    });
  });

  describe('Certn API Integration (Mocked)', () => {
    let client: CertnClient;

    beforeEach(() => {
      process.env.CERTN_API_KEY = 'test-api-key';
      process.env.CERTN_BASE_URL = 'https://api.certn.co/v1';

      // Mock axios.create to return a mock client
      const mockAxiosInstance = {
        post: jest.fn(),
        get: jest.fn(),
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      client = new CertnClient();
    });

    it('should create applicant successfully', async () => {
      const mockResponse = {
        data: {
          id: mockApplicantId,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
      };

      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.createApplicant({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        custom_id: 'user-123',
      });

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/applicants', {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        custom_id: 'user-123',
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Certn applicant created',
        expect.objectContaining({ applicantId: mockApplicantId }),
      );
    });

    it('should create application successfully', async () => {
      const mockResponse = {
        data: {
          id: mockApplicationId,
          applicant_id: mockApplicantId,
          status: 'PENDING',
        },
      };

      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.createApplication({
        applicant_id: mockApplicantId,
        package: 'standard',
      });

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/applications', {
        applicant_id: mockApplicantId,
        package: 'standard',
      });
    });

    it('should get application successfully', async () => {
      const mockResponse = {
        data: {
          id: mockApplicationId,
          applicant_id: mockApplicantId,
          status: 'COMPLETED',
          report_status: 'CLEAR',
        },
      };

      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getApplication(mockApplicationId);

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/applications/${mockApplicationId}`);
    });

    it('should handle API errors gracefully', async () => {
      const mockAxiosInstance = mockedAxios.create.mock.results[0].value;
      mockAxiosInstance.post.mockRejectedValue({
        message: 'Network error',
        response: { data: { error: 'Internal server error' } },
      });

      await expect(
        client.createApplicant({ email: 'test@example.com' }),
      ).rejects.toThrow('Certn applicant creation failed: Network error');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create Certn applicant',
        expect.any(Object),
      );
    });
  });
});
