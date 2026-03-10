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
 * Migration: Rename children fields for Constitution compliance
 *
 * CRITICAL: Child Safety Compliance (Constitution Principle I)
 *
 * Renames columns to match constitutional naming standards:
 * - number_of_children → children_count (INTEGER)
 * - ages_of_children → children_age_groups (TEXT[])
 *
 * These fields contain ONLY:
 * - children_count: Integer count (e.g., 1, 2, 3)
 * - children_age_groups: Generic age ranges ['toddler', 'elementary', 'teen']
 *
 * PROHIBITED data (NEVER stored):
 * - Child names, photos, exact ages, schools, or any PII
 *
 * Test Coverage: 100% required for compliance modules (non-negotiable)
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('profiles', (table) => {
    // Rename to constitutional naming standard
    table.renameColumn('number_of_children', 'children_count');
    table.renameColumn('ages_of_children', 'children_age_groups');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('profiles', (table) => {
    table.renameColumn('children_count', 'number_of_children');
    table.renameColumn('children_age_groups', 'ages_of_children');
  });
}
