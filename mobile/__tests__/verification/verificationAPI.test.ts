/**
 * Unit Tests for Verification API Client
 * Tasks: T005-T011
 */

import apiClient from '../../src/config/api';
import { verificationAPI } from '../../src/services/api/verificationAPI';

// Mock the apiClient module
jest.mock('../../src/config/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('verificationAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVerificationStatus', () => {
    it('should fetch verification status successfully', async () => {
      const mockStatus = {
        email_verified: true,
        phone_verified: false,
        id_verification_status: 'pending',
        background_check_status: 'not_started',
        income_verification_status: 'pending',
        verification_score: 15,
        fully_verified: false,
      };

      mockApiClient.get.mockResolvedValueOnce({ data: mockStatus });

      const result = await verificationAPI.getVerificationStatus();

      expect(result).toEqual(mockStatus);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/verification/status');
    });

    it('should handle 401 unauthorized error', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 401 },
      });

      await expect(verificationAPI.getVerificationStatus()).rejects.toThrow();
    });

    it('should handle 404 verification not found', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 404 },
      });

      await expect(verificationAPI.getVerificationStatus()).rejects.toThrow('VERIFICATION_NOT_FOUND');
    });
  });

  describe('sendPhoneCode', () => {
    it('should send SMS code successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification code sent',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.sendPhoneCode();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification code sent');
      expect(result.expiresAt).toBeDefined();
    });

    it('should handle rate limiting (429)', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 429 },
      });

      await expect(verificationAPI.sendPhoneCode()).rejects.toThrow('RATE_LIMITED');
    });

    it('should handle phone not found error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'PHONE_NOT_FOUND' } },
      });

      await expect(verificationAPI.sendPhoneCode()).rejects.toThrow();
    });
  });

  describe('verifyPhoneCode', () => {
    it('should verify valid 6-digit code', async () => {
      const mockResponse = {
        success: true,
        message: 'Phone verified successfully',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.verifyPhoneCode('123456');

      expect(result.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/verification/phone/verify', { code: '123456' });
    });

    it('should reject invalid code format', async () => {
      // Client-side validation - should not call API
      await expect(verificationAPI.verifyPhoneCode('12345')).rejects.toThrow('INVALID_OTP');
      await expect(verificationAPI.verifyPhoneCode('1234567')).rejects.toThrow('INVALID_OTP');
      await expect(verificationAPI.verifyPhoneCode('abcdef')).rejects.toThrow('INVALID_OTP');

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should handle expired code error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 400, data: { error: 'OTP_EXPIRED' } },
      });

      await expect(verificationAPI.verifyPhoneCode('999999')).rejects.toThrow('OTP_EXPIRED');
    });

    it('should handle max retries exceeded', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 429 },
      });

      await expect(verificationAPI.verifyPhoneCode('000000')).rejects.toThrow('MAX_RETRIES_EXCEEDED');
    });
  });

  describe('sendEmailLink', () => {
    it('should send email verification link successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Verification link sent',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.sendEmailLink();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification link sent');
    });

    it('should handle rate limiting', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 429 },
      });

      await expect(verificationAPI.sendEmailLink()).rejects.toThrow('RATE_LIMITED');
    });
  });

  describe('initiateIDVerification', () => {
    it('should create Veriff session and return URL', async () => {
      const mockResponse = {
        verificationUrl: 'https://veriff.com/session/abc123',
        sessionId: 'abc123',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.initiateIDVerification();

      expect(result.verificationUrl).toMatch(/^https:\/\/veriff\.com/);
      expect(result.sessionId).toBeDefined();
    });

    it('should handle user not eligible error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 403, data: { error: 'USER_NOT_ELIGIBLE' } },
      });

      await expect(verificationAPI.initiateIDVerification()).rejects.toThrow();
    });

    it('should handle rate limiting for ID verification', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 429 },
      });

      await expect(verificationAPI.initiateIDVerification()).rejects.toThrow('RATE_LIMITED');
    });
  });

  describe('completeIDVerification', () => {
    it('should complete ID verification with approved status', async () => {
      const mockResponse = {
        success: true,
        status: 'approved',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.completeIDVerification('session-123');

      expect(result.success).toBe(true);
      expect(['approved', 'rejected', 'pending']).toContain(result.status);
    });

    it('should handle invalid session error', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'INVALID_SESSION' } },
      });

      await expect(verificationAPI.completeIDVerification('invalid-session')).rejects.toThrow();
    });
  });

  describe('initiateBackgroundCheck', () => {
    const validRequest = {
      consentTimestamp: new Date().toISOString(),
      signatureData: 'base64-encoded-signature-data',
    };

    it('should initiate background check with consent and signature', async () => {
      const mockResponse = {
        success: true,
        estimatedCompletion: '24 hours',
        applicationId: 'certn-app-123',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.initiateBackgroundCheck(validRequest);

      expect(result.success).toBe(true);
      expect(result.estimatedCompletion).toBe('24 hours');
    });

    it('should require consent timestamp', async () => {
      const invalidRequest = {
        consentTimestamp: '',
        signatureData: 'base64-data',
      };

      await expect(verificationAPI.initiateBackgroundCheck(invalidRequest)).rejects.toThrow();
    });

    it('should require signature data', async () => {
      const invalidRequest = {
        consentTimestamp: new Date().toISOString(),
        signatureData: '',
      };

      await expect(verificationAPI.initiateBackgroundCheck(invalidRequest)).rejects.toThrow();
    });
  });

  describe('uploadIncomeDocuments', () => {
    const validPayStubsRequest = {
      documentType: 'pay_stubs' as const,
      documents: [
        {
          filename: 'paystub_jan.pdf',
          contentType: 'application/pdf' as const,
          data: 'base64-encoded-pdf-data-1',
        },
        {
          filename: 'paystub_feb.pdf',
          contentType: 'application/pdf' as const,
          data: 'base64-encoded-pdf-data-2',
        },
      ],
    };

    const validEmploymentLetterRequest = {
      documentType: 'employment_letter' as const,
      documents: [
        {
          filename: 'employment_letter.pdf',
          contentType: 'application/pdf' as const,
          data: 'base64-encoded-pdf-data',
        },
      ],
    };

    it('should upload pay stubs (2 documents)', async () => {
      const mockResponse = { success: true };
      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.uploadIncomeDocuments(validPayStubsRequest);

      expect(result.success).toBe(true);
    });

    it('should upload employment letter (1 document)', async () => {
      const mockResponse = { success: true };
      mockApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await verificationAPI.uploadIncomeDocuments(validEmploymentLetterRequest);

      expect(result.success).toBe(true);
    });

    it('should reject invalid document type', async () => {
      const invalidRequest = {
        documentType: 'invalid_type' as any,
        documents: [],
      };

      await expect(verificationAPI.uploadIncomeDocuments(invalidRequest)).rejects.toThrow();
    });

    it('should reject unsupported file type', async () => {
      const invalidRequest = {
        documentType: 'pay_stubs' as const,
        documents: [
          {
            filename: 'document.exe',
            contentType: 'application/exe' as any,
            data: 'base64-data',
          },
        ],
      };

      await expect(verificationAPI.uploadIncomeDocuments(invalidRequest)).rejects.toThrow('INVALID_DOCUMENT_TYPE');
    });

    it('should handle document too large error (5MB limit)', async () => {
      // Large base64 data simulating >5MB file
      const largeData = 'x'.repeat(7 * 1024 * 1024); // 7MB

      const largeRequest = {
        documentType: 'pay_stubs' as const,
        documents: [
          {
            filename: 'large.pdf',
            contentType: 'application/pdf' as const,
            data: largeData,
          },
        ],
      };

      await expect(verificationAPI.uploadIncomeDocuments(largeRequest)).rejects.toThrow('DOCUMENT_TOO_LARGE');
    });
  });
});
