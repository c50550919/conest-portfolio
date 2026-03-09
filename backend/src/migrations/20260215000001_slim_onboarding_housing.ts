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
 * Migration: Slim Onboarding + Housing Status
 *
 * Date: 2026-02-15
 * Purpose:
 *   1. Make children_count and children_age_groups optional (default 0 / '{}')
 *   2. Ensure date_of_birth is nullable
 *   3. Replace looking_for_housing boolean with housing_status enum + room fields
 *   4. Add indexes for housing status queries
 *
 * Ref: specs/005-slim-onboarding-housing/data-model.md §1
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('parents', (table) => {
    // 1. Make children fields optional with defaults
    table.integer('children_count').defaultTo(0).alter();
  });

  // children_age_groups default needs raw SQL for array default
  await knex.raw(`
    ALTER TABLE parents
    ALTER COLUMN children_age_groups SET DEFAULT '{}',
    ALTER COLUMN children_age_groups DROP NOT NULL
  `);

  // Ensure date_of_birth is nullable
  await knex.raw(`
    ALTER TABLE parents
    ALTER COLUMN date_of_birth DROP NOT NULL
  `);

  // 2. Add housing_status and room fields
  await knex.schema.alterTable('parents', (table) => {
    table.string('housing_status', 20).nullable().defaultTo(null);
    table.integer('room_rent_share').nullable();
    table.date('room_available_date').nullable();
    table.string('room_description', 200).nullable();
    table.text('room_photo_url').nullable();
  });

  // 3. Data migration: convert looking_for_housing to housing_status
  await knex.raw(`
    UPDATE parents SET housing_status = 'looking' WHERE looking_for_housing = true
  `);
  await knex.raw(`
    UPDATE parents SET housing_status = NULL WHERE looking_for_housing = false OR looking_for_housing IS NULL
  `);

  // 4. Drop the old column
  await knex.schema.alterTable('parents', (table) => {
    table.dropColumn('looking_for_housing');
  });

  // 5. Add indexes
  await knex.schema.alterTable('parents', (table) => {
    table.index(['housing_status'], 'idx_parents_housing_status');
    table.index(['city', 'housing_status'], 'idx_parents_city_housing');
  });
}

export async function down(knex: Knex): Promise<void> {
  // 1. Drop indexes
  await knex.schema.alterTable('parents', (table) => {
    table.dropIndex([], 'idx_parents_city_housing');
    table.dropIndex([], 'idx_parents_housing_status');
  });

  // 2. Add back looking_for_housing
  await knex.schema.alterTable('parents', (table) => {
    table.boolean('looking_for_housing').defaultTo(true);
  });

  // 3. Reverse data migration
  await knex.raw(`
    UPDATE parents SET looking_for_housing = true WHERE housing_status = 'looking'
  `);
  await knex.raw(`
    UPDATE parents SET looking_for_housing = false WHERE housing_status IS NULL OR housing_status = 'has_room'
  `);

  // 4. Drop new columns
  await knex.schema.alterTable('parents', (table) => {
    table.dropColumn('room_photo_url');
    table.dropColumn('room_description');
    table.dropColumn('room_available_date');
    table.dropColumn('room_rent_share');
    table.dropColumn('housing_status');
  });

  // 5. Restore NOT NULL on children fields
  await knex.raw(`
    ALTER TABLE parents
    ALTER COLUMN children_age_groups SET NOT NULL,
    ALTER COLUMN children_age_groups SET DEFAULT '{}'
  `);

  await knex.raw(`
    ALTER TABLE parents
    ALTER COLUMN children_count SET NOT NULL
  `);

  // Restore date_of_birth NOT NULL (may fail if null data exists)
  await knex.raw(`
    ALTER TABLE parents
    ALTER COLUMN date_of_birth SET NOT NULL
  `);
}
