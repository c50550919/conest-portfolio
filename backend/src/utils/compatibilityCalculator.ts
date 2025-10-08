import db from '../config/database';

/**
 * Compatibility Calculator Utility
 *
 * Purpose: Fast compatibility scoring for Discovery Screen
 * Constitution: Principle I (Child Safety - NO child PII, only age groups)
 * Performance: <20ms calculation target (Constitution Principle IV)
 *
 * This is the SIMPLE/FAST algorithm used in the discovery feed.
 * For detailed match scoring, see /services/matchingService.ts
 *
 * Scoring Algorithm:
 * - Children age group overlap: 20 points per overlap (max 60 for 3+ overlaps)
 * - Budget compatibility: 30 points max (decreases with budget difference)
 * - Location (same city): 30 points
 * - Total: 0-100 score
 *
 * Example:
 * - User A: ['toddler', 'elementary'], budget $1500, Austin
 * - User B: ['toddler', 'teen'], budget $1600, Austin
 * - Score: 20 (age) + 29 (budget) + 30 (location) = 79
 *
 * Created: 2025-10-06
 * Updated: 2025-10-08 (added performance documentation)
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
  targetProfile: ParentProfile
): number {
  const breakdown = calculateCompatibilityBreakdown(userProfile, targetProfile);
  return breakdown.totalScore;
}

/**
 * Calculate detailed compatibility breakdown
 * @param userProfile - First parent's profile
 * @param targetProfile - Second parent's profile
 * @returns Detailed compatibility breakdown
 */
export function calculateCompatibilityBreakdown(
  userProfile: ParentProfile,
  targetProfile: ParentProfile
): CompatibilityBreakdown {
  let totalScore = 0;

  // 1. Children age group overlap (20 points per overlap, max 60)
  const userAgeGroups = Array.isArray(userProfile.children_age_groups)
    ? userProfile.children_age_groups
    : [];
  const targetAgeGroups = Array.isArray(targetProfile.children_age_groups)
    ? targetProfile.children_age_groups
    : [];
  const ageGroupOverlap = userAgeGroups.filter((ag: string) =>
    targetAgeGroups.includes(ag)
  ).length;
  const ageGroupScore = Math.min(ageGroupOverlap * 20, 60);
  totalScore += ageGroupScore;

  // 2. Budget compatibility (30 points max)
  const userBudget = calculateAverageBudget(
    userProfile.budget_min,
    userProfile.budget_max
  );
  const targetBudget = calculateAverageBudget(
    targetProfile.budget_min,
    targetProfile.budget_max
  );

  let budgetScore = 0;
  let budgetDiff = 0;
  // Only score budget if both users have budget data (not both 0/null)
  if (userBudget > 0 && targetBudget > 0) {
    budgetDiff = Math.abs(userBudget - targetBudget);
    // Score decreases as budget difference increases
    // $0 diff = 30 points, $3000 diff = 0 points
    budgetScore = Math.max(0, 30 - budgetDiff / 100);
  }
  totalScore += budgetScore;

  // 3. Location compatibility (30 points for same city)
  const sameCity = userProfile.city === targetProfile.city && userProfile.city !== null;
  const locationScore = sameCity ? 30 : 0;
  totalScore += locationScore;

  return {
    totalScore: Math.min(Math.round(totalScore), 100),
    ageGroupScore: Math.round(ageGroupScore),
    budgetScore: Math.round(budgetScore),
    locationScore,
    breakdown: {
      ageGroupOverlap,
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
  budgetMax: number | null
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
  targetUserId: string
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
  targetUserId: string
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
