import db from '../../config/database';
import { ProfileCard, DiscoveryResponse } from '../../types/ProfileCard';
import { calculateAge } from '../../utils/ageCalculator';
import DiscoveryCacheService from './cache/discovery-cache.service';
import { createAuditLog } from '../../services/auditService';
import logger from '../../config/logger';

/**
 * DiscoveryService
 *
 * Browse-based discovery using connection requests (not swipes).
 * Users can see profiles multiple times until they send a connection request.
 *
 * Filters out:
 * - Users with existing connection_requests (pending/accepted/declined)
 * - Users already matched with current user
 *
 * Does NOT filter:
 * - Saved profiles (users should still see them for comparison)
 *
 * Schema notes:
 * - date_of_birth → calculate age
 * - budget_min/budget_max → average budget
 * - children_age_groups is text[] not JSON
 * - profile_photo_url not profile_photo
 *
 * Updated: 2025-11-29 - Removed swipe-based filtering, using connection requests
 */

export class DiscoveryService {
  /**
   * Get user IDs to exclude from discovery feed
   * Based on existing connection requests and matches
   */
  private async getExcludedUserIds(userId: string): Promise<string[]> {
    // Get users with connection requests (as sender or recipient)
    const connectionRequests = await db('connection_requests')
      .where('sender_id', userId)
      .orWhere('recipient_id', userId)
      .select('sender_id', 'recipient_id');

    const connectionUserIds = connectionRequests.map(cr =>
      cr.sender_id === userId ? cr.recipient_id : cr.sender_id,
    );

    // Get users already matched with current user
    const matches = await db('matches')
      .where('user_id_1', userId)
      .orWhere('user_id_2', userId)
      .select('user_id_1', 'user_id_2');

    const matchedUserIds = matches.map(m =>
      m.user_id_1 === userId ? m.user_id_2 : m.user_id_1,
    );

    // Combine and deduplicate
    const excludedIds = [...new Set([...connectionUserIds, ...matchedUserIds])];

    return excludedIds;
  }

  async getProfiles(
    userId: string,
    limit: number = 10,
    cursor?: string,
    requestContext?: { ipAddress?: string; userAgent?: string },
  ): Promise<DiscoveryResponse> {
    // Get users to exclude (connection requests + matches)
    const excludedUserIds = await this.getExcludedUserIds(userId);

    let query = db('users as u')
      .join('parents as p', 'u.id', 'p.user_id')
      .join('verifications as v', 'u.id', 'v.user_id')
      .where('u.id', '!=', userId)
      .where('v.fully_verified', true)
      .select(
        'u.id as userId',
        'p.first_name as firstName',
        'p.date_of_birth as dateOfBirth',
        'p.city',
        'p.children_count as childrenCount',
        'p.children_age_groups as childrenAgeGroups',
        'p.budget_min as budgetMin',
        'p.budget_max as budgetMax',
        'p.move_in_date as moveInDate',
        'p.bio',
        'p.profile_photo_url as profilePhoto',
        'v.id_verification_status',
        'v.background_check_status',
        'v.phone_verified',
      );

    // Exclude users with existing connections or matches
    if (excludedUserIds.length > 0) {
      query = query.whereNotIn('u.id', excludedUserIds);
    }

    if (cursor) {
      query = query.where('u.id', '>', cursor);
    }

    query = query.orderBy('u.id', 'asc').limit(limit + 1);

    const results = await query;
    const hasMore = results.length > limit;
    const profiles = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? profiles[profiles.length - 1].userId : null;

    const userProfile = await this.getUserProfile(userId);
    const profileCards: ProfileCard[] = profiles.map(p => {
      const compatibilityScore = this.calculateCompatibility(userProfile, p);
      const age = calculateAge(p.dateOfBirth);
      const budget = p.budgetMin && p.budgetMax ? (p.budgetMin + p.budgetMax) / 2 : p.budgetMin || p.budgetMax || 0;

      // Parse children_age_groups - can be string (comma-separated) or array
      const childrenAgeGroups = Array.isArray(p.childrenAgeGroups)
        ? p.childrenAgeGroups
        : (typeof p.childrenAgeGroups === 'string' && p.childrenAgeGroups.length > 0)
          ? p.childrenAgeGroups.split(',').map((s: string) => s.trim())
          : [];

      return {
        userId: p.userId,
        firstName: p.firstName,
        age,
        city: p.city,
        childrenCount: p.childrenCount,
        childrenAgeGroups: childrenAgeGroups as ('toddler' | 'elementary' | 'teen')[],
        compatibilityScore,
        verificationStatus: {
          idVerified: p.id_verification_status === 'approved',
          backgroundCheckComplete: p.background_check_status === 'clear',
          phoneVerified: p.phone_verified,
        },
        budget,
        moveInDate: p.moveInDate ? new Date(p.moveInDate).toISOString() : undefined,
        bio: p.bio || undefined,
        profilePhoto: p.profilePhoto || undefined,
      };
    });

    profileCards.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // FHA COMPLIANCE: Audit log discovery feed request with preference-based scoring proof
    try {
      await createAuditLog({
        userId,
        operation: 'discovery.profiles_fetched',
        resource: 'discovery',
        action: 'read',
        status: 'success',
        ipAddress: requestContext?.ipAddress || 'unknown',
        userAgent: requestContext?.userAgent || 'unknown',
        metadata: {
          profileCount: profileCards.length,
          cursor,
          limit,
          scoringMethod: 'preference-based',
          scoringFactors: ['budget', 'location', 'move_in_timing'],
          familyCompositionUsed: false, // CRITICAL: Compliance proof
          algorithmVersion: '1.0-neutral',
          averageCompatibilityScore: profileCards.length > 0
            ? Math.round(profileCards.reduce((sum, p) => sum + p.compatibilityScore, 0) / profileCards.length)
            : 0,
        },
      });
    } catch (auditError) {
      // Log audit errors but don't fail the discovery request
      logger.error('Failed to create audit log for discovery request:', auditError);
    }

    return { profiles: profileCards, nextCursor };
  }

  private async getUserProfile(userId: string): Promise<any> {
    // Try cache first
    const cached = await DiscoveryCacheService.getCachedUserProfile(userId);
    if (cached) return cached;

    // Fetch from database
    const profile = await db('parents').where('user_id', userId).first();
    if (!profile) throw new Error('User profile not found');

    const enrichedProfile = {
      ...profile,
      budget: profile.budget_min && profile.budget_max ? (profile.budget_min + profile.budget_max) / 2 : profile.budget_min || profile.budget_max || 0,
    };

    // Cache for future requests
    await DiscoveryCacheService.cacheUserProfile(userId, enrichedProfile);

    return enrichedProfile;
  }

  /**
   * FHA COMPLIANCE: Calculate neutral compatibility based on PREFERENCE factors only
   *
   * REMOVED (FHA violation - family composition):
   * - Children age group overlap scoring
   * - Children count similarity scoring
   *
   * RETAINED (FHA compliant - user preferences):
   * - Budget compatibility (40 points) - financial preference
   * - Location proximity (40 points) - geographic preference
   * - Move-in date alignment (20 points) - timing preference
   *
   * This creates a neutral platform where users search based on their preferences,
   * not algorithmic discrimination on protected characteristics.
   */
  private calculateCompatibility(userProfile: any, targetProfile: any): number {
    let score = 0;

    // Budget compatibility (40 points) - User preference, not family composition
    const userBudget = userProfile.budget || 0;
    const targetBudget = (targetProfile.budgetMin && targetProfile.budgetMax)
      ? (targetProfile.budgetMin + targetProfile.budgetMax) / 2
      : targetProfile.budgetMin || targetProfile.budgetMax || 0;

    if (userBudget > 0 && targetBudget > 0) {
      const budgetDiff = Math.abs(userBudget - targetBudget);
      // $0 diff = 40 points, $4000+ diff = 0 points
      score += Math.min(Math.max(0, 40 - (budgetDiff / 100)), 40);
    }

    // Location proximity (40 points) - Geographic preference
    if (userProfile.city === targetProfile.city) {
      score += 40;
    }

    // Move-in date alignment (20 points) - Timing preference
    if (userProfile.move_in_date && targetProfile.moveInDate) {
      const daysDiff = Math.abs(
        (new Date(userProfile.move_in_date).getTime() - new Date(targetProfile.moveInDate).getTime())
        / (1000 * 60 * 60 * 24),
      );
      // Same week = 20 points, decreasing by ~3 points per week
      score += Math.min(Math.max(0, 20 - daysDiff / 7), 20);
    }

    return Math.round(score);
  }
}

export default new DiscoveryService();
