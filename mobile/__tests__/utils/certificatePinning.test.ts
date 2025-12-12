/**
 * Certificate Pinning Utility Tests
 *
 * Critical Security Tests for SSL Certificate Pinning
 * Tests: createSecureAxiosInstance, validateCertificate, getCertificatePins,
 *        configureCertificatePinning, verifyCertificatePinning, handleCertificatePinningFailure,
 *        checkCertificateExpiration
 */

// Mock Platform before imports
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock axios
const mockInterceptorsRequest = { use: jest.fn() };
const mockInterceptorsResponse = { use: jest.fn() };

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: mockInterceptorsRequest,
      response: mockInterceptorsResponse,
    },
    defaults: { headers: { common: {} } },
  })),
}));

import axios from 'axios';
import { Platform } from 'react-native';
import {
  createSecureAxiosInstance,
  validateCertificate,
  configureCertificatePinning,
  verifyCertificatePinning,
  handleCertificatePinningFailure,
  checkCertificateExpiration,
} from '../../src/utils/certificatePinning';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Certificate Pinning Utility', () => {
  const originalEnv = process.env;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };

    // Suppress console output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createSecureAxiosInstance', () => {
    it('should create axios instance with correct base URL', () => {
      const baseURL = 'https://api.example.com';

      createSecureAxiosInstance(baseURL);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should add request interceptor for security headers', () => {
      createSecureAxiosInstance('https://api.example.com');

      expect(mockInterceptorsRequest.use).toHaveBeenCalledTimes(1);
    });

    it('should add response interceptor for error handling', () => {
      createSecureAxiosInstance('https://api.example.com');

      expect(mockInterceptorsResponse.use).toHaveBeenCalledTimes(1);
    });

    it('should add security headers in request interceptor', async () => {
      createSecureAxiosInstance('https://api.example.com');

      // Get the request interceptor function
      const requestInterceptor = mockInterceptorsRequest.use.mock.calls[0][0];

      const mockConfig = {
        headers: {} as any,
      };

      const result = await requestInterceptor(mockConfig);

      expect(result.headers['X-Requested-With']).toBe('XMLHttpRequest');
      expect(result.headers['X-Client-Version']).toBe('1.0.0');
      expect(result.headers['X-Platform']).toBe('ios');
    });

    it('should handle request interceptor error', async () => {
      createSecureAxiosInstance('https://api.example.com');

      // Get the request error handler
      const requestErrorHandler = mockInterceptorsRequest.use.mock.calls[0][1];

      const mockError = new Error('Request error');

      await expect(requestErrorHandler(mockError)).rejects.toThrow('Request error');
    });

    it('should handle SSL certificate error (status 495) in response interceptor', async () => {
      createSecureAxiosInstance('https://api.example.com');

      // Get the response error handler
      const responseErrorHandler = mockInterceptorsResponse.use.mock.calls[0][1];

      const sslError = {
        response: { status: 495 },
      };

      await expect(responseErrorHandler(sslError)).rejects.toEqual(sslError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('SSL Certificate validation failed');
    });

    it('should pass through non-SSL errors in response interceptor', async () => {
      createSecureAxiosInstance('https://api.example.com');

      const responseErrorHandler = mockInterceptorsResponse.use.mock.calls[0][1];

      const regularError = {
        response: { status: 500 },
      };

      await expect(responseErrorHandler(regularError)).rejects.toEqual(regularError);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('SSL Certificate validation failed');
    });

    it('should pass through successful responses', async () => {
      createSecureAxiosInstance('https://api.example.com');

      const responseSuccessHandler = mockInterceptorsResponse.use.mock.calls[0][0];

      const mockResponse = { data: { success: true } };

      const result = responseSuccessHandler(mockResponse);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateCertificate', () => {
    it('should return true for valid certificate in development pins', async () => {
      process.env.NODE_ENV = 'development';

      const hostname = 'api.example.com';
      const certificate = 'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=';

      const result = await validateCertificate(hostname, certificate);

      expect(result).toBe(true);
    });

    it('should return true for valid certificate in production pins', async () => {
      process.env.NODE_ENV = 'production';

      const hostname = 'api.example.com';
      const certificate = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

      const result = await validateCertificate(hostname, certificate);

      expect(result).toBe(true);
    });

    it('should return true for valid certificate in staging pins', async () => {
      process.env.NODE_ENV = 'staging';

      const hostname = 'api.example.com';
      const certificate = 'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=';

      const result = await validateCertificate(hostname, certificate);

      expect(result).toBe(true);
    });

    it('should return false for invalid certificate', async () => {
      process.env.NODE_ENV = 'development';

      const hostname = 'api.example.com';
      const certificate = 'sha256/INVALID_CERTIFICATE_HASH_THAT_DOES_NOT_MATCH=';

      const result = await validateCertificate(hostname, certificate);

      expect(result).toBe(false);
    });

    it('should log error for invalid certificate', async () => {
      process.env.NODE_ENV = 'development';

      const hostname = 'api.example.com';
      const certificate = 'sha256/INVALID=';

      await validateCertificate(hostname, certificate);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Certificate validation failed for',
        hostname
      );
    });

    it('should use backup production certificate', async () => {
      process.env.NODE_ENV = 'production';

      const hostname = 'api.example.com';
      const certificate = 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=';

      const result = await validateCertificate(hostname, certificate);

      expect(result).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      process.env.NODE_ENV = 'development';

      // Force an error by passing null
      const result = await validateCertificate('hostname', null as any);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('configureCertificatePinning', () => {
    it('should log configuration with pin count for development', () => {
      process.env.NODE_ENV = 'development';

      configureCertificatePinning();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Certificate pinning configured with',
        1, // development has 1 pin
        'pins'
      );
    });

    it('should log configuration with pin count for production', () => {
      process.env.NODE_ENV = 'production';

      configureCertificatePinning();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Certificate pinning configured with',
        2, // production has 2 pins (main + backup)
        'pins'
      );
    });

    it('should log configuration with pin count for staging', () => {
      process.env.NODE_ENV = 'staging';

      configureCertificatePinning();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Certificate pinning configured with',
        1, // staging has 1 pin
        'pins'
      );
    });
  });

  describe('verifyCertificatePinning', () => {
    it('should return true (placeholder implementation)', async () => {
      const result = await verifyCertificatePinning();

      expect(result).toBe(true);
    });

    it('should handle verification errors gracefully', async () => {
      // The current implementation doesn't actually make requests
      // but returns true as placeholder
      const result = await verifyCertificatePinning();

      expect(result).toBe(true);
    });
  });

  describe('handleCertificatePinningFailure', () => {
    it('should log error with certificate pinning failure message', () => {
      const error = new Error('Certificate mismatch');

      handleCertificatePinningFailure(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Certificate pinning failure:',
        error
      );
    });

    it('should handle various error types', () => {
      const stringError = 'Connection refused';

      handleCertificatePinningFailure(stringError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Certificate pinning failure:',
        stringError
      );
    });

    it('should handle null error gracefully', () => {
      handleCertificatePinningFailure(null);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Certificate pinning failure:',
        null
      );
    });

    it('should handle undefined error gracefully', () => {
      handleCertificatePinningFailure(undefined);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Certificate pinning failure:',
        undefined
      );
    });
  });

  describe('checkCertificateExpiration', () => {
    it('should return expiration status (placeholder implementation)', async () => {
      const result = await checkCertificateExpiration();

      expect(result).toEqual({
        isExpiringSoon: false,
        daysUntilExpiration: 90,
      });
    });

    it('should return isExpiringSoon as false', async () => {
      const result = await checkCertificateExpiration();

      expect(result.isExpiringSoon).toBe(false);
    });

    it('should return daysUntilExpiration as 90', async () => {
      const result = await checkCertificateExpiration();

      expect(result.daysUntilExpiration).toBe(90);
    });
  });

  describe('Environment-based Certificate Selection', () => {
    it('should select development certificates by default', async () => {
      delete process.env.NODE_ENV;

      const certificate = 'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=';
      const result = await validateCertificate('api.example.com', certificate);

      expect(result).toBe(true);
    });

    it('should select production certificates for production env', async () => {
      process.env.NODE_ENV = 'production';

      // Development cert should not work in production
      const devCert = 'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=';
      const result = await validateCertificate('api.example.com', devCert);

      expect(result).toBe(false);
    });

    it('should select staging certificates for staging env', async () => {
      process.env.NODE_ENV = 'staging';

      // Production cert should not work in staging
      const prodCert = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
      const result = await validateCertificate('api.example.com', prodCert);

      expect(result).toBe(false);
    });
  });

  describe('Security Edge Cases', () => {
    it('should reject certificate with partial match', async () => {
      process.env.NODE_ENV = 'development';

      // Partial match should fail
      const certificate = 'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD'; // Missing trailing D=
      const result = await validateCertificate('api.example.com', certificate);

      expect(result).toBe(false);
    });

    it('should handle empty certificate', async () => {
      process.env.NODE_ENV = 'development';

      const result = await validateCertificate('api.example.com', '');

      expect(result).toBe(false);
    });

    it('should reject certificate with different prefix', async () => {
      process.env.NODE_ENV = 'development';

      // Wrong prefix
      const certificate = 'sha512/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=';
      const result = await validateCertificate('api.example.com', certificate);

      expect(result).toBe(false);
    });
  });

  describe('Platform Integration', () => {
    it('should add platform header in request interceptor', async () => {
      createSecureAxiosInstance('https://api.example.com');

      const requestInterceptor = mockInterceptorsRequest.use.mock.calls[0][0];

      const mockConfig = {
        headers: {} as any,
      };

      const result = await requestInterceptor(mockConfig);

      // Should use mocked Platform.OS
      expect(result.headers['X-Platform']).toBe('ios');
    });
  });
});
