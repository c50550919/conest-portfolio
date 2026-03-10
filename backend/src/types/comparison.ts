/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Unified Profile Comparison Type Definitions
 *
 * Purpose: Type-safe comparison service supporting both discovery and saved profiles
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 *
 * Created: 2025-10-20
 */

/**
 * Profile source type for comparison
 */
export type ProfileSourceType = 'discovery' | 'saved';

/**
 * Comparison request for a single profile
 */
export interface ComparisonRequest {
  type: ProfileSourceType;
  id: string; // userId for discovery, savedProfileId for saved
}

/**
 * Validated comparison request with metadata
 */
export interface ValidatedComparisonRequest {
  type: ProfileSourceType;
  id: string;
  userId: string; // Parent user ID (for both types)
  savedProfileId?: string; // Only for saved type
}

/**
 * Unified profile data structure for comparison
 */
export interface ComparisonProfile {
  // Source metadata
  sourceType: ProfileSourceType;
  profileId: string; // savedProfileId or userId depending on source
  userId: string; // Parent user ID

  // Profile data
  profile: {
    firstName: string;
    age: number;
    city: string;
    state: string;
    childrenCount: number;
    housingBudget?: number;
    moveInDate?: string;
    workSchedule?: string;
    hasPets: boolean;
    smoking: string;
    isVerified: boolean;
    verificationScore?: number;

    // Household preferences (JSONB)
    cleanlinessLevel?: string;
    noiseLevel?: string;
    guestPolicy?: string;
    sharingPreferences?: string;

    // Additional profile fields
    dietaryRestrictions?: string;
    allergies?: string;

    // Optional saved profile metadata
    folder?: string; // Only for saved profiles
    notes?: string; // Only for saved profiles
    savedAt?: string; // Only for saved profiles
  };
}

/**
 * Comparison service response
 */
export interface ComparisonResponse {
  success: boolean;
  data: ComparisonProfile[];
  metadata: {
    totalProfiles: number;
    discoveryCount: number;
    savedCount: number;
    requestedAt: string;
  };
}

/**
 * Comparison limits and validation rules
 */
export const COMPARISON_LIMITS = {
  minProfiles: 2,
  maxProfiles: 4,
} as const;

/**
 * Error messages for comparison validation
 */
export const COMPARISON_ERRORS = {
  INVALID_TYPE: 'Invalid profile type. Must be "discovery" or "saved"',
  INVALID_COUNT: `Must compare between ${COMPARISON_LIMITS.minProfiles} and ${COMPARISON_LIMITS.maxProfiles} profiles`,
  PROFILE_NOT_FOUND: 'One or more profiles not found',
  UNAUTHORIZED: 'Not authorized to access one or more profiles',
  INVALID_REQUEST: 'Invalid comparison request format',
} as const;
