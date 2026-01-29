/**
 * Household Safety Disclosure API Client
 *
 * Implements endpoints for the mandatory parental disclosure system.
 * Parents must complete this attestation before participating in matching.
 *
 * Endpoints:
 * - GET /api/household-safety/questions
 * - GET /api/household-safety/status
 * - POST /api/household-safety/submit
 */

import apiClient from '../../config/api';

// ============================================================================
// Types
// ============================================================================

export interface AttestationQuestion {
  id: string;
  text: string;
  required: boolean;
  expectedAnswer: boolean;
  helpText?: string;
}

export interface AttestationResponse {
  questionId: string;
  response: boolean;
  answeredAt: string;
}

export interface HouseholdSafetyDisclosure {
  id: string;
  householdId: string | null;
  parentId: string;
  disclosureType: string;
  status: string;
  attestationResponses: AttestationResponse[];
  signedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface DisclosureStatusResponse {
  success: boolean;
  data: {
    hasValidDisclosure: boolean;
    disclosure: HouseholdSafetyDisclosure | null;
    expiresIn: number | null;
    needsRenewal: boolean;
    canParticipateInMatching: boolean;
  };
}

export interface QuestionsResponse {
  success: boolean;
  data: {
    questions: AttestationQuestion[];
  };
}

export interface SubmitAttestationRequest {
  attestationResponses: AttestationResponse[];
  signatureData: string; // base64 encoded signature image
  householdId?: string;
}

export interface SubmitAttestationResponse {
  success: boolean;
  message: string;
  data: {
    disclosure: HouseholdSafetyDisclosure;
  };
}

// ============================================================================
// API Client
// ============================================================================

class HouseholdSafetyAPI {
  /**
   * Get the attestation questions to display to the user
   * GET /api/household-safety/questions
   */
  async getQuestions(): Promise<QuestionsResponse> {
    try {
      const response = await apiClient.get<QuestionsResponse>(
        '/api/household-safety/questions'
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get the current disclosure status for the authenticated user
   * GET /api/household-safety/status
   */
  async getStatus(): Promise<DisclosureStatusResponse> {
    try {
      const response = await apiClient.get<DisclosureStatusResponse>(
        '/api/household-safety/status'
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('PARENT_PROFILE_NOT_FOUND');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Submit a signed attestation
   * POST /api/household-safety/submit
   */
  async submitAttestation(
    request: SubmitAttestationRequest
  ): Promise<SubmitAttestationResponse> {
    try {
      const response = await apiClient.post<SubmitAttestationResponse>(
        '/api/household-safety/submit',
        request
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        const message = error.response?.data?.message || 'Submission failed';
        throw new Error(message);
      }
      if (error.response?.status === 429) {
        throw new Error('RATE_LIMITED');
      }
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message =
        error.response.data?.message ||
        error.response.data?.error ||
        'An error occurred';

      switch (status) {
        case 401:
          return new Error('UNAUTHORIZED');
        case 403:
          return new Error('FORBIDDEN');
        case 404:
          return new Error('NOT_FOUND');
        case 500:
          return new Error('SERVER_ERROR');
        default:
          return new Error(message);
      }
    }

    if (error.request) {
      return new Error('NETWORK_ERROR');
    }

    return error;
  }
}

export const householdSafetyAPI = new HouseholdSafetyAPI();
export default householdSafetyAPI;
