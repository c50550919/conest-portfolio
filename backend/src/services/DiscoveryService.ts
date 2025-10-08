import db from '../config/database';
import SwipeModel from '../models/Swipe';
import { ProfileCard, DiscoveryResponse } from '../types/ProfileCard';
import { calculateAge } from '../utils/ageCalculator';
import DiscoveryCacheService from './cache/DiscoveryCacheService';

/**
 * DiscoveryService
 *
 * Fixed to use correct database schema:
 * - date_of_birth → calculate age
 * - budget_min/budget_max → average budget
 * - children_age_groups is text[] not JSON
 * - profile_photo_url not profile_photo
 */

export class DiscoveryService {
  async getProfiles(
    userId: string,
    limit: number = 10,
    cursor?: string
  ): Promise<DiscoveryResponse> {
    const swipedUserIds = await SwipeModel.getSwipedUserIds(userId);

    let query = db('users as u')
      .join('profiles as p', 'u.id', 'p.user_id')
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
        'p.profile_image_url as profilePhoto',
        'v.id_verification_status',
        'v.background_check_status',
        'v.phone_verified'
      );

    if (swipedUserIds.length > 0) {
      query = query.whereNotIn('u.id', swipedUserIds);
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

    return { profiles: profileCards, nextCursor };
  }

  private async getUserProfile(userId: string): Promise<any> {
    // Try cache first
    const cached = await DiscoveryCacheService.getCachedUserProfile(userId);
    if (cached) return cached;

    // Fetch from database
    const profile = await db('profiles').where('user_id', userId).first();
    if (!profile) throw new Error('User profile not found');

    const enrichedProfile = {
      ...profile,
      budget: profile.budget_min && profile.budget_max ? (profile.budget_min + profile.budget_max) / 2 : profile.budget_min || profile.budget_max || 0,
    };

    // Cache for future requests
    await DiscoveryCacheService.cacheUserProfile(userId, enrichedProfile);

    return enrichedProfile;
  }

  private calculateCompatibility(userProfile: any, targetProfile: any): number {
    let score = 0;

    // Parse children_age_groups - can be string (comma-separated) or array
    const userAgeGroups = Array.isArray(userProfile.children_age_groups)
      ? userProfile.children_age_groups
      : (typeof userProfile.children_age_groups === 'string' && userProfile.children_age_groups.length > 0)
        ? userProfile.children_age_groups.split(',').map((s: string) => s.trim())
        : [];

    const targetAgeGroups = Array.isArray(targetProfile.childrenAgeGroups)
      ? targetProfile.childrenAgeGroups
      : (typeof targetProfile.childrenAgeGroups === 'string' && targetProfile.childrenAgeGroups.length > 0)
        ? targetProfile.childrenAgeGroups.split(',').map((s: string) => s.trim())
        : [];

    const ageGroupOverlap = userAgeGroups.filter((ag: string) => targetAgeGroups.includes(ag)).length;
    const maxAgeGroups = Math.max(userAgeGroups.length, targetAgeGroups.length);
    if (maxAgeGroups > 0) score += (ageGroupOverlap / maxAgeGroups) * 30;

    const userBudget = userProfile.budget || 0;
    const targetBudget = (targetProfile.budgetMin && targetProfile.budgetMax) ? (targetProfile.budgetMin + targetProfile.budgetMax) / 2 : targetProfile.budgetMin || targetProfile.budgetMax || 0;
    const budgetDiff = Math.abs(userBudget - targetBudget);
    score += Math.min(Math.max(0, 20 - (budgetDiff / 100)), 20);

    if (userProfile.city === targetProfile.city) score += 20;

    const childrenDiff = Math.abs(userProfile.children_count - targetProfile.childrenCount);
    score += Math.min(Math.max(0, 15 - childrenDiff * 5), 15);

    if (userProfile.move_in_date && targetProfile.moveInDate) {
      const daysDiff = Math.abs((new Date(userProfile.move_in_date).getTime() - new Date(targetProfile.moveInDate).getTime()) / (1000 * 60 * 60 * 24));
      score += Math.min(Math.max(0, 15 - daysDiff / 7), 15);
    }

    return Math.round(score);
  }
}

export default new DiscoveryService();
