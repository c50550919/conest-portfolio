/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Match Entity - Canonical Type Definitions
 *
 * Database Table: matches
 * Features: Compatibility scoring with 8-factor breakdown
 */

// =============================================================================
// Database Types (snake_case - matches PostgreSQL schema)
// =============================================================================

export type MatchStatusDB = 'pending' | 'accepted' | 'rejected' | 'expired';

export interface MatchDB {
  id: string;
  user_id_1: string;
  user_id_2: string;
  compatibility_score: number; // 0-100

  // Score breakdown
  schedule_score: number;
  parenting_score: number;
  rules_score: number;
  location_score: number;
  budget_score: number;
  lifestyle_score: number;

  status: MatchStatusDB;
  initiated_by: string;
  response_deadline?: Date;
  matched_at?: Date;

  created_at: Date;
  updated_at: Date;
}

// Alternative match structure from ConnectionRequest.accept()
export interface MatchDBv2 {
  id: string;
  parent1_id: string;
  parent2_id: string;
  compatibility_score: number;
  score_breakdown?: string; // JSON
  parent1_status: 'liked' | 'passed' | 'pending';
  parent2_status: 'liked' | 'passed' | 'pending';
  matched: boolean;
  matched_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMatchDB {
  user_id_1: string;
  user_id_2: string;
  compatibility_score: number;
  schedule_score: number;
  parenting_score: number;
  rules_score: number;
  location_score: number;
  budget_score: number;
  lifestyle_score: number;
  initiated_by: string;
}

// =============================================================================
// API Types (camelCase - used in API responses)
// =============================================================================

export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'mutual';

/**
 * Match API response
 */
export interface Match {
  id: string;
  userId1: string;
  userId2: string;
  otherUserId: string; // The other user in the match (convenience field)
  compatibilityScore: number;

  // Score breakdown
  scoreBreakdown?: CompatibilityBreakdown;

  status: MatchStatus;
  initiatedBy: string;
  responseDeadline?: string;
  matchedAt?: string;

  // Other user's profile (for display)
  otherUser?: MatchUserProfile;

  createdAt: string;
  updatedAt: string;
}

export interface CompatibilityBreakdown {
  schedule: number;
  parenting: number;
  rules?: number; // House rules
  houseRules?: number; // Alias
  location: number;
  budget: number;
  lifestyle: number;
  moveInTiming?: number;
  leaseTerm?: number;
  communication?: number;
  totalScore?: number;
}

export interface MatchUserProfile {
  id: string;
  userId: string;
  firstName: string;
  age?: number;
  city?: string;
  state?: string;
  profilePhoto?: string;
  childrenCount?: number;
  childrenAgeGroups?: string[];
  verificationStatus?: {
    idVerified: boolean;
    backgroundCheckComplete: boolean;
    phoneVerified: boolean;
  };
}

// =============================================================================
// Compatibility Scoring Types
// =============================================================================

/**
 * Scoring weights for compatibility calculation
 * FHA Compliant: All factors are user preferences, not protected characteristics
 */
export const COMPATIBILITY_WEIGHTS = {
  location: 0.20, // 20%
  houseRules: 0.15, // 15%
  lifestyle: 0.15, // 15%
  schedule: 0.15, // 15%
  budget: 0.15, // 15%
  moveInTiming: 0.10, // 10%
  leaseTerm: 0.05, // 5%
  communication: 0.05, // 5%
} as const;

export interface CompatibilityCalculationInput {
  user1Preferences: UserPreferences;
  user2Preferences: UserPreferences;
}

export interface UserPreferences {
  // Location
  city: string;
  state: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  maxDistance?: number;

  // House Rules
  cleanlinessLevel?: string;
  noiseTolerance?: string;
  guestPolicy?: string;
  quietHours?: { start: string; end: string };

  // Lifestyle
  pets?: boolean;
  petFriendly?: boolean;
  smoking?: boolean;
  dietaryRestrictions?: string[];

  // Schedule
  scheduleType?: 'flexible' | 'fixed' | 'shift_work';
  workFromHome?: boolean;
  wakeTime?: string;
  bedTime?: string;

  // Budget
  budgetMin?: number;
  budgetMax?: number;

  // Move-in
  moveInDate?: string;
  leaseDuration?: number;

  // Communication
  communicationStyle?: string;
  communicationFrequency?: string;
}

export interface CompatibilityResult {
  totalScore: number;
  breakdown: CompatibilityBreakdown;
  dealbreakers?: string[];
  strengths?: string[];
  weaknesses?: string[];
}

// =============================================================================
// Request/Response Types
// =============================================================================

export interface GetMatchesRequest {
  status?: MatchStatus;
  limit?: number;
  cursor?: string;
}

export interface GetMatchesResponse {
  matches: Match[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface RespondToMatchRequest {
  matchId: string;
  accepted: boolean;
}

export interface RespondToMatchResponse {
  match: Match;
  conversationCreated?: boolean;
  conversationId?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const MATCH_CONSTANTS = {
  RESPONSE_DEADLINE_DAYS: 7,
  MIN_COMPATIBILITY_SCORE: 0,
  MAX_COMPATIBILITY_SCORE: 100,
  DEFAULT_TOP_MATCHES_LIMIT: 10,
} as const;
