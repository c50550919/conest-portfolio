/**
 * Verification API Client
 * Task: T017
 *
 * Implements all 9 verification endpoints from contracts/openapi.yaml
 *
 * Endpoints:
 * - GET /api/verification/status
 * - POST /api/verification/phone/send
 * - POST /api/verification/phone/verify
 * - POST /api/verification/email/send
 * - GET /api/verification/email/verify/:userId (handled by deep link)
 * - POST /api/verification/id/initiate
 * - POST /api/verification/id/complete
 * - POST /api/verification/background/initiate
 * - POST /api/verification/income/initiate
 */

import apiClient from '../../config/api';
import {
  VerificationStatusResponse,
  PhoneSendResponse,
  PhoneVerifyResponse,
  EmailSendResponse,
  IDVerificationInitiateResponse,
  IDVerificationCompleteResponse,
  BackgroundCheckInitiateRequest,
  BackgroundCheckInitiateResponse,
  IncomeVerificationRequest,
  IncomeVerificationResponse,
  VERIFICATION_CONSTANTS,
  VERIFICATION_ERROR_CODES,
} from '../../types/verification';

class VerificationAPI {
  /**
   * Get current verification status for authenticated user
   * GET /api/verification/status
   */
  async getVerificationStatus(): Promise<VerificationStatusResponse> {
    try {
      const response = await apiClient.get<VerificationStatusResponse>('/api/verification/status');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('VERIFICATION_NOT_FOUND');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Send SMS verification code to user's registered phone
   * POST /api/verification/phone/send
   */
  async sendPhoneCode(): Promise<PhoneSendResponse> {
    try {
      const response = await apiClient.post<PhoneSendResponse>('/api/verification/phone/send');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Send verification code via voice call (fallback for SMS)
   * POST /api/verification/phone/voice
   */
  async sendPhoneVoiceCode(): Promise<PhoneSendResponse> {
    try {
      const response = await apiClient.post<PhoneSendResponse>('/api/verification/phone/voice');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Verify phone with 6-digit OTP code
   * POST /api/verification/phone/verify
   */
  async verifyPhoneCode(code: string): Promise<PhoneVerifyResponse> {
    // Validate code format before sending
    if (!this.isValidOTPCode(code)) {
      throw new Error('INVALID_OTP');
    }

    try {
      const response = await apiClient.post<PhoneVerifyResponse>('/api/verification/phone/verify', {
        code,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('MAX_RETRIES_EXCEEDED');
      }
      if (error.response?.data?.error === 'OTP_EXPIRED') {
        throw new Error('OTP_EXPIRED');
      }
      if (error.response?.data?.error === 'INVALID_OTP') {
        throw new Error('INVALID_OTP');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Send email verification link
   * POST /api/verification/email/send
   */
  async sendEmailLink(): Promise<EmailSendResponse> {
    try {
      const response = await apiClient.post<EmailSendResponse>('/api/verification/email/send');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Initiate ID verification - creates Veriff session
   * POST /api/verification/id/initiate
   */
  async initiateIDVerification(): Promise<IDVerificationInitiateResponse> {
    try {
      const response = await apiClient.post<IDVerificationInitiateResponse>(
        '/api/verification/id/initiate'
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Complete ID verification after WebView session
   * POST /api/verification/id/complete
   */
  async completeIDVerification(sessionId: string): Promise<IDVerificationCompleteResponse> {
    try {
      const response = await apiClient.post<IDVerificationCompleteResponse>(
        '/api/verification/id/complete',
        { sessionId }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Initiate background check with consent and signature
   * POST /api/verification/background/initiate
   */
  async initiateBackgroundCheck(
    request: BackgroundCheckInitiateRequest
  ): Promise<BackgroundCheckInitiateResponse> {
    // Validate request
    if (!request.consentTimestamp) {
      throw new Error('Missing consent timestamp');
    }
    if (!request.signatureData) {
      throw new Error('Missing signature data');
    }

    try {
      const response = await apiClient.post<BackgroundCheckInitiateResponse>(
        '/api/verification/background/initiate',
        request
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Upload income verification documents
   * POST /api/verification/income/initiate
   */
  async uploadIncomeDocuments(
    request: IncomeVerificationRequest
  ): Promise<IncomeVerificationResponse> {
    // Validate document type
    if (!['pay_stubs', 'employment_letter'].includes(request.documentType)) {
      throw new Error('INVALID_DOCUMENT_TYPE');
    }

    // Validate documents
    for (const doc of request.documents) {
      // Check file type
      if (!VERIFICATION_CONSTANTS.ACCEPTED_DOCUMENT_TYPES.includes(doc.contentType as any)) {
        throw new Error('INVALID_DOCUMENT_TYPE');
      }

      // Check file size (base64 is ~4/3 larger than binary)
      const estimatedSize = (doc.data.length * 3) / 4;
      if (estimatedSize > VERIFICATION_CONSTANTS.MAX_DOCUMENT_SIZE_BYTES) {
        throw new Error('DOCUMENT_TOO_LARGE');
      }
    }

    try {
      const response = await apiClient.post<IncomeVerificationResponse>(
        '/api/verification/income/initiate',
        request
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 413) {
        throw new Error('DOCUMENT_TOO_LARGE');
      }
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Validate OTP code format (6 digits only)
   */
  private isValidOTPCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * Handle API errors and transform to user-friendly messages
   */
  private handleError(error: any): Error {
    const errorCode = error.response?.data?.error;
    const message = VERIFICATION_ERROR_CODES[errorCode as keyof typeof VERIFICATION_ERROR_CODES];

    if (message) {
      const err = new Error(errorCode);
      (err as any).userMessage = message;
      return err;
    }

    return new Error(error.response?.data?.message || error.message || 'Unknown error');
  }
}

export const verificationAPI = new VerificationAPI();
export default verificationAPI;
