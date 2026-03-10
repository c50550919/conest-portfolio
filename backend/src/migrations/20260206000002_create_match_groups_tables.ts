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
 * Migration: Create Match Groups Schema
 *
 * Purpose: Phase 2-ready schema for Village Formation (group matching)
 * Date: 2026-02-06
 *
 * Creates the match_groups and match_group_members tables to support
 * future N-way matching (pairs, trios, quads). No algorithm or service
 * code is included — this is schema-only preparation.
 *
 * The existing 1:1 matches table continues to handle pair matching.
 * match_groups will handle group formations in Phase 2+.
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('match_groups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enum('type', ['pair', 'trio', 'quad']).notNullable().defaultTo('pair');
    table.enum('status', ['forming', 'active', 'dissolved']).notNullable().defaultTo('forming');
    table.timestamps(true, true);

    table.index('type');
    table.index('status');
  });

  await knex.schema.createTable('match_group_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('match_group_id')
      .references('id')
      .inTable('match_groups')
      .onDelete('CASCADE')
      .notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.enum('role', ['initiator', 'member']).notNullable().defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.index('match_group_id');
    table.index('user_id');
    table.unique(['match_group_id', 'user_id']);
  });

  console.log('match_groups and match_group_members tables created');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('match_group_members');
  await knex.schema.dropTableIfExists('match_groups');

  console.log('match_groups and match_group_members tables dropped');
}
