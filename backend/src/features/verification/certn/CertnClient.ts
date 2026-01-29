import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import logger from '../../../config/logger';

/**
 * Certn API Client
 *
 * Documentation: https://docs.certn.co/
 *
 * Features:
 * - Criminal record checks
 * - Identity verification
 * - Enhanced identity verification
 * - International criminal record checks
 *
 * Integration Flow:
 * 1. Create applicant
 * 2. Create application with package type
 * 3. Receive webhook on completion
 * 4. Retrieve report
 *
 * Statuses:
 * - PENDING: Check in progress
 * - CLEAR: No records found
 * - CONSIDER: Records found, requires review
 * - SUSPENDED: Check suspended by Certn
 * - ADJUDICATION: Requires manual review
 */

export interface CertnApplicant {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface CertnApplication {
  id: string;
  applicant_id: string;
  status: 'PENDING' | 'SUBMITTED' | 'IN_PROGRESS' | 'ACTION_REQUIRED' | 'COMPLETED';
  report_status?: 'CLEAR' | 'CONSIDER' | 'SUSPENDED' | 'ADJUDICATION';
  reports?: CertnReport[];
}

export interface CertnReport {
  id: string;
  type: string;
  status: 'CLEAR' | 'CONSIDER' | 'SUSPENDED' | 'ADJUDICATION';
  result?: any;
  records?: CertnRecord[];
}

export interface CertnRecord {
  type: string;
  description: string;
  date?: string;
  location?: string;
  disposition?: string;
}

export interface CreateApplicantRequest {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  custom_id?: string; // Our internal user ID
}

export interface CreateApplicationRequest {
  applicant_id: string;
  package: string; // e.g., "basic", "standard", "enhanced"
  owner_id?: string;
}

export class CertnClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private webhookSecret: string;
  private webhookToleranceSeconds: number;

  constructor() {
    this.apiKey = process.env.CERTN_API_KEY || '';
    this.baseURL = process.env.CERTN_BASE_URL || 'https://api.certn.co/v1';
    this.webhookSecret = process.env.CERTN_WEBHOOK_SECRET || '';
    this.webhookToleranceSeconds = parseInt(process.env.CERTN_WEBHOOK_TOLERANCE_SECONDS || '300', 10);

    if (!this.apiKey) {
      logger.warn('CERTN_API_KEY not configured - background checks will fail');
    }

    if (!this.webhookSecret) {
      logger.warn('CERTN_WEBHOOK_SECRET not configured - webhook signature verification disabled');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      timeout: 30000,
    });
  }

  /**
   * Create an applicant
   *
   * @param data - Applicant information
   * @returns Created applicant
   */
  async createApplicant(data: CreateApplicantRequest): Promise<CertnApplicant> {
    try {
      const response = await this.client.post<CertnApplicant>('/applicants', data);

      logger.info('Certn applicant created', {
        applicantId: response.data.id,
        customId: data.custom_id,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Certn applicant', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Certn applicant creation failed: ${error.message}`);
    }
  }

  /**
   * Create a background check application
   *
   * @param data - Application information
   * @returns Created application
   */
  async createApplication(data: CreateApplicationRequest): Promise<CertnApplication> {
    try {
      const response = await this.client.post<CertnApplication>('/applications', data);

      logger.info('Certn application created', {
        applicationId: response.data.id,
        applicantId: data.applicant_id,
        package: data.package,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Certn application', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Certn application creation failed: ${error.message}`);
    }
  }

  /**
   * Get application details
   *
   * @param applicationId - Application ID
   * @returns Application details including reports
   */
  async getApplication(applicationId: string): Promise<CertnApplication> {
    try {
      const response = await this.client.get<CertnApplication>(`/applications/${applicationId}`);

      logger.info('Retrieved Certn application', {
        applicationId,
        status: response.data.status,
        reportStatus: response.data.report_status,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Certn application', {
        applicationId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Certn application retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get applicant details
   *
   * @param applicantId - Applicant ID
   * @returns Applicant details
   */
  async getApplicant(applicantId: string): Promise<CertnApplicant> {
    try {
      const response = await this.client.get<CertnApplicant>(`/applicants/${applicantId}`);

      logger.info('Retrieved Certn applicant', {
        applicantId,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Certn applicant', {
        applicantId,
        error: error.message,
        response: error.response?.data,
      });
      throw new Error(`Certn applicant retrieval failed: ${error.message}`);
    }
  }

  /**
   * Parse background check status into our internal status
   *
   * @param certnStatus - Certn report status
   * @returns Internal verification status
   */
  parseStatus(certnStatus: string): 'pending' | 'approved' | 'rejected' | 'consider' {
    switch (certnStatus) {
      case 'CLEAR':
        return 'approved';
      case 'CONSIDER':
      case 'ADJUDICATION':
        return 'consider';
      case 'SUSPENDED':
        return 'rejected';
      default:
        return 'pending';
    }
  }

  /**
   * Extract flagged records from Certn report
   *
   * @param application - Certn application with reports
   * @returns Array of flagged records
   */
  extractFlaggedRecords(application: CertnApplication): CertnRecord[] {
    if (!application.reports) {
      return [];
    }

    const flaggedRecords: CertnRecord[] = [];

    for (const report of application.reports) {
      if (report.status === 'CONSIDER' || report.status === 'ADJUDICATION') {
        if (report.records) {
          flaggedRecords.push(...report.records);
        }
      }
    }

    return flaggedRecords;
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   *
   * Certn webhook signature format: "t=timestamp,v1=signature"
   * Per docs: https://docs.certn.co/api/guides/use-the-api/webhooks
   *
   * Security features:
   * - HMAC-SHA256 signature verification
   * - Timestamp validation for replay attack protection
   * - Constant-time comparison to prevent timing attacks
   *
   * @param payload - Raw webhook payload (string or object)
   * @param signatureHeader - Certn-Signature header value
   * @returns true if signature is valid and timestamp is within tolerance
   */
  verifyWebhookSignature(payload: any, signatureHeader: string): boolean {
    // If no webhook secret configured, log warning and reject in production
    if (!this.webhookSecret) {
      const isProduction = process.env.SECURITY_MODE === 'production' || process.env.NODE_ENV === 'production';
      if (isProduction) {
        logger.error('Certn webhook rejected: CERTN_WEBHOOK_SECRET not configured in production');
        return false;
      }
      // In development, allow but warn
      logger.warn('Certn webhook signature verification skipped: CERTN_WEBHOOK_SECRET not configured');
      return true;
    }

    if (!signatureHeader) {
      logger.error('Certn webhook rejected: Missing Certn-Signature header');
      return false;
    }

    try {
      // Parse signature header: "t=timestamp,v1=signature1,v1=signature2"
      const { timestamp, signatures } = this.parseSignatureHeader(signatureHeader);

      if (!timestamp || signatures.length === 0) {
        logger.error('Certn webhook rejected: Invalid signature header format', {
          signatureHeader: `${signatureHeader.substring(0, 50)  }...`,
        });
        return false;
      }

      // Validate timestamp (prevent replay attacks)
      const timestampAge = Math.floor(Date.now() / 1000) - timestamp;
      if (Math.abs(timestampAge) > this.webhookToleranceSeconds) {
        logger.error('Certn webhook rejected: Timestamp outside tolerance', {
          timestampAge,
          tolerance: this.webhookToleranceSeconds,
        });
        return false;
      }

      // Prepare signed payload: "timestamp.payload"
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const signedPayload = `${timestamp}.${payloadString}`;

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Check if any of the provided signatures match (supports secret rotation)
      // Use safe comparison that handles invalid hex and length mismatches
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const isValid = signatures.some((sig) => {
        try {
          // Validate hex format and length (SHA-256 produces 64 hex chars)
          if (!/^[a-f0-9]{64}$/i.test(sig)) {
            return false;
          }
          const sigBuffer = Buffer.from(sig, 'hex');
          return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
        } catch {
          // Handle any buffer/comparison errors
          return false;
        }
      });

      if (!isValid) {
        logger.error('Certn webhook rejected: Invalid signature', {
          providedSignatures: signatures.length,
        });
        return false;
      }

      logger.info('Certn webhook signature verified successfully', {
        timestampAge,
      });

      return true;
    } catch (error: any) {
      logger.error('Certn webhook signature verification failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Parse Certn-Signature header
   *
   * Format: "t=timestamp,v1=signature1,v1=signature2"
   * Multiple v1 signatures support secret rotation
   *
   * @param header - Raw signature header
   * @returns Parsed timestamp and signatures
   */
  private parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } {
    const parts = header.split(',');
    let timestamp = 0;
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = parseInt(value, 10);
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }

    return { timestamp, signatures };
  }

  /**
   * Check if Certn is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Check if webhook signature verification is configured
   */
  isWebhookSecretConfigured(): boolean {
    return !!this.webhookSecret;
  }
}

export default new CertnClient();
