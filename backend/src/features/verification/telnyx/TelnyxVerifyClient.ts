import axios, { AxiosInstance } from 'axios';
import logger from '../../../config/logger';

/**
 * Telnyx Verify API Client
 *
 * Documentation: https://developers.telnyx.com/docs/identity/verify/quickstart
 *
 * API Endpoints (per official docs):
 * - POST /verifications/sms - Initiate SMS verification
 * - POST /verifications/by_phone_number/{phone}/actions/verify - Verify code
 *
 * Features:
 * - SMS OTP verification
 * - Managed code generation and validation
 * - Built-in rate limiting and expiration
 * - Cost-optimized (~$0.034/verification vs Twilio's ~$0.058)
 *
 * Why Telnyx over Twilio:
 * - 40% cheaper per verification
 * - Phone verification is just device control (not identity)
 * - Heavy KYC is handled by Veriff/Certn
 *
 * Security:
 * - Telnyx manages OTP state (no Redis needed for codes)
 * - Built-in rate limiting per phone number
 * - Configurable timeout for code expiration
 */

export interface TelnyxVerification {
  id: string;
  phone_number: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  type: 'sms' | 'call';
  created_at: string;
  updated_at: string;
  timeout_secs: number;
}

export interface TelnyxVerifyResponse {
  data: TelnyxVerification;
}

export interface SendCodeResult {
  verificationId: string;
  phoneNumber: string;
  expiresInSeconds: number;
}

export interface VerifyCodeResult {
  verified: boolean;
  status: 'accepted' | 'rejected' | 'expired' | 'pending';
}

export class TelnyxVerifyClient {
  private client: AxiosInstance;
  private apiKey: string;
  private verifyProfileId: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.TELNYX_API_KEY || '';
    this.verifyProfileId = process.env.TELNYX_VERIFY_PROFILE_ID || '';
    this.baseURL = process.env.TELNYX_BASE_URL || 'https://api.telnyx.com/v2';
    // Note: Timeout is configured in the Verify Profile, not per-request

    if (!this.apiKey) {
      logger.warn('TELNYX_API_KEY not configured - phone verification will fail');
    }

    if (!this.verifyProfileId) {
      logger.warn('TELNYX_VERIFY_PROFILE_ID not configured - phone verification will fail');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Send verification code via SMS
   *
   * Telnyx generates and tracks the code - we don't need to store it.
   * Built-in rate limiting: max 3 attempts per 10 minutes per phone.
   *
   * @param phoneNumber - E.164 format phone number (e.g., +15551234567)
   * @returns Verification ID and expiration info
   */
  async sendCode(phoneNumber: string): Promise<SendCodeResult> {
    try {
      // Normalize phone number to E.164 format
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Per official docs: POST /verifications/sms
      // https://developers.telnyx.com/docs/identity/verify/quickstart
      const response = await this.client.post<TelnyxVerifyResponse>('/verifications/sms', {
        phone_number: normalizedPhone,
        verify_profile_id: this.verifyProfileId,
      });

      const verification = response.data.data;

      logger.info('Telnyx verification code sent', {
        verificationId: verification.id,
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        expiresIn: verification.timeout_secs,
      });

      return {
        verificationId: verification.id,
        phoneNumber: normalizedPhone,
        expiresInSeconds: verification.timeout_secs,
      };
    } catch (error: any) {
      // Handle specific Telnyx errors
      if (error.response?.status === 429) {
        logger.warn('Telnyx rate limit hit', {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
        });
        throw new Error('Too many verification attempts. Please wait before trying again.');
      }

      if (error.response?.status === 400) {
        const errorCode = error.response?.data?.errors?.[0]?.code;
        if (errorCode === 'invalid_phone_number') {
          throw new Error('Invalid phone number format');
        }
      }

      logger.error('Failed to send Telnyx verification code', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message,
        response: error.response?.data,
      });

      throw new Error(`Failed to send verification code: ${error.message}`);
    }
  }

  /**
   * Verify the OTP code
   *
   * Per official docs: POST /verifications/by_phone_number/{phone}/actions/verify
   * https://developers.telnyx.com/docs/identity/verify/quickstart
   *
   * Telnyx validates the code against its internal state.
   * No need for Redis or local code storage.
   *
   * @param phoneNumber - E.164 format phone number
   * @param code - 6-digit verification code
   * @returns Verification result
   */
  async verifyCode(phoneNumber: string, code: string): Promise<VerifyCodeResult> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      // URL-encode phone number for path parameter (+ becomes %2B)
      const encodedPhone = encodeURIComponent(normalizedPhone);

      // Per official docs: phone number in URL path, code + profile_id in body
      const response = await this.client.post<{ data: { phone_number: string; response_code: string } }>(
        `/verifications/by_phone_number/${encodedPhone}/actions/verify`,
        {
          code: code,
          verify_profile_id: this.verifyProfileId,
        },
      );

      // Response format: { data: { phone_number: string, response_code: "accepted" } }
      const responseCode = response.data.data.response_code;
      const verified = responseCode === 'accepted';

      logger.info('Telnyx verification result', {
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        responseCode,
        verified,
      });

      return {
        verified,
        status: verified ? 'accepted' : 'rejected',
      };
    } catch (error: any) {
      // 400 error means invalid code
      if (error.response?.status === 400) {
        const errorCode = error.response?.data?.errors?.[0]?.code;

        if (errorCode === 'verification_code_invalid') {
          logger.info('Invalid verification code attempt', {
            phoneNumber: this.maskPhoneNumber(phoneNumber),
          });
          return { verified: false, status: 'rejected' };
        }

        if (errorCode === 'verification_expired') {
          logger.info('Expired verification code attempt', {
            phoneNumber: this.maskPhoneNumber(phoneNumber),
          });
          return { verified: false, status: 'expired' };
        }

        if (errorCode === 'verification_not_found') {
          logger.info('No pending verification found', {
            phoneNumber: this.maskPhoneNumber(phoneNumber),
          });
          return { verified: false, status: 'rejected' };
        }
      }

      logger.error('Failed to verify Telnyx code', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message,
        response: error.response?.data,
      });

      throw new Error(`Failed to verify code: ${error.message}`);
    }
  }

  /**
   * Send verification code via Voice Call
   *
   * Voice call fallback for users who can't receive SMS.
   * Telnyx API: POST /verifications/call
   * Built-in rate limiting: max 3 attempts per 10 minutes per phone.
   *
   * @param phoneNumber - E.164 format phone number (e.g., +15551234567)
   * @returns Verification ID and expiration info
   */
  async sendVoiceCode(phoneNumber: string): Promise<SendCodeResult> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Per Telnyx docs: POST /verifications/call for voice OTP
      const response = await this.client.post<TelnyxVerifyResponse>('/verifications/call', {
        phone_number: normalizedPhone,
        verify_profile_id: this.verifyProfileId,
      });

      const verification = response.data.data;

      logger.info('Telnyx verification voice call initiated', {
        verificationId: verification.id,
        phoneNumber: this.maskPhoneNumber(normalizedPhone),
        expiresIn: verification.timeout_secs,
      });

      return {
        verificationId: verification.id,
        phoneNumber: normalizedPhone,
        expiresInSeconds: verification.timeout_secs,
      };
    } catch (error: any) {
      if (error.response?.status === 429) {
        logger.warn('Telnyx voice call rate limit hit', {
          phoneNumber: this.maskPhoneNumber(phoneNumber),
        });
        throw new Error('Too many verification attempts. Please wait before trying again.');
      }

      if (error.response?.status === 400) {
        const errorCode = error.response?.data?.errors?.[0]?.code;
        if (errorCode === 'invalid_phone_number') {
          throw new Error('Invalid phone number format');
        }
        if (errorCode === 'voice_not_supported') {
          throw new Error('Voice calls are not supported for this phone number');
        }
      }

      logger.error('Failed to initiate Telnyx voice verification', {
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        error: error.message,
        response: error.response?.data,
      });

      throw new Error(`Failed to initiate voice verification: ${error.message}`);
    }
  }

  /**
   * Get verification status by ID
   *
   * @param verificationId - Telnyx verification ID
   * @returns Current verification status
   */
  async getVerificationStatus(verificationId: string): Promise<TelnyxVerification> {
    try {
      const response = await this.client.get<TelnyxVerifyResponse>(
        `/verifications/${verificationId}`,
      );

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to get Telnyx verification status', {
        verificationId,
        error: error.message,
      });
      throw new Error(`Failed to get verification status: ${error.message}`);
    }
  }

  /**
   * Normalize phone number to E.164 format
   * Telnyx requires E.164 format (+1XXXXXXXXXX for US)
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If no + prefix, assume US and add +1
    if (!normalized.startsWith('+')) {
      // Remove leading 1 if present (to avoid +11...)
      if (normalized.startsWith('1') && normalized.length === 11) {
        normalized = `+${  normalized}`;
      } else if (normalized.length === 10) {
        normalized = `+1${  normalized}`;
      } else {
        normalized = `+${  normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 6) return '***';
    return `${phone.substring(0, 3)  }****${  phone.substring(phone.length - 4)}`;
  }

  /**
   * Check if Telnyx is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.verifyProfileId);
  }
}

export default new TelnyxVerifyClient();
