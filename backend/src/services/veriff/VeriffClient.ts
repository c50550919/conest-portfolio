import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import logger from '../../config/logger';

/**
 * Veriff API Client
 *
 * Documentation: https://developers.veriff.com/
 *
 * Features:
 * - ID verification sessions
 * - Document verification
 * - Face matching
 * - Webhook signature verification
 *
 * Security:
 * - HMAC signature verification for webhooks
 * - TLS/SSL for API communication
 * - API key authentication
 */

export interface VeriffSession {
  status: string;
  verification: {
    id: string;
    url: string;
    vendorData: string;
    host: string;
    status: string;
    sessionToken: string;
  };
}

export interface VeriffDecision {
  verification: {
    id: string;
    code: number;
    status: 'approved' | 'declined' | 'resubmission_requested' | 'expired' | 'abandoned';
    reason?: string;
    reasonCode?: number;
    person?: {
      firstName?: string;
      lastName?: string;
      idNumber?: string;
      dateOfBirth?: string;
      nationality?: string;
    };
    document?: {
      number?: string;
      type?: string;
      country?: string;
      validFrom?: string;
      validUntil?: string;
    };
  };
}

export interface CreateSessionRequest {
  verification: {
    callback: string;
    person: {
      firstName?: string;
      lastName?: string;
      idNumber?: string;
    };
    vendorData: string;
    timestamp: string;
  };
}

export class VeriffClient {
  private client: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.VERIFF_API_KEY || '';
    this.apiSecret = process.env.VERIFF_API_SECRET || '';
    this.baseURL = process.env.VERIFF_BASE_URL || 'https://stationapi.veriff.com';

    if (!this.apiKey) {
      logger.warn('VERIFF_API_KEY not configured - verification will fail');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': this.apiKey,
      },
      timeout: 30000,
    });
  }

  /**
   * Create a verification session
   * Returns a URL for the user to complete ID verification
   *
   * @param userId - Internal user ID (stored as vendorData)
   * @param callbackUrl - Webhook URL for verification results
   * @returns Session URL and ID
   */
  async createSession(userId: string, callbackUrl: string): Promise<VeriffSession> {
    try {
      const timestamp = new Date().toISOString();
      const payload: CreateSessionRequest = {
        verification: {
          callback: callbackUrl,
          person: {
            // Optional pre-fill data
          },
          vendorData: userId,
          timestamp,
        },
      };

      // Generate signature for request
      const signature = this.generateSignature(payload);

      const response = await this.client.post<VeriffSession>('/v1/sessions', payload, {
        headers: {
          'X-SIGNATURE': signature,
        },
      });

      logger.info(`Veriff session created for user ${userId}`, {
        sessionId: response.data.verification.id,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Veriff session', {
        userId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Veriff session creation failed: ${error.message}`);
    }
  }

  /**
   * Get verification decision
   *
   * @param sessionId - Veriff session ID
   * @returns Verification decision
   */
  async getDecision(sessionId: string): Promise<VeriffDecision> {
    try {
      const response = await this.client.get<VeriffDecision>(`/v1/sessions/${sessionId}/decision`);

      logger.info(`Retrieved Veriff decision for session ${sessionId}`, {
        status: response.data.verification.status,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Veriff decision', {
        sessionId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Veriff decision retrieval failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   *
   * @param payload - Webhook payload
   * @param signature - X-SIGNATURE header value
   * @returns true if signature is valid
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const expectedSignature = this.generateSignature(payload);
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      return false;
    }
  }

  /**
   * Generate HMAC signature for requests
   *
   * @param payload - Request payload
   * @returns Hex-encoded signature
   */
  private generateSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(Buffer.from(payloadString, 'utf-8'))
      .digest('hex')
      .toLowerCase();
  }

  /**
   * Check if Veriff is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }
}

export default new VeriffClient();
