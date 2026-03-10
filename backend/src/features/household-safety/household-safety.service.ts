/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Safety Disclosure Service
 *
 * Business logic for the mandatory parental disclosure system.
 * Handles attestation validation, submission, and status tracking.
 *
 * Key Legal Protection: If parents lie on this attestation, liability
 * shifts to them. This is the core legal protection layer for CoNest.
 */

import { HouseholdSafetyDisclosureModel } from '../../models/HouseholdSafetyDisclosure';
import {
  ATTESTATION_QUESTIONS,
  DISCLOSURE_VALIDITY_DAYS,
  RENEWAL_WARNING_DAYS,
  MIN_SIGNATURE_LENGTH,
} from './household-safety.constants';
import {
  SubmitAttestationDTO,
  DisclosureStatusResponse,
  AttestationQuestion,
  HouseholdSafetyDisclosure,
  ValidationResult,
  AttestationResponse,
  HouseholdSafetyDisclosureDB,
} from '../../types/entities/household-safety.entity';
import { createAuditLog } from '../../services/auditService';

export const HouseholdSafetyService = {
  /**
   * Get the attestation questions to display to the user
   */
  getAttestationQuestions(): AttestationQuestion[] {
    return ATTESTATION_QUESTIONS;
  },

  /**
   * Get the current disclosure status for a parent
   */
  async getDisclosureStatus(parentId: string): Promise<DisclosureStatusResponse> {
    const disclosure = await HouseholdSafetyDisclosureModel.findByParentId(parentId);

    if (!disclosure) {
      return {
        hasValidDisclosure: false,
        disclosure: null,
        expiresIn: null,
        needsRenewal: false,
        canParticipateInMatching: false,
      };
    }

    const now = new Date();
    const expiresAt = new Date(disclosure.expires_at);
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const needsRenewal = daysUntilExpiry <= RENEWAL_WARNING_DAYS;

    return {
      hasValidDisclosure: true,
      disclosure: this.mapToApiResponse(disclosure),
      expiresIn: daysUntilExpiry,
      needsRenewal,
      canParticipateInMatching: true,
    };
  },

  /**
   * Submit a signed attestation
   */
  async submitAttestation(
    parentId: string,
    data: SubmitAttestationDTO,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; disclosure: HouseholdSafetyDisclosure | null; error?: string }> {
    // Validate all required questions are answered correctly
    const validationResult = this.validateAttestationResponses(data.attestationResponses);
    if (!validationResult.valid) {
      await createAuditLog({
        userId: parentId,
        operation: 'HOUSEHOLD_SAFETY_DISCLOSURE',
        action: 'create',
        status: 'failure',
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        metadata: {
          reason: 'validation_failed',
          error: validationResult.error,
        },
      });

      return { success: false, disclosure: null, error: validationResult.error };
    }

    // Validate signature exists and is long enough
    if (!data.signatureData || data.signatureData.length < MIN_SIGNATURE_LENGTH) {
      await createAuditLog({
        userId: parentId,
        operation: 'HOUSEHOLD_SAFETY_DISCLOSURE',
        action: 'create',
        status: 'failure',
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        metadata: {
          reason: 'invalid_signature',
          signatureLength: data.signatureData?.length || 0,
        },
      });

      return { success: false, disclosure: null, error: 'Valid signature required' };
    }

    // Calculate expiration date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DISCLOSURE_VALIDITY_DAYS);

    // Supersede any existing disclosure (for renewals)
    await HouseholdSafetyDisclosureModel.supersedePrevious(parentId);

    // Create new disclosure
    const disclosure = await HouseholdSafetyDisclosureModel.create({
      parentId,
      householdId: data.householdId,
      disclosureType: 'initial',
      attestationResponses: data.attestationResponses.map((r) => ({
        questionId: r.questionId,
        response: r.response,
        answeredAt: r.answeredAt || new Date().toISOString(),
      })),
      signatureData: data.signatureData,
      ipAddress,
      userAgent,
      expiresAt,
    });

    // Audit log successful submission
    await createAuditLog({
      userId: parentId,
      operation: 'HOUSEHOLD_SAFETY_DISCLOSURE',
      resource: 'household_safety_disclosures',
      resourceId: disclosure.id,
      action: 'create',
      status: 'success',
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      metadata: {
        disclosureId: disclosure.id,
        householdId: data.householdId,
        expiresAt: expiresAt.toISOString(),
        disclosureType: 'initial',
      },
    });

    return { success: true, disclosure: this.mapToApiResponse(disclosure) };
  },

  /**
   * Check if a parent has a valid disclosure (for matching gate)
   */
  async hasValidDisclosure(parentId: string): Promise<boolean> {
    return HouseholdSafetyDisclosureModel.hasValidDisclosure(parentId);
  },

  /**
   * Validate attestation responses
   * Returns error if any required question is missing or answered incorrectly
   *
   * CMP-11: Questions with expectedAnswer === null are informational only (VAWA).
   * They are required to be answered but neither answer blocks the disclosure.
   */
  validateAttestationResponses(
    responses: AttestationResponse[],
  ): ValidationResult & { needsConfidentialHandling?: boolean } {
    let needsConfidentialHandling = false;

    for (const question of ATTESTATION_QUESTIONS) {
      const response = responses.find((r) => r.questionId === question.id);

      if (!response && question.required) {
        return {
          valid: false,
          error: `Required question "${question.id}" was not answered`,
        };
      }

      // CMP-11: VAWA — informational questions (expectedAnswer === null) never block
      if (question.expectedAnswer === null) {
        // If user has a protective order, flag for confidential address handling
        if (response && question.id === 'court_orders_protective' && response.response === true) {
          needsConfidentialHandling = true;
        }
        continue;
      }

      if (response && response.response !== question.expectedAnswer) {
        // User answered in a way that indicates a potential safety concern
        // They cannot complete the disclosure and must contact support
        return {
          valid: false,
          error:
            'Based on your responses, you cannot complete this disclosure at this time. ' +
            'Please contact support at support@conest.app if you believe this is in error.',
        };
      }
    }

    return { valid: true, needsConfidentialHandling };
  },

  /**
   * Map database disclosure to API response format
   */
  mapToApiResponse(db: HouseholdSafetyDisclosureDB): HouseholdSafetyDisclosure {
    return {
      id: db.id,
      householdId: db.household_id,
      parentId: db.parent_id,
      disclosureType: db.disclosure_type,
      status: db.status,
      attestationResponses: db.attestation_responses,
      signedAt: db.signed_at?.toISOString() || null,
      expiresAt: db.expires_at?.toISOString() || new Date().toISOString(),
      createdAt: db.created_at?.toISOString() || new Date().toISOString(),
    };
  },
};
