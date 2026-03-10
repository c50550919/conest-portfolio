/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Safety Disclosure Entity Types
 *
 * Defines types for the mandatory parental disclosure system that creates
 * legal accountability for household safety. Parents must attest to the
 * safety status of their household under penalty of perjury before
 * participating in matching.
 *
 * Constitution Principle I Compliance: NO child PII is stored - only
 * parent attestations about household status.
 */

// ============================================================================
// Database Types
// ============================================================================

export type DisclosureType = 'initial' | 'annual_renewal' | 'update_required';
export type DisclosureStatus = 'pending' | 'attested' | 'expired' | 'superseded';

/**
 * Database representation of a household safety disclosure
 */
export interface HouseholdSafetyDisclosureDB {
  id: string;
  household_id: string | null;
  parent_id: string;
  disclosure_type: DisclosureType;
  status: DisclosureStatus;
  attestation_responses: AttestationResponseDB[];
  signature_data: string | null;
  signed_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Individual attestation response stored in JSONB
 */
export interface AttestationResponseDB {
  questionId: string;
  response: boolean;
  answeredAt: string; // ISO timestamp
}

// ============================================================================
// API Types
// ============================================================================

/**
 * API representation of a household safety disclosure
 */
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

/**
 * API representation of an attestation response
 */
export interface AttestationResponse {
  questionId: string;
  response: boolean;
  answeredAt: string;
}

/**
 * Attestation question definition
 */
export interface AttestationQuestion {
  id: string;
  text: string;
  required: boolean;
  expectedAnswer: boolean | null; // CMP-11: null = informational only (VAWA protective orders)
  helpText?: string;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * Request body for submitting an attestation
 */
export interface SubmitAttestationDTO {
  attestationResponses: AttestationResponse[];
  signatureData: string; // base64 encoded signature image
  householdId?: string;
}

/**
 * Response for disclosure status endpoint
 */
export interface DisclosureStatusResponse {
  hasValidDisclosure: boolean;
  disclosure: HouseholdSafetyDisclosure | null;
  expiresIn: number | null; // days until expiration
  needsRenewal: boolean;
  canParticipateInMatching: boolean;
}

/**
 * Response for questions endpoint
 */
export interface AttestationQuestionsResponse {
  questions: AttestationQuestion[];
}

/**
 * Response for successful attestation submission
 */
export interface SubmitAttestationResponse {
  message: string;
  disclosure: HouseholdSafetyDisclosure;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Result of attestation validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Parameters for creating a new disclosure
 */
export interface CreateDisclosureParams {
  parentId: string;
  householdId?: string;
  disclosureType: DisclosureType;
  attestationResponses: AttestationResponseDB[];
  signatureData: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}
