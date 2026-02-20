/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Knex } from 'knex';

/**
 * Migration: Add Enhanced Preference-Based Scoring Fields
 *
 * Purpose: Add new FHA-compliant preference fields for improved compatibility scoring
 * Date: 2025-11-07
 *
 * FHA COMPLIANCE: All fields are USER PREFERENCES, not protected characteristics
 *
 * New Scoring System (8 factors, 100% preference-based):
 * - Location preferences (20%)
 * - House rules & cleanliness (15%)
 * - Lifestyle habits (15%)
 * - Schedule compatibility (15%)
 * - Budget preferences (15%)
 * - Move-in timing (10%)
 * - Lease term preferences (5%)
 * - Communication style (5%)
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profiles', (table) => {
    // ============================================
    // 1. HOUSE RULES & LIVING STANDARDS (15%)
    // ============================================
    table.string('cleanliness_level', 50); // 'very_clean', 'moderately_clean', 'relaxed', 'minimal'
    table.string('cleaning_frequency', 50); // 'daily', 'weekly', 'biweekly', 'monthly'
    table.string('noise_tolerance', 50); // 'very_quiet', 'moderate', 'okay_with_noise', 'lively'
    table.boolean('quiet_hours_important').defaultTo(false);
    table.time('quiet_hours_start'); // e.g., '22:00:00'
    table.time('quiet_hours_end'); // e.g., '08:00:00'
    table.boolean('overnight_guests_ok').defaultTo(true);
    table.integer('max_guest_nights_per_month'); // e.g., 10
    table.boolean('advance_notice_for_guests').defaultTo(false);
    table.string('shared_living_spaces', 50); // 'very_shared', 'somewhat_shared', 'mostly_separate'
    table.string('kitchen_sharing_style', 50); // 'shared_meals', 'shared_appliances', 'separate_everything'
    table.string('privacy_level', 50); // 'very_private', 'moderate', 'open_door_policy'
    table.boolean('locked_bedroom_doors').defaultTo(true);

    // ============================================
    // 2. LIFESTYLE HABITS (15%)
    // ============================================
    // Pets (expand existing)
    table.boolean('pet_friendly').defaultTo(false); // Willing to live with others' pets
    table.jsonb('pet_types'); // ['dog', 'cat', 'small_animal', 'bird', 'reptile']

    // Health & wellness (expand existing smoking field)
    table.boolean('vaping').defaultTo(false);
    table.string('alcohol_consumption', 50); // 'never', 'rarely', 'socially', 'regularly'
    table.boolean('cannabis_use').defaultTo(false);

    // Diet & food
    table.jsonb('dietary_restrictions'); // ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'none']
    table.string('cooking_frequency', 50); // 'never', 'rarely', 'sometimes', 'often', 'daily'
    table.boolean('shared_meals_interest').defaultTo(false);

    // Fitness & activity
    table.string('fitness_level', 50); // 'very_active', 'moderately_active', 'somewhat_active', 'sedentary'
    table.boolean('gym_at_home').defaultTo(false);

    // Entertainment
    table.string('tv_watching_frequency', 50); // 'never', 'rarely', 'sometimes', 'often', 'daily'
    table.string('music_volume', 50); // 'quiet', 'moderate', 'loud'
    table.boolean('gaming').defaultTo(false);

    // Environmental consciousness
    table.boolean('eco_conscious').defaultTo(false);
    table.boolean('recycling_important').defaultTo(false);
    table.boolean('composting').defaultTo(false);

    // ============================================
    // 3. SCHEDULE COMPATIBILITY (15%)
    // ============================================
    // Work schedule (expand existing)
    table.integer('work_from_home_days'); // How many days per week
    table.boolean('morning_person').defaultTo(true);
    table.time('typical_wake_time'); // e.g., '06:00:00'
    table.time('typical_bedtime'); // e.g., '22:00:00'

    // Social activity
    table.string('social_frequency', 50); // 'very_social', 'somewhat_social', 'prefer_quiet', 'very_private'
    table.string('guest_frequency', 50); // 'often', 'sometimes', 'rarely', 'never'
    table.boolean('prefer_shared_meals').defaultTo(false);
    table.boolean('prefer_communal_activities').defaultTo(false);

    // ============================================
    // 4. FINANCIAL PREFERENCES (15%)
    // ============================================
    table.string('expense_splitting_method', 50); // 'equal_split', 'proportional_to_income', 'by_usage', 'flexible'
    table.string('payment_promptness', 50); // 'always_early', 'always_on_time', 'usually_on_time', 'sometimes_late'
    table.boolean('utility_consciousness').defaultTo(true); // Conscious about utility usage
    table.boolean('shared_groceries').defaultTo(false);
    table.boolean('shared_household_items').defaultTo(true);
    table.boolean('credit_check_completed').defaultTo(false);
    table.boolean('employment_verification_completed').defaultTo(false);

    // ============================================
    // 5. LEASE PREFERENCES (5%)
    // ============================================
    table.string('preferred_lease_length', 50); // '6_months', '1_year', '2_years', 'month_to_month', 'flexible'
    table.string('lease_commitment_level', 50); // 'very_committed', 'committed', 'somewhat_flexible', 'very_flexible'

    // ============================================
    // 6. COMMUNICATION PREFERENCES (5%)
    // ============================================
    table.string('communication_style', 50); // 'very_direct', 'diplomatic', 'indirect', 'minimal'
    table.string('communication_frequency', 50); // 'daily_check_ins', 'weekly', 'as_needed', 'minimal'
    table.jsonb('preferred_communication_method'); // ['in_person', 'text', 'phone', 'group_chat']
    table.string('conflict_resolution_style', 50); // 'immediate_discussion', 'cool_down_first', 'mediation', 'avoid'
    table.string('household_meeting_frequency', 50); // 'weekly', 'monthly', 'as_needed', 'never'
    table.string('boundary_communication', 50); // 'very_explicit', 'moderate', 'flexible', 'minimal'
    table.boolean('shared_calendar').defaultTo(false);
    table.string('roommate_relationship', 50); // 'close_friends', 'friendly', 'cordial', 'professional_only'

    // ============================================
    // 7. LOCATION PREFERENCES (20%)
    // ============================================
    table.string('neighborhood_type', 50); // 'urban', 'suburban', 'rural'
    table.boolean('walkability_important').defaultTo(false);
    table.boolean('public_transit_important').defaultTo(false);
    table.integer('max_commute_time'); // minutes
    table.string('work_location_city');
    table.string('work_location_zip');
    table.jsonb('commute_method'); // ['car', 'public_transit', 'bike', 'walk', 'work_from_home']
    table.string('grocery_store_proximity', 50); // 'walking', 'short_drive', 'not_important'
    table.string('school_proximity', 50); // 'walking', 'short_drive', 'not_important'
    table.string('park_proximity', 50); // 'walking', 'short_drive', 'not_important'
    table.boolean('parking_needed').defaultTo(false);
    table.string('parking_type', 50); // 'street', 'driveway', 'garage', 'not_applicable'

    // ============================================
    // INDEXES FOR PERFORMANCE
    // ============================================
    table.index('cleanliness_level');
    table.index('noise_tolerance');
    table.index('pet_friendly');
    table.index('smoking');
    table.index('neighborhood_type');
    table.index('preferred_lease_length');
  });

  console.log('✅ Enhanced preference fields added to profiles table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('profiles', (table) => {
    // House rules & living standards
    table.dropColumn('cleanliness_level');
    table.dropColumn('cleaning_frequency');
    table.dropColumn('noise_tolerance');
    table.dropColumn('quiet_hours_important');
    table.dropColumn('quiet_hours_start');
    table.dropColumn('quiet_hours_end');
    table.dropColumn('overnight_guests_ok');
    table.dropColumn('max_guest_nights_per_month');
    table.dropColumn('advance_notice_for_guests');
    table.dropColumn('shared_living_spaces');
    table.dropColumn('kitchen_sharing_style');
    table.dropColumn('privacy_level');
    table.dropColumn('locked_bedroom_doors');

    // Lifestyle habits
    table.dropColumn('pet_friendly');
    table.dropColumn('pet_types');
    table.dropColumn('vaping');
    table.dropColumn('alcohol_consumption');
    table.dropColumn('cannabis_use');
    table.dropColumn('dietary_restrictions');
    table.dropColumn('cooking_frequency');
    table.dropColumn('shared_meals_interest');
    table.dropColumn('fitness_level');
    table.dropColumn('gym_at_home');
    table.dropColumn('tv_watching_frequency');
    table.dropColumn('music_volume');
    table.dropColumn('gaming');
    table.dropColumn('eco_conscious');
    table.dropColumn('recycling_important');
    table.dropColumn('composting');

    // Schedule compatibility
    table.dropColumn('work_from_home_days');
    table.dropColumn('morning_person');
    table.dropColumn('typical_wake_time');
    table.dropColumn('typical_bedtime');
    table.dropColumn('social_frequency');
    table.dropColumn('guest_frequency');
    table.dropColumn('prefer_shared_meals');
    table.dropColumn('prefer_communal_activities');

    // Financial preferences
    table.dropColumn('expense_splitting_method');
    table.dropColumn('payment_promptness');
    table.dropColumn('utility_consciousness');
    table.dropColumn('shared_groceries');
    table.dropColumn('shared_household_items');
    table.dropColumn('credit_check_completed');
    table.dropColumn('employment_verification_completed');

    // Lease preferences
    table.dropColumn('preferred_lease_length');
    table.dropColumn('lease_commitment_level');

    // Communication preferences
    table.dropColumn('communication_style');
    table.dropColumn('communication_frequency');
    table.dropColumn('preferred_communication_method');
    table.dropColumn('conflict_resolution_style');
    table.dropColumn('household_meeting_frequency');
    table.dropColumn('boundary_communication');
    table.dropColumn('shared_calendar');
    table.dropColumn('roommate_relationship');

    // Location preferences
    table.dropColumn('neighborhood_type');
    table.dropColumn('walkability_important');
    table.dropColumn('public_transit_important');
    table.dropColumn('max_commute_time');
    table.dropColumn('work_location_city');
    table.dropColumn('work_location_zip');
    table.dropColumn('commute_method');
    table.dropColumn('grocery_store_proximity');
    table.dropColumn('school_proximity');
    table.dropColumn('park_proximity');
    table.dropColumn('parking_needed');
    table.dropColumn('parking_type');
  });

  console.log('✅ Enhanced preference fields removed from profiles table');
}
