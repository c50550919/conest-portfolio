/**
 * CertnClient Unit Tests
 *
 * Critical Integration Tests for Background Check API Client
 * Tests: createApplicant, createApplication, getApplication, getApplicant,
 *        parseStatus, extractFlaggedRecords, verifyWebhookSignature, isConfigured
 */

import axios from 'axios';
import { CertnClient, CertnApplication, CertnRecord } from '../../services/certn/CertnClient';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('CertnClient', () => {
  let client: CertnClient;
  let mockAxiosInstance: jest.Mocked<typeof axios>;

  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment
    process.env = {
      ...originalEnv,
      CERTN_API_KEY: 'test-api-key',
      CERTN_BASE_URL: 'https://api.certn.co/v1',
    };

    // Create mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: { headers: { common: {} } },
    } as any;

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create new client instance for each test
    client = new CertnClient();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.certn.co/v1',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key',
        },
        timeout: 30000,
      });
    });

    it('should use default base URL when not configured', () => {
      process.env.CERTN_BASE_URL = '';

      new CertnClient();

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.certn.co/v1',
        })
      );
    });

    it('should log warning when API key is not configured', () => {
      const logger = require('../../config/logger');
      process.env.CERTN_API_KEY = '';

      new CertnClient();

      expect(logger.warn).toHaveBeenCalledWith(
        'CERTN_API_KEY not configured - background checks will fail'
      );
    });
  });

  describe('createApplicant', () => {
    const applicantData = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      custom_id: 'user-123',
    };

    const mockApplicantResponse = {
      id: 'applicant-456',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
    };

    it('should create applicant successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockApplicantResponse });

      const result = await client.createApplicant(applicantData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/applicants', applicantData);
      expect(result).toEqual(mockApplicantResponse);
    });

    it('should log success on applicant creation', async () => {
      const logger = require('../../config/logger');
      mockAxiosInstance.post.mockResolvedValue({ data: mockApplicantResponse });

      await client.createApplicant(applicantData);

      expect(logger.info).toHaveBeenCalledWith('Certn applicant created', {
        applicantId: 'applicant-456',
        customId: 'user-123',
      });
    });

    it('should throw error on API failure', async () => {
      const error = {
        message: 'API Error',
        response: { data: { error: 'Invalid data' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.createApplicant(applicantData)).rejects.toThrow(
        'Certn applicant creation failed: API Error'
      );
    });

    it('should log error details on failure', async () => {
      const logger = require('../../config/logger');
      const error = {
        message: 'API Error',
        response: { data: { error: 'Invalid data' } },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      try {
        await client.createApplicant(applicantData);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith('Failed to create Certn applicant', {
        error: 'API Error',
        response: { error: 'Invalid data' },
      });
    });
  });

  describe('createApplication', () => {
    const applicationData = {
      applicant_id: 'applicant-456',
      package: 'standard',
      owner_id: 'owner-123',
    };

    const mockApplicationResponse = {
      id: 'application-789',
      applicant_id: 'applicant-456',
      status: 'PENDING' as const,
    };

    it('should create application successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockApplicationResponse });

      const result = await client.createApplication(applicationData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/applications', applicationData);
      expect(result).toEqual(mockApplicationResponse);
    });

    it('should log success on application creation', async () => {
      const logger = require('../../config/logger');
      mockAxiosInstance.post.mockResolvedValue({ data: mockApplicationResponse });

      await client.createApplication(applicationData);

      expect(logger.info).toHaveBeenCalledWith('Certn application created', {
        applicationId: 'application-789',
        applicantId: 'applicant-456',
        package: 'standard',
      });
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue({ message: 'Network error' });

      await expect(client.createApplication(applicationData)).rejects.toThrow(
        'Certn application creation failed: Network error'
      );
    });
  });

  describe('getApplication', () => {
    const mockApplication: CertnApplication = {
      id: 'application-789',
      applicant_id: 'applicant-456',
      status: 'COMPLETED',
      report_status: 'CLEAR',
      reports: [],
    };

    it('should retrieve application successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockApplication });

      const result = await client.getApplication('application-789');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/applications/application-789');
      expect(result).toEqual(mockApplication);
    });

    it('should log retrieval with status info', async () => {
      const logger = require('../../config/logger');
      mockAxiosInstance.get.mockResolvedValue({ data: mockApplication });

      await client.getApplication('application-789');

      expect(logger.info).toHaveBeenCalledWith('Retrieved Certn application', {
        applicationId: 'application-789',
        status: 'COMPLETED',
        reportStatus: 'CLEAR',
      });
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue({ message: 'Not found' });

      await expect(client.getApplication('invalid-id')).rejects.toThrow(
        'Certn application retrieval failed: Not found'
      );
    });
  });

  describe('getApplicant', () => {
    const mockApplicant = {
      id: 'applicant-456',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
    };

    it('should retrieve applicant successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockApplicant });

      const result = await client.getApplicant('applicant-456');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/applicants/applicant-456');
      expect(result).toEqual(mockApplicant);
    });

    it('should throw error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue({ message: 'Unauthorized' });

      await expect(client.getApplicant('invalid-id')).rejects.toThrow(
        'Certn applicant retrieval failed: Unauthorized'
      );
    });
  });

  describe('parseStatus', () => {
    it('should return approved for CLEAR status', () => {
      expect(client.parseStatus('CLEAR')).toBe('approved');
    });

    it('should return consider for CONSIDER status', () => {
      expect(client.parseStatus('CONSIDER')).toBe('consider');
    });

    it('should return consider for ADJUDICATION status', () => {
      expect(client.parseStatus('ADJUDICATION')).toBe('consider');
    });

    it('should return rejected for SUSPENDED status', () => {
      expect(client.parseStatus('SUSPENDED')).toBe('rejected');
    });

    it('should return pending for PENDING status', () => {
      expect(client.parseStatus('PENDING')).toBe('pending');
    });

    it('should return pending for unknown status', () => {
      expect(client.parseStatus('UNKNOWN')).toBe('pending');
      expect(client.parseStatus('')).toBe('pending');
    });
  });

  describe('extractFlaggedRecords', () => {
    it('should return empty array when no reports exist', () => {
      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toEqual([]);
    });

    it('should return empty array when reports array is empty', () => {
      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
        reports: [],
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toEqual([]);
    });

    it('should return empty array for CLEAR reports', () => {
      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'CLEAR',
            records: [{ type: 'record', description: 'Some record' }],
          },
        ],
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toEqual([]);
    });

    it('should extract records from CONSIDER reports', () => {
      const flaggedRecord: CertnRecord = {
        type: 'criminal',
        description: 'Minor offense',
        date: '2020-01-01',
        location: 'California',
        disposition: 'Completed',
      };

      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'CONSIDER',
            records: [flaggedRecord],
          },
        ],
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toEqual([flaggedRecord]);
    });

    it('should extract records from ADJUDICATION reports', () => {
      const flaggedRecord: CertnRecord = {
        type: 'financial',
        description: 'Bankruptcy',
        date: '2019-06-15',
      };

      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
        reports: [
          {
            id: 'report-1',
            type: 'financial',
            status: 'ADJUDICATION',
            records: [flaggedRecord],
          },
        ],
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toEqual([flaggedRecord]);
    });

    it('should combine records from multiple flagged reports', () => {
      const record1: CertnRecord = { type: 'criminal', description: 'Record 1' };
      const record2: CertnRecord = { type: 'financial', description: 'Record 2' };

      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'CONSIDER',
            records: [record1],
          },
          {
            id: 'report-2',
            type: 'financial',
            status: 'ADJUDICATION',
            records: [record2],
          },
          {
            id: 'report-3',
            type: 'identity',
            status: 'CLEAR',
            records: [{ type: 'identity', description: 'Verified' }],
          },
        ],
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(record1);
      expect(result).toContainEqual(record2);
    });

    it('should handle reports without records array', () => {
      const application: CertnApplication = {
        id: 'app-1',
        applicant_id: 'applicant-1',
        status: 'COMPLETED',
        reports: [
          {
            id: 'report-1',
            type: 'criminal',
            status: 'CONSIDER',
            // No records array
          },
        ],
      };

      const result = client.extractFlaggedRecords(application);

      expect(result).toEqual([]);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true (placeholder implementation)', () => {
      const payload = { event: 'application.completed' };
      const signature = 'test-signature';

      const result = client.verifyWebhookSignature(payload, signature);

      expect(result).toBe(true);
    });

    it('should log signature verification attempt', () => {
      const logger = require('../../config/logger');
      const payload = { event: 'test' };
      const signature = 'sig-123';

      client.verifyWebhookSignature(payload, signature);

      expect(logger.info).toHaveBeenCalledWith('Certn webhook signature verification', {
        signature: 'sig-123',
      });
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      expect(client.isConfigured()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      process.env.CERTN_API_KEY = '';
      const unconfiguredClient = new CertnClient();

      expect(unconfiguredClient.isConfigured()).toBe(false);
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
        client.createApplicant({ email: 'test@example.com' })
      ).rejects.toThrow('Certn applicant creation failed: timeout of 30000ms exceeded');
    });

    it('should handle missing response data in error', async () => {
      const logger = require('../../config/logger');
      const errorWithoutResponse = { message: 'Network error' };
      mockAxiosInstance.get.mockRejectedValue(errorWithoutResponse);

      try {
        await client.getApplication('app-123');
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get Certn application',
        expect.objectContaining({
          error: 'Network error',
          response: undefined,
        })
      );
    });
  });
});
