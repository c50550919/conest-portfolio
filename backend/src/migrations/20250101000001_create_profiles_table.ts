/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.date('date_of_birth').notNullable();
    table.text('bio');
    table.string('profile_image_url');

    // Location
    table.string('city').notNullable();
    table.string('state', 2).notNullable();
    table.string('zip_code', 5).notNullable();
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);

    // Housing preferences
    table.integer('budget_min').notNullable();
    table.integer('budget_max').notNullable();
    table.date('move_in_date');
    table.integer('lease_duration_months');

    // Parenting info (NO CHILD DATA - only parent info)
    table.integer('number_of_children').notNullable();
    table.string('ages_of_children').notNullable();
    table.string('parenting_style');

    // Compatibility factors
    table.enum('schedule_type', ['flexible', 'fixed', 'shift_work']).notNullable();
    table.boolean('work_from_home').defaultTo(false);
    table.boolean('pets');
    table.boolean('smoking');
    table.string('dietary_preferences');
    table.text('house_rules');

    // Verification status
    table.boolean('verified').defaultTo(false);
    table.enum('verification_level', ['none', 'basic', 'full']).defaultTo('none');

    table.timestamps(true, true);

    table.unique('user_id');
    table.index('city');
    table.index('state');
    table.index('zip_code');
    table.index('verified');
    table.index(['budget_min', 'budget_max']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('profiles');
}
