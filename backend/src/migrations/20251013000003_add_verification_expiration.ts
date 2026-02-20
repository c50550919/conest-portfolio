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
 * Migration: Add verification expiration fields
 *
 * Feature: 003-complete-3-critical (Verification Flow Completion)
 * Constitution Principle I: NO child PII - only parent data
 *
 * Entity: Verification (extension)
 * - 1-year expiration cycle for ID and background checks
 * - 30-day advance notice, 7-day grace period
 * - Phone and email verification never expire
 * - Income verification optional (no expiration)
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('verifications', (table) => {
    // Expiration dates (1 year from verification_date)
    table.timestamp('id_expiration_date').nullable();
    table.timestamp('bg_check_expiration_date').nullable();

    // Reminder tracking (30-day advance notice)
    table.timestamp('reminder_sent_at').nullable();

    // Grace period (7 days after expiration)
    table.timestamp('grace_period_start').nullable();
  });

  // Indexes for cron job queries
  await knex.raw(`
    CREATE INDEX idx_verifications_id_expiration
    ON verifications(id_expiration_date)
    WHERE id_verification_status = 'approved';

    CREATE INDEX idx_verifications_bg_expiration
    ON verifications(bg_check_expiration_date)
    WHERE background_check_status = 'clear';

    CREATE INDEX idx_verifications_reminder
    ON verifications(id_expiration_date, reminder_sent_at)
    WHERE reminder_sent_at IS NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.raw(`
    DROP INDEX IF EXISTS idx_verifications_reminder;
    DROP INDEX IF EXISTS idx_verifications_bg_expiration;
    DROP INDEX IF EXISTS idx_verifications_id_expiration;
  `);

  // Drop columns
  await knex.schema.alterTable('verifications', (table) => {
    table.dropColumn('grace_period_start');
    table.dropColumn('reminder_sent_at');
    table.dropColumn('bg_check_expiration_date');
    table.dropColumn('id_expiration_date');
  });
}
