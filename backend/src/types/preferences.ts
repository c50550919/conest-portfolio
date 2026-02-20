/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Enhanced Preference Types - FHA COMPLIANT
 *
 * Purpose: Define all user preference types for improved compatibility scoring
 * Date: 2025-11-07
 *
 * FHA COMPLIANCE: All fields are USER PREFERENCES, not protected characteristics
 *
 * These preferences power the 8-factor scoring system:
 * - Location (20%)
 * - House Rules (15%)
 * - Lifestyle (15%)
 * - Schedule (15%)
 * - Budget (15%)
 * - Move-in Timing (10%)
 * - Lease Terms (5%)
 * - Communication (5%)
 */

// ============================================
// 1. HOUSE RULES & LIVING STANDARDS
// ============================================
export interface HouseRulesPreferences {
  cleanliness_level?: 'very_clean' | 'moderately_clean' | 'relaxed' | 'minimal';
  cleaning_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  noise_tolerance?: 'very_quiet' | 'moderate' | 'okay_with_noise' | 'lively';
  quiet_hours_important?: boolean;
  quiet_hours_start?: string; // HH:MM:SS format
  quiet_hours_end?: string; // HH:MM:SS format
  overnight_guests_ok?: boolean;
  max_guest_nights_per_month?: number;
  advance_notice_for_guests?: boolean;
  shared_living_spaces?: 'very_shared' | 'somewhat_shared' | 'mostly_separate';
  kitchen_sharing_style?: 'shared_meals' | 'shared_appliances' | 'separate_everything';
  privacy_level?: 'very_private' | 'moderate' | 'open_door_policy';
  locked_bedroom_doors?: boolean;
}

// ============================================
// 2. LIFESTYLE HABITS
// ============================================
export interface LifestylePreferences {
  // Pets
  pets?: boolean; // Has pets
  pet_friendly?: boolean; // Willing to live with others' pets
  pet_types?: ('dog' | 'cat' | 'small_animal' | 'bird' | 'reptile')[];

  // Health & wellness
  smoking?: boolean;
  vaping?: boolean;
  alcohol_consumption?: 'never' | 'rarely' | 'socially' | 'regularly';
  cannabis_use?: boolean;

  // Diet & food
  dietary_restrictions?: ('vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten_free' | 'none')[];
  cooking_frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | 'daily';
  shared_meals_interest?: boolean;

  // Fitness & activity
  fitness_level?: 'very_active' | 'moderately_active' | 'somewhat_active' | 'sedentary';
  gym_at_home?: boolean;

  // Entertainment
  tv_watching_frequency?: 'never' | 'rarely' | 'sometimes' | 'often' | 'daily';
  music_volume?: 'quiet' | 'moderate' | 'loud';
  gaming?: boolean;

  // Environmental consciousness
  eco_conscious?: boolean;
  recycling_important?: boolean;
  composting?: boolean;
}

// ============================================
// 3. SCHEDULE COMPATIBILITY
// ============================================
export interface SchedulePreferences {
  // Work schedule
  schedule_type: 'flexible' | 'fixed' | 'shift_work';
  work_from_home: boolean;
  work_from_home_days?: number; // How many days per week
  morning_person?: boolean;
  typical_wake_time?: string; // HH:MM:SS format
  typical_bedtime?: string; // HH:MM:SS format

  // Social activity
  social_frequency?: 'very_social' | 'somewhat_social' | 'prefer_quiet' | 'very_private';
  guest_frequency?: 'often' | 'sometimes' | 'rarely' | 'never';
  prefer_shared_meals?: boolean;
  prefer_communal_activities?: boolean;
}

// ============================================
// 4. FINANCIAL PREFERENCES
// ============================================
export interface FinancialPreferences {
  // Budget
  budget_min: number;
  budget_max: number;

  // Expense sharing
  expense_splitting_method?: 'equal_split' | 'proportional_to_income' | 'by_usage' | 'flexible';
  payment_promptness?: 'always_early' | 'always_on_time' | 'usually_on_time' | 'sometimes_late';
  utility_consciousness?: boolean;
  shared_groceries?: boolean;
  shared_household_items?: boolean;

  // Verification
  credit_check_completed?: boolean;
  employment_verification_completed?: boolean;
}

// ============================================
// 5. LEASE PREFERENCES
// ============================================
export interface LeasePreferences {
  preferred_lease_length?: '6_months' | '1_year' | '2_years' | 'month_to_month' | 'flexible';
  lease_commitment_level?: 'very_committed' | 'committed' | 'somewhat_flexible' | 'very_flexible';
  move_in_date?: Date;
  lease_duration_months?: number;
}

// ============================================
// 6. COMMUNICATION PREFERENCES
// ============================================
export interface CommunicationPreferences {
  communication_style?: 'very_direct' | 'diplomatic' | 'indirect' | 'minimal';
  communication_frequency?: 'daily_check_ins' | 'weekly' | 'as_needed' | 'minimal';
  preferred_communication_method?: ('in_person' | 'text' | 'phone' | 'group_chat')[];
  conflict_resolution_style?: 'immediate_discussion' | 'cool_down_first' | 'mediation' | 'avoid';
  household_meeting_frequency?: 'weekly' | 'monthly' | 'as_needed' | 'never';
  boundary_communication?: 'very_explicit' | 'moderate' | 'flexible' | 'minimal';
  shared_calendar?: boolean;
  roommate_relationship?: 'close_friends' | 'friendly' | 'cordial' | 'professional_only';
}

// ============================================
// 7. LOCATION PREFERENCES
// ============================================
export interface LocationPreferences {
  // Current location
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;

  // Neighborhood preferences
  neighborhood_type?: 'urban' | 'suburban' | 'rural';
  walkability_important?: boolean;
  public_transit_important?: boolean;

  // Commute
  max_commute_time?: number; // minutes
  work_location_city?: string;
  work_location_zip?: string;
  commute_method?: ('car' | 'public_transit' | 'bike' | 'walk' | 'work_from_home')[];

  // Amenities proximity
  grocery_store_proximity?: 'walking' | 'short_drive' | 'not_important';
  school_proximity?: 'walking' | 'short_drive' | 'not_important';
  park_proximity?: 'walking' | 'short_drive' | 'not_important';

  // Parking
  parking_needed?: boolean;
  parking_type?: 'street' | 'driveway' | 'garage' | 'not_applicable';
}

// ============================================
// COMBINED PREFERENCES
// ============================================
export interface EnhancedPreferences
  extends HouseRulesPreferences,
    LifestylePreferences,
    SchedulePreferences,
    FinancialPreferences,
    LeasePreferences,
    CommunicationPreferences,
    LocationPreferences {}

// ============================================
// COMPATIBILITY BREAKDOWN
// ============================================
export interface CompatibilityBreakdown {
  totalScore: number; // 0-100
  breakdown: {
    location: number; // 0-100, weighted 20%
    house_rules: number; // 0-100, weighted 15%
    lifestyle: number; // 0-100, weighted 15%
    schedule: number; // 0-100, weighted 15%
    budget: number; // 0-100, weighted 15%
    move_in_timing: number; // 0-100, weighted 10%
    lease_terms: number; // 0-100, weighted 5%
    communication: number; // 0-100, weighted 5%
  };
  dealbreakers?: string[]; // List of dealbreaker reasons
}

// ============================================
// SCORING WEIGHTS
// ============================================
export const SCORING_WEIGHTS = {
  location: 0.20, // 20%
  house_rules: 0.15, // 15%
  lifestyle: 0.15, // 15%
  schedule: 0.15, // 15%
  budget: 0.15, // 15%
  move_in_timing: 0.10, // 10%
  lease_terms: 0.05, // 5%
  communication: 0.05, // 5%
} as const;

// Verify weights sum to 1.0
const totalWeight = Object.values(SCORING_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(totalWeight - 1.0) > 0.001) {
  throw new Error(`SCORING_WEIGHTS must sum to 1.0, got ${totalWeight}`);
}
