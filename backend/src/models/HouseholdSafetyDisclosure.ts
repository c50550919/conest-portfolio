/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Safety Disclosure Model
 *
 * Database operations for household safety disclosures. Parents must
 * complete this attestation before participating in matching.
 *
 * Constitution Principle I Compliance: NO child PII is stored - only
 * parent attestations about household status with audit trail.
 */

import db from '../config/database';
import {
  HouseholdSafetyDisclosureDB,
  CreateDisclosureParams,
  DisclosureStatus,
} from '../types/entities/household-safety.entity';

export const HouseholdSafetyDisclosureModel = {
  /**
   * Create a new household safety disclosure
   */
  async create(data: CreateDisclosureParams): Promise<HouseholdSafetyDisclosureDB> {
    const [disclosure] = await db('household_safety_disclosures')
      .insert({
        parent_id: data.parentId,
        household_id: data.householdId || null,
        disclosure_type: data.disclosureType,
        status: 'attested' as DisclosureStatus,
        attestation_responses: JSON.stringify(data.attestationResponses),
        signature_data: data.signatureData,
        signed_at: new Date(),
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        expires_at: data.expiresAt,
      })
      .returning('*');

    return this.parseJsonFields(disclosure);
  },

  /**
   * Find the current valid disclosure for a parent
   */
  async findByParentId(parentId: string): Promise<HouseholdSafetyDisclosureDB | null> {
    const disclosure = await db('household_safety_disclosures')
      .where({ parent_id: parentId, status: 'attested' })
      .whereRaw('expires_at > NOW()')
      .orderBy('created_at', 'desc')
      .first();

    return disclosure ? this.parseJsonFields(disclosure) : null;
  },

  /**
   * Find a disclosure by ID
   */
  async findById(id: string): Promise<HouseholdSafetyDisclosureDB | null> {
    const disclosure = await db('household_safety_disclosures').where({ id }).first();
    return disclosure ? this.parseJsonFields(disclosure) : null;
  },

  /**
   * Check if a parent has a valid (non-expired) disclosure
   */
  async hasValidDisclosure(parentId: string): Promise<boolean> {
    const disclosure = await this.findByParentId(parentId);
    return !!disclosure;
  },

  /**
   * Mark all previous disclosures for a parent as superseded
   * Called before creating a new disclosure (renewal)
   */
  async supersedePrevious(parentId: string): Promise<void> {
    await db('household_safety_disclosures')
      .where({ parent_id: parentId, status: 'attested' })
      .update({
        status: 'superseded' as DisclosureStatus,
        updated_at: new Date(),
      });
  },

  /**
   * Get all disclosures expiring within a certain number of days
   * Used for sending renewal reminder notifications
   */
  async getExpiringDisclosures(daysUntilExpiry: number): Promise<HouseholdSafetyDisclosureDB[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    const disclosures = await db('household_safety_disclosures')
      .where({ status: 'attested' })
      .whereRaw('expires_at <= ?', [expiryDate])
      .whereRaw('expires_at > NOW()');

    return disclosures.map((d: HouseholdSafetyDisclosureDB) => this.parseJsonFields(d));
  },

  /**
   * Mark all expired disclosures as expired
   * Should be run as a scheduled job
   */
  async markExpired(): Promise<number> {
    const result = await db('household_safety_disclosures')
      .where({ status: 'attested' })
      .whereRaw('expires_at <= NOW()')
      .update({
        status: 'expired' as DisclosureStatus,
        updated_at: new Date(),
      });

    return result;
  },

  /**
   * Get all disclosures for a household
   * Used to show disclosure status to potential matches
   */
  async findByHouseholdId(householdId: string): Promise<HouseholdSafetyDisclosureDB[]> {
    const disclosures = await db('household_safety_disclosures')
      .where({ household_id: householdId, status: 'attested' })
      .whereRaw('expires_at > NOW()');

    return disclosures.map((d: HouseholdSafetyDisclosureDB) => this.parseJsonFields(d));
  },

  /**
   * Get disclosure history for a parent (for audit purposes)
   */
  async getDisclosureHistory(parentId: string): Promise<HouseholdSafetyDisclosureDB[]> {
    const disclosures = await db('household_safety_disclosures')
      .where({ parent_id: parentId })
      .orderBy('created_at', 'desc');

    return disclosures.map((d: HouseholdSafetyDisclosureDB) => this.parseJsonFields(d));
  },

  /**
   * Parse JSONB fields from database
   */
  parseJsonFields(disclosure: HouseholdSafetyDisclosureDB): HouseholdSafetyDisclosureDB {
    if (typeof disclosure.attestation_responses === 'string') {
      disclosure.attestation_responses = JSON.parse(disclosure.attestation_responses);
    }
    return disclosure;
  },
};
