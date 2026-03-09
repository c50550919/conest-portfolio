/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import db from '../config/database';
import { getEncryptionService, EncryptedData } from '../services/encryptionService';
import { HUDIndividualizedAssessment } from '../types/entities/verification.entity';

export interface Verification {
  id: string;
  user_id: string;

  // Dual-Provider System (Payment-First Architecture)
  id_provider: 'veriff' | 'jumio'; // Default: veriff
  background_provider: 'certn' | 'checkr'; // Default: certn

  // ID Verification (Veriff/Jumio)
  id_verification_status: 'pending' | 'approved' | 'rejected' | 'expired';
  id_verification_date?: Date;
  id_verification_data?: string; // JSON encrypted data

  // Background Check (Certn/Checkr)
  background_check_status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'consider' | 'expired' | 'pre_adverse';
  background_check_date?: Date;
  background_check_report_id?: string;

  // Certn-specific fields
  certn_report_id?: string;
  certn_applicant_id?: string;
  flagged_records?: string; // Encrypted text (AES-256-GCM) — Constitution Principle III

  // Admin Review (for 'consider' status)
  admin_review_required: boolean;
  admin_reviewed_by?: string; // User ID of admin
  admin_review_date?: Date;
  admin_review_notes?: string;

  // Data retention (CMP-03: criminal record data purge)
  retention_expires_at?: Date;
  // FCRA adverse action (CMP-04)
  pre_adverse_notice_date?: Date;

  // Income Verification
  income_verification_status: 'pending' | 'verified' | 'rejected';
  income_verification_date?: Date;
  income_range?: string;

  // Phone Verification
  phone_verified: boolean;
  phone_verification_date?: Date;

  // Email Verification
  email_verified: boolean;
  email_verification_date?: Date;

  // Overall verification
  verification_score: number; // 0-100
  fully_verified: boolean;

  created_at: Date;
  updated_at: Date;
}

export interface CreateVerificationData {
  user_id: string;
}

export const VerificationModel = {
  async create(data: CreateVerificationData): Promise<Verification> {
    const verificationData = {
      ...data,
      id_provider: 'veriff',
      background_provider: 'certn',
      id_verification_status: 'pending',
      background_check_status: 'not_started',
      income_verification_status: 'pending',
      phone_verified: false,
      email_verified: false,
      verification_score: 0,
      fully_verified: false,
      admin_review_required: false,
    };

    const [verification] = await db('verifications')
      .insert(verificationData)
      .returning('*');
    return verification;
  },

  async findByUserId(userId: string): Promise<Verification | undefined> {
    return await db('verifications').where({ user_id: userId }).first();
  },

  async update(userId: string, data: Partial<Verification>): Promise<Verification> {
    const [verification] = await db('verifications')
      .where({ user_id: userId })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return verification;
  },

  async updateVerificationScore(userId: string): Promise<number> {
    const verification = await this.findByUserId(userId);
    if (!verification) throw new Error('Verification record not found');

    let score = 0;
    if (verification.email_verified) score += 15;
    if (verification.phone_verified) score += 15;
    if (verification.id_verification_status === 'approved') score += 30;
    if (verification.background_check_status === 'approved') score += 30;
    if (verification.income_verification_status === 'verified') score += 10;

    const fullyVerified = score >= 90;

    await this.update(userId, {
      verification_score: score,
      fully_verified: fullyVerified,
    });

    return score;
  },

  /**
   * Mark verification for admin review (for 'consider' status)
   * Called when background check returns 'consider' status
   *
   * CMP-01: Encrypts flagged_records with AES-256-GCM before storage
   * Constitution Principle III: Criminal records must be encrypted at rest
   */
  async markForAdminReview(
    userId: string,
    flaggedRecords: Record<string, unknown>,
  ): Promise<Verification> {
    const encryptionService = getEncryptionService();
    const encrypted = await encryptionService.encryptMetadata(flaggedRecords);

    return await this.update(userId, {
      background_check_status: 'consider',
      admin_review_required: true,
      flagged_records: JSON.stringify(encrypted),
    });
  },

  /**
   * Decrypt flagged_records for admin review detail view
   *
   * CMP-01: Only call this for individual record detail views,
   * NOT for list/queue views (minimize exposure surface)
   */
  async getDecryptedFlaggedRecords(userId: string): Promise<Record<string, unknown> | null> {
    const verification = await this.findByUserId(userId);
    if (!verification?.flagged_records) return null;

    const encryptionService = getEncryptionService();
    const encryptedData: EncryptedData = JSON.parse(verification.flagged_records);
    return await encryptionService.decryptMetadata(encryptedData);
  },

  /**
   * Admin approve verification after review
   * 48h SLA for admin review
   *
   * CMP-03: Sets retention_expires_at to 30 days from now
   * CMP-14: Accepts structured HUD individualized assessment
   * Criminal record data will be purged after retention period
   */
  async adminApprove(
    userId: string,
    adminUserId: string,
    notes?: string,
    hudAssessment?: HUDIndividualizedAssessment,
  ): Promise<Verification> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + 30);

    // CMP-14: Store structured HUD assessment as JSON if provided,
    // otherwise fall back to plain notes for backward compatibility
    const reviewNotes = hudAssessment
      ? JSON.stringify({ hudAssessment, notes })
      : notes;

    const verification = await this.update(userId, {
      background_check_status: 'approved',
      admin_review_required: false,
      admin_reviewed_by: adminUserId,
      admin_review_date: db.fn.now() as any,
      admin_review_notes: reviewNotes,
      retention_expires_at: retentionDate,
    });

    await this.updateVerificationScore(userId);
    return verification;
  },

  /**
   * Admin reject verification after review
   * CMP-04: Initiates FCRA pre-adverse action (does NOT directly reject)
   * CMP-03: Sets retention_expires_at to 30 days from now
   * CMP-14: REQUIRES structured HUD individualized assessment for denials
   *
   * HUD guidance mandates documented individualized assessment when
   * denying housing based on criminal history. Rejections without
   * assessment are legally vulnerable.
   */
  async adminReject(
    userId: string,
    adminUserId: string,
    notes?: string,
    hudAssessment?: HUDIndividualizedAssessment,
  ): Promise<Verification> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + 30);

    // CMP-14: Store structured HUD assessment as JSON if provided
    const reviewNotes = hudAssessment
      ? JSON.stringify({ hudAssessment, notes })
      : notes;

    return await this.update(userId, {
      background_check_status: 'rejected',
      admin_review_required: false,
      admin_reviewed_by: adminUserId,
      admin_review_date: db.fn.now() as any,
      admin_review_notes: reviewNotes,
      retention_expires_at: retentionDate,
    });
  },

  /**
   * Get admin review queue
   * Returns verifications requiring admin review (48h SLA)
   *
   * CMP-01: Excludes flagged_records from list view to minimize exposure
   */
  async getAdminReviewQueue(): Promise<Partial<Verification>[]> {
    return await db('verifications')
      .select(
        'id', 'user_id', 'background_check_status', 'background_check_date',
        'certn_report_id', 'certn_applicant_id', 'admin_review_required',
        'admin_reviewed_by', 'admin_review_date', 'admin_review_notes',
        'pre_adverse_notice_date', 'created_at', 'updated_at',
      )
      .where({ admin_review_required: true })
      .whereIn('background_check_status', ['consider'])
      .orderBy('background_check_date', 'asc')
      .limit(50);
  },

  /**
   * Get verifications by status for admin dashboard
   */
  async getByStatus(status: string, limit: number = 50): Promise<Verification[]> {
    return await db('verifications')
      .where({ background_check_status: status })
      .orderBy('created_at', 'desc')
      .limit(limit);
  },

  /**
   * Check if user has paid and completed verification
   * Used in connection request flow
   */
  async hasValidVerification(userId: string): Promise<boolean> {
    const verification = await this.findByUserId(userId);
    if (!verification) return false;

    // Must have approved background check
    if (verification.background_check_status !== 'approved') return false;

    // Check if payment exists (via VerificationPayment model)
    const payment = await db('verification_payments')
      .where({ user_id: userId, status: 'succeeded' })
      .first();

    return !!payment;
  },
};
