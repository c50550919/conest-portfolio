import axios, { AxiosInstance } from 'axios';
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

  constructor() {
    this.apiKey = process.env.CERTN_API_KEY || '';
    this.baseURL = process.env.CERTN_BASE_URL || 'https://api.certn.co/v1';

    if (!this.apiKey) {
      logger.warn('CERTN_API_KEY not configured - background checks will fail');
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
   * Verify webhook signature (if Certn provides signature verification)
   *
   * @param payload - Webhook payload
   * @param signature - Signature header
   * @returns true if valid
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Certn webhook signature verification logic
    // This is placeholder - implement based on Certn docs
    logger.info('Certn webhook signature verification', { signature });
    return true;
  }

  /**
   * Check if Certn is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export default new CertnClient();
