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
 * Migration: Add Village Living Preference Fields
 *
 * Purpose: Phase 1 "Village-Ready" fields for market validation
 * Date: 2026-02-06
 *
 * Adds user preference fields to track interest in group/village living
 * arrangements (3+ adults sharing a household). This data validates demand
 * before building the full Village Formation algorithm in Phase 2.
 *
 * FHA COMPLIANCE: All fields are USER PREFERENCES (housing arrangement
 * preference), not protected characteristics or family composition.
 */

export async function up(knex: Knex): Promise<void> {
  const hasProfilesTable = await knex.schema.hasTable('profiles');
  const hasParentsTable = await knex.schema.hasTable('parents');

  // Add to profiles table if it exists (onboarding writes here)
  if (hasProfilesTable) {
    await knex.schema.alterTable('profiles', (table) => {
      table.boolean('open_to_group_living').defaultTo(false);
      table.integer('preferred_household_size').defaultTo(2);
      table.index('open_to_group_living');
    });

    await knex.raw(`
      ALTER TABLE profiles
      ADD CONSTRAINT chk_profiles_preferred_household_size
      CHECK (preferred_household_size >= 2 AND preferred_household_size <= 6)
    `);
  }

  // Add to parents table if it exists (discovery service reads from here)
  if (hasParentsTable) {
    await knex.schema.alterTable('parents', (table) => {
      table.boolean('open_to_group_living').defaultTo(false);
      table.integer('preferred_household_size').defaultTo(2);
      table.index('open_to_group_living');
    });

    await knex.raw(`
      ALTER TABLE parents
      ADD CONSTRAINT chk_parents_preferred_household_size
      CHECK (preferred_household_size >= 2 AND preferred_household_size <= 6)
    `);
  }

  const tables = [hasProfilesTable && 'profiles', hasParentsTable && 'parents'].filter(Boolean);
  console.log(
    `Village living preference fields added to: ${tables.join(', ') || 'no tables found'}`,
  );
}

export async function down(knex: Knex): Promise<void> {
  const hasParentsTable = await knex.schema.hasTable('parents');
  const hasProfilesTable = await knex.schema.hasTable('profiles');

  if (hasParentsTable) {
    await knex.raw(`
      ALTER TABLE parents
      DROP CONSTRAINT IF EXISTS chk_parents_preferred_household_size
    `);
    await knex.schema.alterTable('parents', (table) => {
      table.dropIndex('open_to_group_living');
      table.dropColumn('preferred_household_size');
      table.dropColumn('open_to_group_living');
    });
  }

  if (hasProfilesTable) {
    await knex.raw(`
      ALTER TABLE profiles
      DROP CONSTRAINT IF EXISTS chk_profiles_preferred_household_size
    `);
    await knex.schema.alterTable('profiles', (table) => {
      table.dropIndex('open_to_group_living');
      table.dropColumn('preferred_household_size');
      table.dropColumn('open_to_group_living');
    });
  }

  console.log('Village living preference fields removed');
}
