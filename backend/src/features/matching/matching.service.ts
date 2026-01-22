import { ProfileModel, Profile } from '../../models/Profile';
import { MatchModel, CreateMatchData } from '../../models/Match';
import logger from '../../config/logger';
import SocketService from '../../services/SocketService';
import { logPairingCreated } from '../../services/auditService';

/**
 * Pairing Service (formerly Matching Service) - FHA COMPLIANT
 *
 * Purpose: Neutral compatibility scoring and connection management
 * Constitution: Principle I (Child Safety - NO child PII)
 *
 * FHA COMPLIANCE CHANGES (2025-11-07):
 * REMOVED family composition scoring from parenting compatibility
 * RETAINED user preference factors only
 *
 * This is the DETAILED algorithm used when creating connections in the database.
 * For discovery feed scoring, see /utils/compatibilityCalculator.ts
 *
 * Updated: 2025-11-07 (FHA compliance - removed family composition scoring)
 */

// Pairing algorithm weights - FHA COMPLIANT (preference-based only)
const WEIGHTS = {
  schedule: 0.30,      // 30% - Schedule compatibility (user preference)
  parenting: 0.20,     // 20% - Parenting philosophy (user preference, NOT child count)
  rules: 0.20,         // 20% - House rules alignment (user preference)
  location: 0.15,      // 15% - Location/schools (geographic preference)
  budget: 0.10,        // 10% - Budget match (financial preference)
  lifestyle: 0.05,     // 5% - Lifestyle factors (user preference)
};

interface MatchingPreferences {
  maxDistance?: number; // miles
  minCompatibilityScore?: number;
  limit?: number;
}

/**
 * IMPORTANT: This service is exported as both "PairingService" (new, FHA-compliant name)
 * and "MatchingService" (legacy, for backward compatibility during transition)
 */
export const PairingService = {
  // Calculate compatibility score between two profiles
  calculateCompatibility(profile1: Profile, profile2: Profile): {
    totalScore: number;
    breakdown: {
      schedule: number;
      parenting: number;
      rules: number;
      location: number;
      budget: number;
      lifestyle: number;
    };
  } {
    // Schedule compatibility (25%)
    const scheduleScore = this.calculateScheduleScore(profile1, profile2);

    // Parenting philosophy compatibility (20%)
    const parentingScore = this.calculateParentingScore(profile1, profile2);

    // House rules alignment (20%)
    const rulesScore = this.calculateRulesScore(profile1, profile2);

    // Location/schools proximity (15%)
    const locationScore = this.calculateLocationScore(profile1, profile2);

    // Budget match (10%)
    const budgetScore = this.calculateBudgetScore(profile1, profile2);

    // Lifestyle factors (10%)
    const lifestyleScore = this.calculateLifestyleScore(profile1, profile2);

    // Calculate weighted total
    const totalScore =
      scheduleScore * WEIGHTS.schedule +
      parentingScore * WEIGHTS.parenting +
      rulesScore * WEIGHTS.rules +
      locationScore * WEIGHTS.location +
      budgetScore * WEIGHTS.budget +
      lifestyleScore * WEIGHTS.lifestyle;

    return {
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown: {
        schedule: Math.round(scheduleScore * 100) / 100,
        parenting: Math.round(parentingScore * 100) / 100,
        rules: Math.round(rulesScore * 100) / 100,
        location: Math.round(locationScore * 100) / 100,
        budget: Math.round(budgetScore * 100) / 100,
        lifestyle: Math.round(lifestyleScore * 100) / 100,
      },
    };
  },

  // Schedule compatibility
  calculateScheduleScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Same schedule type is highly compatible
    if (profile1.schedule_type === profile2.schedule_type) {
      score += 30;
    } else if (
      (profile1.schedule_type === 'flexible' || profile2.schedule_type === 'flexible')
    ) {
      // Flexible schedules are moderately compatible with all
      score += 15;
    }

    // Both work from home adds compatibility
    if (profile1.work_from_home === profile2.work_from_home) {
      score += 20;
    }

    return Math.min(score, 100);
  },

  /**
   * Parenting philosophy compatibility - FHA COMPLIANT
   *
   * REMOVED (FHA violation):
   * - Number of children similarity scoring (was 10 points for family composition)
   *
   * RETAINED (FHA compliant):
   * - Parenting style preference matching (user-stated philosophy, not family composition)
   *
   * This focuses on user's stated parenting preferences, not protected family characteristics.
   */
  calculateParentingScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Same parenting style is highly compatible - USER PREFERENCE, not family composition
    if (profile1.parenting_style && profile2.parenting_style) {
      if (profile1.parenting_style === profile2.parenting_style) {
        score += 50; // Increased from 40 since we removed child count scoring
      } else if (
        profile1.parenting_style === 'balanced' ||
        profile2.parenting_style === 'balanced'
      ) {
        // Balanced parenting is moderately compatible with all
        score += 25; // Increased from 20
      }
    }

    return Math.min(score, 100);
  },

  // House rules alignment
  calculateRulesScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Parse house rules (if stored as JSON)
    const rules1 = (profile1 as any).house_rules ? JSON.parse((profile1 as any).house_rules) : {};
    const rules2 = (profile2 as any).house_rules ? JSON.parse((profile2 as any).house_rules) : {};

    // Compare key house rules
    const ruleKeys = ['quiet_hours', 'guest_policy', 'cleaning_schedule', 'shared_expenses'];
    let matches = 0;
    let total = 0;

    ruleKeys.forEach(key => {
      if (rules1[key] && rules2[key]) {
        total++;
        if (rules1[key] === rules2[key]) {
          matches++;
        }
      }
    });

    if (total > 0) {
      score += (matches / total) * 50;
    }

    return Math.min(score, 100);
  },

  // Location/schools proximity
  calculateLocationScore(profile1: Profile, profile2: Profile): number {
    let score = 0;

    // Same city is required for high compatibility
    if (profile1.city === profile2.city && profile1.state === profile2.state) {
      score = 70;

      // Same zip code is ideal
      if (profile1.zip_code === profile2.zip_code) {
        score = 100;
      } else if (profile1.latitude && profile1.longitude && profile2.latitude && profile2.longitude) {
        // Calculate distance if coordinates available
        const distance = this.calculateDistance(
          profile1.latitude,
          profile1.longitude,
          profile2.latitude,
          profile2.longitude,
        );

        // Closer is better
        if (distance < 2) {
          score = 95;
        } else if (distance < 5) {
          score = 85;
        } else if (distance < 10) {
          score = 75;
        }
      }
    } else if (profile1.state === profile2.state) {
      // Same state but different city
      score = 20;
    }

    return score;
  },

  // Budget match
  calculateBudgetScore(profile1: Profile, profile2: Profile): number {
    // Find overlapping budget range
    const overlap = Math.min(profile1.budget_max, profile2.budget_max) -
                   Math.max(profile1.budget_min, profile2.budget_min);

    if (overlap <= 0) {
      return 0; // No budget overlap
    }

    // Calculate overlap percentage
    const range1 = profile1.budget_max - profile1.budget_min;
    const range2 = profile2.budget_max - profile2.budget_min;
    const avgRange = (range1 + range2) / 2;

    const overlapPercentage = (overlap / avgRange) * 100;

    return Math.min(overlapPercentage, 100);
  },

  // Lifestyle factors
  calculateLifestyleScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score
    let factors = 0;
    let matches = 0;

    // Pets compatibility
    if (profile1.pets !== undefined && profile2.pets !== undefined) {
      factors++;
      if (profile1.pets === profile2.pets) {
        matches++;
      }
    }

    // Smoking compatibility
    if (profile1.smoking !== undefined && profile2.smoking !== undefined) {
      factors++;
      if (profile1.smoking === profile2.smoking) {
        matches++;
      } else if (profile1.smoking === false || profile2.smoking === false) {
        // Non-smoker with smoker is incompatible
        return 0;
      }
    }

    // Dietary preferences similarity
    if ((profile1 as any).dietary_preferences && (profile2 as any).dietary_preferences) {
      factors++;
      if ((profile1 as any).dietary_preferences === (profile2 as any).dietary_preferences) {
        matches++;
      }
    }

    if (factors > 0) {
      score = (matches / factors) * 100;
    }

    return score;
  },

  // Haversine formula for distance calculation
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Find potential pairings for a user - FHA COMPLIANT
   * Uses neutral language: "pairings" instead of "matches"
   */
  async findPairings(
    userId: string,
    preferences: MatchingPreferences = {},
  ): Promise<any[]> {
    const {
      minCompatibilityScore = 60,
      limit = 20,
    } = preferences;

    // Get user's profile
    const userProfile = await ProfileModel.findByUserId(userId);
    if (!userProfile) {
      throw new Error('Profile not found');
    }

    // Only match with verified users
    if (!userProfile.verified) {
      throw new Error('Your profile must be verified to find matches');
    }

    // Search for potential matches in the same area
    const candidates = await ProfileModel.search({
      city: userProfile.city,
      state: userProfile.state,
      verified: true,
    });

    // Calculate compatibility scores
    const matches = candidates
      .filter(candidate => candidate.user_id !== userId) // Exclude self
      .map(candidate => {
        const compatibility = this.calculateCompatibility(userProfile, candidate);
        return {
          profile: candidate,
          compatibility,
        };
      })
      .filter(match => match.compatibility.totalScore >= minCompatibilityScore)
      .sort((a, b) => b.compatibility.totalScore - a.compatibility.totalScore)
      .slice(0, limit);

    logger.info(`Found ${matches.length} compatible pairings for user ${userId}`);

    return matches;
  },

  /**
   * Legacy method name for backward compatibility
   * @deprecated Use findPairings() instead
   */
  async findMatches(
    userId: string,
    preferences: MatchingPreferences = {},
  ): Promise<any[]> {
    return this.findPairings(userId, preferences);
  },

  // Create a match request
  async createMatch(
    userId1: string,
    userId2: string,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<any> {
    // Check if match already exists
    const existingMatch = await MatchModel.findExistingMatch(userId1, userId2);
    if (existingMatch) {
      throw new Error('Match already exists between these users');
    }

    // Get both profiles
    const profile1 = await ProfileModel.findByUserId(userId1);
    const profile2 = await ProfileModel.findByUserId(userId2);

    if (!profile1 || !profile2) {
      throw new Error('One or both profiles not found');
    }

    // Calculate compatibility
    const compatibility = this.calculateCompatibility(profile1, profile2);

    // Create match
    const matchData: CreateMatchData = {
      user_id_1: userId1,
      user_id_2: userId2,
      compatibility_score: compatibility.totalScore,
      schedule_score: compatibility.breakdown.schedule,
      parenting_score: compatibility.breakdown.parenting,
      rules_score: compatibility.breakdown.rules,
      location_score: compatibility.breakdown.location,
      budget_score: compatibility.breakdown.budget,
      lifestyle_score: compatibility.breakdown.lifestyle,
      initiated_by: userId1,
    };

    const match = await MatchModel.create(matchData);

    logger.info(`Match created between users ${userId1} and ${userId2} with score ${compatibility.totalScore}`);

    // FHA COMPLIANCE: Audit log pairing creation with preference-based scoring proof
    try {
      await logPairingCreated({
        userId1,
        userId2,
        matchId: match.id,
        compatibilityScore: compatibility.totalScore,
        ipAddress: requestContext?.ipAddress || 'unknown',
        userAgent: requestContext?.userAgent || 'unknown',
        breakdown: compatibility.breakdown,
      });
    } catch (auditError) {
      // Log audit errors but don't fail the match creation
      logger.error('Failed to create audit log for pairing:', auditError);
    }

    // Emit Socket.io notification to both users
    this.notifyMatch(userId1, userId2, match.id, compatibility.totalScore);

    return match;
  },

  /**
   * Notify both users of mutual match via Socket.io
   * Constitution: Principle IV (Performance - <100ms delivery)
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param matchId - Created match ID
   * @param compatibilityScore - Compatibility score (0-100)
   */
  notifyMatch(
    userId1: string,
    userId2: string,
    matchId: string,
    compatibilityScore: number,
  ): void {
    const matchData = {
      id: matchId,
      compatibilityScore,
      createdAt: new Date().toISOString(),
    };

    // Emit to both users via SocketService
    SocketService.emitMatchCreated(userId1, userId2, matchData);

    logger.info(`Match notification sent to users ${userId1} and ${userId2}`);
  },

  /**
   * Emit match created event (alias for notifyMatch)
   * Used by ConnectionRequestService when a request is accepted
   */
  emitMatchCreated(
    userId: string,
    matchData: {
      id: string;
      matchedUserId: string;
      compatibilityScore: number;
      createdAt: string;
    },
  ): void {
    // This is handled by SocketService.emitMatchCreated
    // Called from notifyMatch above
    logger.debug(`emitMatchCreated called for user ${userId}, match ${matchData.id}`);
  },

  // Respond to a match request
  async respondToMatch(matchId: string, userId: string, accept: boolean): Promise<any> {
    const match = await MatchModel.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is part of this match
    if (match.user_id_1 !== userId && match.user_id_2 !== userId) {
      throw new Error('Unauthorized to respond to this match');
    }

    // Update match status
    const newStatus = accept ? 'accepted' : 'rejected';
    const updatedMatch = await MatchModel.update(matchId, { status: newStatus });

    logger.info(`Match ${matchId} ${newStatus} by user ${userId}`);

    return updatedMatch;
  },
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use PairingService instead
 */
export const MatchingService = PairingService;
