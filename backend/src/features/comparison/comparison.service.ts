/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Profile Comparison Service
 *
 * Purpose: Unified comparison service supporting both discovery and saved profiles
 * Feature: 003-complete-3-critical (Profile Comparison Tool)
 *
 * Architecture:
 * - Type-aware profile fetching (discovery vs saved)
 * - Ownership validation for saved profiles
 * - Unified data normalization
 * - Comparison limits enforcement
 *
 * Created: 2025-10-20
 */

import { Knex } from 'knex';
import db from '../../config/database';
import {
  ComparisonRequest,
  ValidatedComparisonRequest,
  ComparisonProfile,
  ComparisonResponse,
  COMPARISON_LIMITS,
  COMPARISON_ERRORS,
} from '../../types/comparison';

export class ProfileComparisonService {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  /**
   * Compare profiles from mixed sources (discovery + saved)
   */
  async compareProfiles(
    requestingUserId: string,
    requests: ComparisonRequest[],
  ): Promise<ComparisonResponse> {
    // Validate request count
    this.validateRequestCount(requests);

    // Validate and enrich requests
    const validatedRequests = await this.validateRequests(requestingUserId, requests);

    // Fetch profiles based on type
    const profiles = await Promise.all(
      validatedRequests.map((req) => this.fetchProfileByType(req)),
    );

    // Filter out nulls (not found profiles)
    const validProfiles = profiles.filter((p): p is ComparisonProfile => p !== null);

    if (validProfiles.length < COMPARISON_LIMITS.minProfiles) {
      throw new Error(COMPARISON_ERRORS.PROFILE_NOT_FOUND);
    }

    return {
      success: true,
      data: validProfiles,
      metadata: {
        totalProfiles: validProfiles.length,
        discoveryCount: validProfiles.filter((p) => p.sourceType === 'discovery').length,
        savedCount: validProfiles.filter((p) => p.sourceType === 'saved').length,
        requestedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate request count against limits
   */
  private validateRequestCount(requests: ComparisonRequest[]): void {
    if (
      requests.length < COMPARISON_LIMITS.minProfiles ||
      requests.length > COMPARISON_LIMITS.maxProfiles
    ) {
      throw new Error(COMPARISON_ERRORS.INVALID_COUNT);
    }
  }

  /**
   * Validate and enrich comparison requests
   */
  private async validateRequests(
    requestingUserId: string,
    requests: ComparisonRequest[],
  ): Promise<ValidatedComparisonRequest[]> {
    const validated: ValidatedComparisonRequest[] = [];

    for (const request of requests) {
      // Validate type
      if (request.type !== 'discovery' && request.type !== 'saved') {
        throw new Error(COMPARISON_ERRORS.INVALID_TYPE);
      }

      if (request.type === 'discovery') {
        // Discovery profile: id is userId
        validated.push({
          type: 'discovery',
          id: request.id,
          userId: request.id,
        });
      } else {
        // Saved profile: verify ownership and get userId
        const savedProfile = await this.db('saved_profiles')
          .where({ id: request.id, user_id: requestingUserId })
          .first();

        if (!savedProfile) {
          throw new Error(COMPARISON_ERRORS.UNAUTHORIZED);
        }

        validated.push({
          type: 'saved',
          id: request.id,
          savedProfileId: request.id,
          userId: savedProfile.profile_id,
        });
      }
    }

    return validated;
  }

  /**
   * Fetch profile data based on source type
   */
  private async fetchProfileByType(
    request: ValidatedComparisonRequest,
  ): Promise<ComparisonProfile | null> {
    if (request.type === 'discovery') {
      return this.fetchDiscoveryProfile(request.userId);
    } else {
      return this.fetchSavedProfile(request.savedProfileId!, request.userId);
    }
  }

  /**
   * Fetch discovery profile (from users + parents tables)
   */
  private async fetchDiscoveryProfile(userId: string): Promise<ComparisonProfile | null> {
    const result = await this.db('users as u')
      .join('parents as p', 'u.id', 'p.user_id')
      .where('u.id', userId)
      .select(
        'u.id as user_id',
        'p.first_name',
        'p.date_of_birth',
        'p.city',
        'p.state',
        'p.children_count',
        'p.budget_min',
        'p.budget_max',
        'p.move_in_date',
        'p.work_schedule',
        'p.household_preferences',
        'p.dietary_restrictions',
        'p.allergies',
        'u.email_verified as is_verified',
      )
      .first();

    if (!result) {
      return null;
    }

    // Extract data from JSONB household_preferences
    const prefs = result.household_preferences || {};

    return {
      sourceType: 'discovery',
      profileId: userId,
      userId: result.user_id,
      profile: {
        firstName: result.first_name,
        age: this.calculateAge(result.date_of_birth),
        city: result.city,
        state: result.state,
        childrenCount: result.children_count || 0,
        housingBudget: result.budget_max || result.budget_min,
        moveInDate: result.move_in_date,
        workSchedule: result.work_schedule,
        hasPets: prefs.hasPets || prefs.has_pets || false,
        smoking: prefs.smoking || 'no',
        isVerified: result.is_verified || false,
        cleanlinessLevel: prefs.cleanliness || prefs.cleanlinessLevel,
        noiseLevel: prefs.noise || prefs.noiseLevel,
        guestPolicy: prefs.guestPolicy || prefs.guests,
        sharingPreferences: prefs.sharingPreferences || prefs.sharing,
        dietaryRestrictions: result.dietary_restrictions,
        allergies: result.allergies,
      },
    };
  }

  /**
   * Fetch saved profile (from saved_profiles + users + parents tables)
   */
  private async fetchSavedProfile(
    savedProfileId: string,
    _userId: string,
  ): Promise<ComparisonProfile | null> {
    const result = await this.db('saved_profiles as sp')
      .join('users as u', 'sp.profile_id', 'u.id')
      .join('parents as p', 'u.id', 'p.user_id')
      .where('sp.id', savedProfileId)
      .select(
        'sp.id as saved_profile_id',
        'sp.folder',
        'sp.notes_encrypted',
        'sp.saved_at',
        'u.id as user_id',
        'p.first_name',
        'p.date_of_birth',
        'p.city',
        'p.state',
        'p.children_count',
        'p.budget_min',
        'p.budget_max',
        'p.move_in_date',
        'p.work_schedule',
        'p.household_preferences',
        'p.dietary_restrictions',
        'p.allergies',
        'u.email_verified as is_verified',
      )
      .first();

    if (!result) {
      return null;
    }

    // Extract data from JSONB household_preferences
    const prefs = result.household_preferences || {};

    return {
      sourceType: 'saved',
      profileId: savedProfileId,
      userId: result.user_id,
      profile: {
        firstName: result.first_name,
        age: this.calculateAge(result.date_of_birth),
        city: result.city,
        state: result.state,
        childrenCount: result.children_count || 0,
        housingBudget: result.budget_max || result.budget_min,
        moveInDate: result.move_in_date,
        workSchedule: result.work_schedule,
        hasPets: prefs.hasPets || prefs.has_pets || false,
        smoking: prefs.smoking || 'no',
        isVerified: result.is_verified || false,
        cleanlinessLevel: prefs.cleanliness || prefs.cleanlinessLevel,
        noiseLevel: prefs.noise || prefs.noiseLevel,
        guestPolicy: prefs.guestPolicy || prefs.guests,
        sharingPreferences: prefs.sharingPreferences || prefs.sharing,
        dietaryRestrictions: result.dietary_restrictions,
        allergies: result.allergies,
        // Saved profile metadata
        folder: result.folder,
        notes: result.notes_encrypted ? '[Encrypted]' : undefined,
        savedAt: result.saved_at,
      },
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}

export default new ProfileComparisonService();
