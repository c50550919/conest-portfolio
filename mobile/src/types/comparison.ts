/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Comparison Types
 * Types for unified profile comparison feature
 *
 * Created: 2025-10-19
 */

/**
 * Source type for comparison profiles
 */
export type ComparisonSourceType = 'discovery' | 'saved';

/**
 * Profile data within a comparison profile
 */
export interface ComparisonProfileData {
  firstName: string;
  lastName?: string;
  age?: number;
  city?: string;
  state?: string;
  bio?: string;
  profilePhoto?: string;
  isVerified?: boolean;
  verificationScore?: number;
  housingBudget?: number | { min: number; max: number };
  childrenCount?: number;
  childrenAgeGroups?: string[];
  workSchedule?: string | { type: string; hours?: string };
  moveInDate?: string;
  hasPets?: boolean;
  smoking?: 'yes' | 'no' | 'outside';
  folder?: string | null;
  savedAt?: string;
  [key: string]: any;
}

/**
 * Unified profile structure for comparison
 * Used by CompareProfilesScreen to display side-by-side comparisons
 */
export interface UnifiedComparisonProfile {
  /** Unique identifier for this comparison entry */
  id: string;
  /** The user's profile ID (from users table) */
  userId: string;
  /** The profile ID (from profiles or saved_profiles table) */
  profileId: string;
  /** Source of the profile (discovery feed or saved profiles) */
  sourceType: ComparisonSourceType;
  /** The actual profile data */
  profile: ComparisonProfileData;
}

/**
 * Request format for comparison API
 */
export interface ComparisonRequest {
  type: ComparisonSourceType;
  id: string;
}

/**
 * API response for comparison
 */
export interface ComparisonResponse {
  success: boolean;
  data: UnifiedComparisonProfile[];
}
