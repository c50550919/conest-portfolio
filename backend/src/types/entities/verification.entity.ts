/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Verification Entity - Canonical Type Definitions
 *
 * Database Table: verifications
 * Features: Dual-provider ID verification (Veriff/Jumio) and background checks (Certn/Checkr)
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type IdProvider = 'veriff' | 'jumio';
export type BackgroundProvider = 'certn' | 'checkr';
export type IdVerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type BackgroundCheckStatusType =
  | 'not_started'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'consider'
  | 'expired';
export type IncomeVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface VerificationDB {
  id: string;
  user_id: string;

  // Dual-Provider System
  id_provider: IdProvider;
  background_provider: BackgroundProvider;

  // ID Verification (Veriff/Jumio)
  id_verification_status: IdVerificationStatus;
  id_verification_date?: Date;
  id_verification_data?: string; // JSON encrypted data

  // Background Check (Certn/Checkr)
  background_check_status: BackgroundCheckStatusType;
  background_check_date?: Date;
  background_check_report_id?: string;

  // Certn-specific fields
  certn_report_id?: string;
  certn_applicant_id?: string;
  flagged_records?: unknown; // JSONB - flagged background check records

  // Admin Review (for 'consider' status)
  admin_review_required: boolean;
  admin_reviewed_by?: string;
  admin_review_date?: Date;
  admin_review_notes?: string;

  // Income Verification
  income_verification_status: IncomeVerificationStatus;
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

export interface CreateVerificationDB {
  user_id: string;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

/**
 * Verification status response for mobile/frontend
 */
export interface VerificationStatusResponse {
  emailVerified: boolean;
  phoneVerified: boolean;
  idVerificationStatus: IdVerificationStatus;
  backgroundCheckStatus: BackgroundCheckStatusType;
  incomeVerificationStatus: IncomeVerificationStatus;
  verificationScore: number;
  fullyVerified: boolean;
}

/**
 * Full verification record for admin/internal use
 */
export interface Verification {
  id: string;
  userId: string;

  // Providers
  idProvider: IdProvider;
  backgroundProvider: BackgroundProvider;

  // ID Verification
  idVerificationStatus: IdVerificationStatus;
  idVerificationDate?: string;

  // Background Check
  backgroundCheckStatus: BackgroundCheckStatusType;
  backgroundCheckDate?: string;
  backgroundCheckReportId?: string;

  // Admin Review
  adminReviewRequired: boolean;
  adminReviewedBy?: string;
  adminReviewDate?: string;
  adminReviewNotes?: string;

  // Income Verification
  incomeVerificationStatus: IncomeVerificationStatus;
  incomeVerificationDate?: string;
  incomeRange?: string;

  // Phone Verification
  phoneVerified: boolean;
  phoneVerificationDate?: string;

  // Email Verification
  emailVerified: boolean;
  emailVerificationDate?: string;

  // Overall
  verificationScore: number;
  fullyVerified: boolean;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Request/Response Types
// =============================================================================

export interface PhoneSendResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

export interface PhoneVerifyRequest {
  code: string;
}

export interface PhoneVerifyResponse {
  success: boolean;
  message?: string;
}

export interface EmailSendResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
}

export interface IdVerificationInitiateResponse {
  verificationUrl: string;
  sessionId: string;
}

export interface IdVerificationCompleteResponse {
  success: boolean;
  status: 'approved' | 'rejected' | 'pending';
}

export interface BackgroundCheckInitiateRequest {
  consentTimestamp: string;
  signatureData: string;
}

export interface BackgroundCheckInitiateResponse {
  success: boolean;
  estimatedCompletion: string;
  applicationId?: string;
}

export interface IncomeVerificationDocument {
  filename: string;
  contentType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/heic';
  data: string;
}

export interface IncomeVerificationRequest {
  documentType: 'pay_stubs' | 'employment_letter';
  documents: IncomeVerificationDocument[];
}

export interface IncomeVerificationResponse {
  success: boolean;
  message?: string;
}

// =============================================================================
// Verification Item Types (for UI display)
// =============================================================================

export type VerificationItemStatus = 'not_started' | 'pending' | 'completed' | 'failed' | 'expired';

export interface VerificationItem {
  id: 'email' | 'phone' | 'id' | 'background' | 'income';
  title: string;
  description: string;
  status: VerificationItemStatus;
  required: boolean;
  icon: string;
  expiresAt?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const VERIFICATION_SCORE_WEIGHTS = {
  email: 15,
  phone: 15,
  id: 30,
  background: 30,
  income: 10,
} as const;

export const VERIFICATION_CONSTANTS = {
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  MAX_OTP_ATTEMPTS: 3,
  COOLDOWN_MINUTES: 5,
  MAX_ID_RETRIES: 3,
  ID_COOLDOWN_HOURS: 24,
  MAX_DOCUMENT_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  PAY_STUBS_COUNT: 2,
  EMPLOYMENT_LETTER_COUNT: 1,
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'] as const,
} as const;
