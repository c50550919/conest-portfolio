import db from '../config/database';

/**
 * Compatibility Calculator Utility - FHA COMPLIANT VERSION
 *
 * Purpose: Fast neutral compatibility scoring for Discovery Screen
 * Constitution: Principle I (Child Safety - NO child PII)
 * Performance: <20ms calculation target (Constitution Principle IV)
 *
 * FHA COMPLIANCE CHANGES (2025-11-07):
 * REMOVED family composition scoring (60 points for age group overlap)
 * RETAINED user preference factors only
 *
 * NEW Scoring Algorithm (FHA Compliant):
 * - Budget compatibility: 50 points max (financial preference)
 * - Location (same city): 50 points (geographic preference)
 * - Total: 0-100 score
 *
 * Example:
 * - User A: budget $1500, Austin
 * - User B: budget $1600, Austin
 * - Score: 49 (budget) + 50 (location) = 99
 *
 * This creates a neutral platform design (CoAbode model) where users
 * search based on their stated preferences, not algorithmic discrimination.
 *
 * Created: 2025-10-06
 * Updated: 2025-11-07 (FHA compliance - removed family composition scoring)
 */

export interface ParentProfile {
  user_id: string;
  children_age_groups: string[];
  budget_min: number | null;
  budget_max: number | null;
  city: string | null;
}

export interface CompatibilityBreakdown {
  totalScore: number;
  ageGroupScore: number;
  budgetScore: number;
  locationScore: number;
  breakdown: {
    ageGroupOverlap: number;
    budgetDifference: number;
    sameCity: boolean;
  };
}

/**
 * Calculate compatibility score between two parent profiles
 * @param userProfile - First parent's profile
 * @param targetProfile - Second parent's profile
 * @returns Compatibility score (0-100)
 */
export function calculateCompatibilityScore(
  userProfile: ParentProfile,
  targetProfile: ParentProfile,
): number {
  const breakdown = calculateCompatibilityBreakdown(userProfile, targetProfile);
  return breakdown.totalScore;
}

/**
 * Calculate detailed compatibility breakdown - FHA COMPLIANT
 *
 * REMOVED (FHA violation):
 * - ageGroupScore calculation (was 60 points based on family composition)
 * - ageGroupOverlap tracking
 *
 * RETAINED (FHA compliant):
 * - Budget compatibility (50 points) - financial preference
 * - Location compatibility (50 points) - geographic preference
 *
 * @param userProfile - First parent's profile
 * @param targetProfile - Second parent's profile
 * @returns Detailed compatibility breakdown
 */
export function calculateCompatibilityBreakdown(
  userProfile: ParentProfile,
  targetProfile: ParentProfile,
): CompatibilityBreakdown {
  let totalScore = 0;

  // 1. Budget compatibility (50 points max) - User preference, not family composition
  const userBudget = calculateAverageBudget(
    userProfile.budget_min,
    userProfile.budget_max,
  );
  const targetBudget = calculateAverageBudget(
    targetProfile.budget_min,
    targetProfile.budget_max,
  );

  let budgetScore = 0;
  let budgetDiff = 0;
  // Only score budget if both users have budget data (not both 0/null)
  if (userBudget > 0 && targetBudget > 0) {
    budgetDiff = Math.abs(userBudget - targetBudget);
    // Score decreases as budget difference increases
    // $0 diff = 50 points, $5000 diff = 0 points
    budgetScore = Math.max(0, 50 - budgetDiff / 100);
  }
  totalScore += budgetScore;

  // 2. Location compatibility (50 points for same city) - Geographic preference
  const sameCity = userProfile.city === targetProfile.city && userProfile.city !== null;
  const locationScore = sameCity ? 50 : 0;
  totalScore += locationScore;

  return {
    totalScore: Math.min(Math.round(totalScore), 100),
    ageGroupScore: 0, // Removed for FHA compliance - was discriminatory
    budgetScore: Math.round(budgetScore),
    locationScore,
    breakdown: {
      ageGroupOverlap: 0, // Removed for FHA compliance
      budgetDifference: Math.round(budgetDiff),
      sameCity,
    },
  };
}

/**
 * Calculate average budget from min/max range
 * @param budgetMin - Minimum budget
 * @param budgetMax - Maximum budget
 * @returns Average budget, or 0 if both are null
 */
function calculateAverageBudget(
  budgetMin: number | null,
  budgetMax: number | null,
): number {
  if (budgetMin !== null && budgetMax !== null) {
    return (budgetMin + budgetMax) / 2;
  }
  return budgetMin || budgetMax || 0;
}

/**
 * Fetch parent profiles from database and calculate compatibility
 * @param userId - First user ID
 * @param targetUserId - Second user ID
 * @returns Compatibility score (0-100)
 */
export async function getCompatibilityScoreFromDb(
  userId: string,
  targetUserId: string,
): Promise<number> {
  const userProfile = await db('parents').where('user_id', userId).first();
  const targetProfile = await db('parents').where('user_id', targetUserId).first();

  if (!userProfile || !targetProfile) {
    return 50; // Default neutral score if profiles not found
  }

  return calculateCompatibilityScore(userProfile, targetProfile);
}

/**
 * Fetch parent profiles and calculate detailed compatibility breakdown
 * @param userId - First user ID
 * @param targetUserId - Second user ID
 * @returns Detailed compatibility breakdown
 */
export async function getCompatibilityBreakdownFromDb(
  userId: string,
  targetUserId: string,
): Promise<CompatibilityBreakdown> {
  const userProfile = await db('parents').where('user_id', userId).first();
  const targetProfile = await db('parents').where('user_id', targetUserId).first();

  if (!userProfile || !targetProfile) {
    return {
      totalScore: 50,
      ageGroupScore: 0,
      budgetScore: 0,
      locationScore: 0,
      breakdown: {
        ageGroupOverlap: 0,
        budgetDifference: 0,
        sameCity: false,
      },
    };
  }

  return calculateCompatibilityBreakdown(userProfile, targetProfile);
}
