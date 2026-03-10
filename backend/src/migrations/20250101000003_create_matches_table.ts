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
  return knex.schema.createTable('matches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id_1').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('user_id_2').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.decimal('compatibility_score', 5, 2).notNullable();
    table.enum('status', ['pending', 'accepted', 'rejected', 'expired']).defaultTo('pending');

    // Score breakdown
    table.decimal('schedule_score', 5, 2).notNullable();
    table.decimal('parenting_score', 5, 2).notNullable();
    table.decimal('rules_score', 5, 2).notNullable();
    table.decimal('location_score', 5, 2).notNullable();
    table.decimal('budget_score', 5, 2).notNullable();
    table.decimal('lifestyle_score', 5, 2).notNullable();

    table.uuid('initiated_by').references('id').inTable('users').notNullable();
    table.timestamp('response_deadline');
    table.timestamp('matched_at');

    table.timestamps(true, true);

    table.index('user_id_1');
    table.index('user_id_2');
    table.index('status');
    table.index('compatibility_score');
    table.unique(['user_id_1', 'user_id_2']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('matches');
}
