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
  return knex.schema.createTable('verifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    // ID Verification (Jumio)
    table
      .enum('id_verification_status', ['pending', 'approved', 'rejected', 'expired'])
      .defaultTo('pending');
    table.timestamp('id_verification_date');
    table.text('id_verification_data'); // Encrypted

    // Background Check (Checkr)
    table
      .enum('background_check_status', ['pending', 'clear', 'consider', 'suspended'])
      .defaultTo('pending');
    table.timestamp('background_check_date');
    table.string('background_check_report_id');

    // Income Verification
    table
      .enum('income_verification_status', ['pending', 'verified', 'rejected'])
      .defaultTo('pending');
    table.timestamp('income_verification_date');
    table.string('income_range');

    // Phone Verification
    table.boolean('phone_verified').defaultTo(false);
    table.timestamp('phone_verification_date');

    // Email Verification
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verification_date');

    // Overall verification
    table.integer('verification_score').defaultTo(0);
    table.boolean('fully_verified').defaultTo(false);

    table.timestamps(true, true);

    table.unique('user_id');
    table.index('fully_verified');
    table.index('verification_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('verifications');
}
