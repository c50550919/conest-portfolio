import { Profile } from '../models/Profile';
import { CompatibilityBreakdown, SCORING_WEIGHTS } from '../types/preferences';
import logger from '../config/logger';
import { logCompatibilityCalculation } from './auditService';

/**
 * Enhanced Pairing Service - FHA COMPLIANT
 *
 * Purpose: Comprehensive 8-factor preference-based compatibility scoring
 * Date: 2025-11-07
 *
 * FHA COMPLIANCE: 100% preference-based scoring, 0% family composition scoring
 *
 * Scoring Factors:
 * 1. Location (20%) - Geographic preferences
 * 2. House Rules (15%) - Living standards
 * 3. Lifestyle (15%) - Lifestyle choices
 * 4. Schedule (15%) - Daily routine compatibility
 * 5. Budget (15%) - Financial preferences
 * 6. Move-in Timing (10%) - Timing alignment
 * 7. Lease Terms (5%) - Lease preferences
 * 8. Communication (5%) - Communication style
 */

export class EnhancedPairingService {
  /**
   * Calculate comprehensive compatibility between two profiles
   */
  async calculateCompatibility(
    profile1: Profile,
    profile2: Profile,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<CompatibilityBreakdown> {
    const scores = {
      location: this.calculateLocationScore(profile1, profile2),
      house_rules: this.calculateHouseRulesScore(profile1, profile2),
      lifestyle: this.calculateLifestyleScore(profile1, profile2),
      schedule: this.calculateScheduleScore(profile1, profile2),
      budget: this.calculateBudgetScore(profile1, profile2),
      move_in_timing: this.calculateMoveInScore(profile1, profile2),
      lease_terms: this.calculateLeaseScore(profile1, profile2),
      communication: this.calculateCommunicationScore(profile1, profile2),
    };

    // Check for dealbreakers
    const dealbreakers = this.checkDealbreakers(profile1, profile2, scores);

    // Calculate weighted total score
    const totalScore = Object.entries(scores).reduce(
      (sum, [key, score]) => sum + score * SCORING_WEIGHTS[key as keyof typeof SCORING_WEIGHTS],
      0,
    );

    const result: CompatibilityBreakdown = {
      totalScore: Math.round(totalScore),
      breakdown: scores,
      dealbreakers: dealbreakers.length > 0 ? dealbreakers : undefined,
    };

    // FHA COMPLIANCE: Audit log enhanced compatibility calculation with preference-based scoring proof
    if (requestContext) {
      try {
        await logCompatibilityCalculation(
          profile1.user_id,
          profile2.user_id,
          result,
          requestContext.ipAddress || 'unknown',
          requestContext.userAgent || 'unknown',
        );
      } catch (auditError) {
        // Log audit errors but don't fail the compatibility calculation
        logger.error('Failed to create audit log for enhanced compatibility calculation:', auditError);
      }
    }

    return result;
  }

  // ============================================
  // 1. LOCATION SCORE (20%)
  // ============================================
  private calculateLocationScore(profile1: Profile, profile2: Profile): number {
    const geoScore = this.calculateGeoProximityScore(profile1, profile2);
    const neighborhoodScore = this.calculateNeighborhoodScore(profile1, profile2);
    const transportScore = this.calculateTransportScore(profile1, profile2);

    return Math.min(geoScore + neighborhoodScore + transportScore, 100);
  }

  /**
   * Calculate geographic proximity score (up to 50 points)
   */
  private calculateGeoProximityScore(profile1: Profile, profile2: Profile): number {
    const sameCity = profile1.city === profile2.city && profile1.state === profile2.state;
    const sameState = profile1.state === profile2.state;

    if (!sameCity && !sameState) return 0;
    if (!sameCity && sameState) return 10;

    // Same city - check zip code
    return profile1.zip_code === profile2.zip_code ? 50 : 40;
  }

  /**
   * Calculate neighborhood type compatibility score (up to 25 points)
   */
  private calculateNeighborhoodScore(profile1: Profile, profile2: Profile): number {
    if (!profile1.neighborhood_type || !profile2.neighborhood_type) return 0;
    if (profile1.neighborhood_type === profile2.neighborhood_type) return 25;
    if (this.areNeighborhoodTypesCompatible(profile1, profile2)) return 12;
    return 0;
  }

  /**
   * Calculate transportation preferences score (up to 25 points)
   */
  private calculateTransportScore(profile1: Profile, profile2: Profile): number {
    const transitMatch = this.checkPreferenceMatch(
      profile1.public_transit_important,
      profile2.public_transit_important,
      12,
    );
    const walkMatch = this.checkPreferenceMatch(
      profile1.walkability_important,
      profile2.walkability_important,
      13,
    );

    // If no preferences set, give default bonus
    if (transitMatch.defined === 0 && walkMatch.defined === 0) return 12;

    return transitMatch.score + walkMatch.score;
  }

  /**
   * Check if two boolean preferences match
   */
  private checkPreferenceMatch(
    pref1: boolean | undefined,
    pref2: boolean | undefined,
    points: number,
  ): { score: number; defined: number } {
    if (pref1 === undefined || pref2 === undefined) return { score: 0, defined: 0 };
    return { score: pref1 === pref2 ? points : 0, defined: 1 };
  }

  private areNeighborhoodTypesCompatible(profile1: Profile, profile2: Profile): boolean {
    const compatiblePairs = [
      ['urban', 'suburban'],
      ['suburban', 'rural'],
    ];

    return compatiblePairs.some(
      ([type1, type2]) =>
        (profile1.neighborhood_type === type1 && profile2.neighborhood_type === type2) ||
        (profile1.neighborhood_type === type2 && profile2.neighborhood_type === type1),
    );
  }

  // ============================================
  // 2. HOUSE RULES SCORE (15%)
  // ============================================
  private calculateHouseRulesScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Cleanliness compatibility (25 points)
    if (profile1.cleanliness_level && profile2.cleanliness_level) {
      const cleanlinessMatch = this.getOrdinalMatch(
        profile1.cleanliness_level,
        profile2.cleanliness_level,
        ['minimal', 'relaxed', 'moderately_clean', 'very_clean'],
      );
      score += cleanlinessMatch * 25;
    }

    // Noise tolerance compatibility (25 points)
    if (profile1.noise_tolerance && profile2.noise_tolerance) {
      const noiseMatch = this.getOrdinalMatch(
        profile1.noise_tolerance,
        profile2.noise_tolerance,
        ['very_quiet', 'moderate', 'okay_with_noise', 'lively'],
      );
      score += noiseMatch * 25;
    }

    // Guest policy compatibility (25 points)
    if (profile1.overnight_guests_ok !== undefined && profile2.overnight_guests_ok !== undefined) {
      if (profile1.overnight_guests_ok === profile2.overnight_guests_ok) {
        score += 25;
      } else {
        score += 10; // Partial credit for flexibility
      }
    }

    // Privacy compatibility (25 points)
    if (profile1.privacy_level && profile2.privacy_level) {
      if (profile1.privacy_level === profile2.privacy_level) {
        score += 25;
      } else {
        score += 12; // Partial credit
      }
    }

    return Math.min(score, 100);
  }

  // ============================================
  // 3. LIFESTYLE SCORE (15%)
  // ============================================
  private calculateLifestyleScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score
    let factorsCompared = 0;
    let factorsMatched = 0;

    // Pet compatibility (CRITICAL - 20 points or dealbreaker)
    if (profile1.pets && !profile2.pet_friendly) return 0; // Dealbreaker
    if (profile2.pets && !profile1.pet_friendly) return 0; // Dealbreaker
    if (profile1.pets && profile2.pets) {
      score += 20;
    } else if (!profile1.pets && !profile2.pets) {
      score += 10; // Bonus for both not having pets
    }

    // Smoking compatibility (CRITICAL - 15 points or dealbreaker)
    if (profile1.smoking !== undefined && profile2.smoking !== undefined) {
      if (profile1.smoking !== profile2.smoking) {
        // Non-smoker with smoker is incompatible
        if (!profile1.smoking || !profile2.smoking) {
          return 0; // Dealbreaker
        }
      } else if (profile1.smoking === profile2.smoking) {
        score += 15;
      }
    }

    // Other lifestyle factors (15 points)
    const lifestyleFactors = [
      { key: 'cooking_frequency', weight: 5 },
      { key: 'fitness_level', weight: 5 },
      { key: 'eco_conscious', weight: 5 },
    ];

    lifestyleFactors.forEach(({ key, weight }) => {
      if ((profile1 as any)[key] !== undefined && (profile2 as any)[key] !== undefined) {
        factorsCompared++;
        if ((profile1 as any)[key] === (profile2 as any)[key]) {
          factorsMatched++;
          score += weight;
        }
      }
    });

    return Math.min(score, 100);
  }

  // ============================================
  // 4. SCHEDULE SCORE (15%)
  // ============================================
  private calculateScheduleScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Work schedule type (30 points)
    if (profile1.schedule_type === profile2.schedule_type) {
      score += 30;
    } else if (profile1.schedule_type === 'flexible' || profile2.schedule_type === 'flexible') {
      score += 15; // Flexible schedules are compatible with all
    }

    // Work from home compatibility (20 points)
    if (profile1.work_from_home === profile2.work_from_home) {
      score += 20;
    }

    // Morning/night person compatibility (30 points)
    if (profile1.morning_person !== undefined && profile2.morning_person !== undefined) {
      if (profile1.morning_person === profile2.morning_person) {
        score += 30;
      } else {
        score += 10; // Opposite schedules can work (minimal overlap)
      }
    }

    // Social frequency compatibility (20 points)
    if (profile1.social_frequency && profile2.social_frequency) {
      const socialMatch = this.getOrdinalMatch(
        profile1.social_frequency,
        profile2.social_frequency,
        ['very_private', 'prefer_quiet', 'somewhat_social', 'very_social'],
      );
      score += socialMatch * 20;
    }

    return Math.min(score, 100);
  }

  // ============================================
  // 5. BUDGET SCORE (15%)
  // ============================================
  private calculateBudgetScore(profile1: Profile, profile2: Profile): number {
    // Find overlapping budget range
    const overlap =
      Math.min(profile1.budget_max, profile2.budget_max) -
      Math.max(profile1.budget_min, profile2.budget_min);

    if (overlap <= 0) {
      return 0; // No budget overlap = incompatible
    }

    // Calculate overlap percentage
    const range1 = profile1.budget_max - profile1.budget_min;
    const range2 = profile2.budget_max - profile2.budget_min;
    const avgRange = (range1 + range2) / 2;

    const overlapPercentage = (overlap / avgRange) * 100;

    return Math.min(overlapPercentage, 100);
  }

  // ============================================
  // 6. MOVE-IN TIMING SCORE (10%)
  // ============================================
  private calculateMoveInScore(profile1: Profile, profile2: Profile): number {
    if (!profile1.move_in_date || !profile2.move_in_date) {
      return 50; // Default neutral score if dates not provided
    }

    const daysDiff = Math.abs(
      (new Date(profile1.move_in_date).getTime() - new Date(profile2.move_in_date).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Same week = 100 points, decreasing by ~3 points per week
    const score = Math.max(0, 100 - daysDiff / 7 * 3);

    return Math.round(score);
  }

  // ============================================
  // 7. LEASE TERMS SCORE (5%)
  // ============================================
  private calculateLeaseScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Lease length compatibility (50 points)
    if (profile1.preferred_lease_length && profile2.preferred_lease_length) {
      if (profile1.preferred_lease_length === profile2.preferred_lease_length) {
        score += 50;
      } else if (
        profile1.preferred_lease_length === 'flexible' ||
        profile2.preferred_lease_length === 'flexible'
      ) {
        score += 25; // Flexible is compatible with all
      }
    }

    // Commitment level compatibility (50 points)
    if (profile1.lease_commitment_level && profile2.lease_commitment_level) {
      const commitmentMatch = this.getOrdinalMatch(
        profile1.lease_commitment_level,
        profile2.lease_commitment_level,
        ['very_flexible', 'somewhat_flexible', 'committed', 'very_committed'],
      );
      score += commitmentMatch * 50;
    }

    return Math.min(score, 100);
  }

  // ============================================
  // 8. COMMUNICATION SCORE (5%)
  // ============================================
  private calculateCommunicationScore(profile1: Profile, profile2: Profile): number {
    let score = 50; // Base score

    // Communication style (50 points)
    if (profile1.communication_style && profile2.communication_style) {
      if (profile1.communication_style === profile2.communication_style) {
        score += 50;
      } else if (this.areCommunicationStylesCompatible(profile1, profile2)) {
        score += 25;
      }
    }

    // Conflict resolution (50 points)
    if (profile1.conflict_resolution_style && profile2.conflict_resolution_style) {
      if (profile1.conflict_resolution_style === profile2.conflict_resolution_style) {
        score += 50;
      } else if (
        profile1.conflict_resolution_style !== 'avoid' &&
        profile2.conflict_resolution_style !== 'avoid'
      ) {
        score += 25; // Any active conflict resolution is compatible
      }
    }

    return Math.min(score, 100);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Calculate match score for ordinal preferences
   * @returns 0-1 score (1 = perfect match, 0 = no match)
   */
  private getOrdinalMatch(value1: string, value2: string, orderedList: string[]): number {
    const index1 = orderedList.indexOf(value1);
    const index2 = orderedList.indexOf(value2);

    if (index1 === -1 || index2 === -1) return 0.5; // Default if not found

    if (index1 === index2) return 1.0; // Perfect match

    const diff = Math.abs(index1 - index2);
    const maxDiff = orderedList.length - 1;

    // Linear decay: 1 step away = 0.7, 2 steps = 0.3, 3+ steps = 0
    return Math.max(0, 1 - diff / maxDiff * 1.3);
  }

  /**
   * Check if communication styles are compatible
   */
  private areCommunicationStylesCompatible(profile1: Profile, profile2: Profile): boolean {
    const compatiblePairs = [
      ['very_direct', 'diplomatic'],
      ['diplomatic', 'indirect'],
    ];

    return compatiblePairs.some(
      ([style1, style2]) =>
        (profile1.communication_style === style1 && profile2.communication_style === style2) ||
        (profile1.communication_style === style2 && profile2.communication_style === style1),
    );
  }

  /**
   * Check for dealbreakers that would make pairing incompatible
   */
  private checkDealbreakers(
    profile1: Profile,
    profile2: Profile,
    scores: Record<string, number>,
  ): string[] {
    const dealbreakers: string[] = [];

    // Pet dealbreaker
    if (profile1.pets && !profile2.pet_friendly) {
      dealbreakers.push('User 1 has pets but User 2 is not pet-friendly');
    }
    if (profile2.pets && !profile1.pet_friendly) {
      dealbreakers.push('User 2 has pets but User 1 is not pet-friendly');
    }

    // Smoking dealbreaker
    if (profile1.smoking && !profile2.smoking) {
      dealbreakers.push('User 1 smokes but User 2 is non-smoking');
    }
    if (profile2.smoking && !profile1.smoking) {
      dealbreakers.push('User 2 smokes but User 1 is non-smoking');
    }

    // Budget dealbreaker (no overlap)
    if (scores.budget === 0) {
      dealbreakers.push('No budget overlap between users');
    }

    return dealbreakers;
  }
}

export default new EnhancedPairingService();
