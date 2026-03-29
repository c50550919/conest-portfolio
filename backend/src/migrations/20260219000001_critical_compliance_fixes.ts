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
 * Migration: Critical Compliance Fixes
 *
 * Date: 2026-02-19
 * Source: /analyze --ultrathink compliance audit (12 CRITICAL findings)
 *
 * This migration addresses:
 * 1. CMP-01: Encrypt flagged_records (Constitution Principle III violation)
 *    - Change flagged_records from jsonb to text (stores encrypted string)
 * 2. CMP-02: Add encrypted flag to webhook events
 * 3. CMP-03: Add retention_expires_at for criminal record data retention
 * 4. CMP-04: Add pre_adverse status + notice date for FCRA adverse action
 * 5. CMP-07: Add ToS/Privacy consent timestamps to users
 *
 * All changes are additive/nullable — no breaking changes to existing data.
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // 1. VERIFICATIONS TABLE: Encryption + Retention + FCRA
  // ============================================================

  // Guard: only alter verifications table if it exists (may not in fresh DB)
  const hasVerifications = await knex.schema.hasTable('verifications');
  if (hasVerifications) {
    // Change flagged_records from jsonb to text (encrypted string storage)
    const hasFlaggedRecords = await knex.raw(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'verifications' AND column_name = 'flagged_records'
    `);
    if (hasFlaggedRecords.rows.length > 0) {
      await knex.raw(`
        ALTER TABLE verifications
        ALTER COLUMN flagged_records TYPE text
        USING flagged_records::text;
      `);
    }

    // Add retention expiration for criminal record data (CMP-03)
    await knex.schema.alterTable('verifications', (table) => {
      table.timestamp('retention_expires_at').nullable();
      table.timestamp('pre_adverse_notice_date').nullable();
    });

    // Update background_check_status constraint to include 'pre_adverse' (CMP-04)
    await knex.raw(`
      ALTER TABLE verifications
      DROP CONSTRAINT IF EXISTS chk_verifications_background_check_status;

      ALTER TABLE verifications
      ADD CONSTRAINT chk_verifications_background_check_status
        CHECK (background_check_status IN ('not_started', 'pending', 'approved', 'rejected', 'consider', 'expired', 'pre_adverse', 'clear'));
    `);

    // Index for retention worker daily cleanup
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_verifications_retention_expires
      ON verifications(retention_expires_at)
      WHERE retention_expires_at IS NOT NULL;
    `);

    // Index for FCRA adverse action worker
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_verifications_pre_adverse
      ON verifications(pre_adverse_notice_date)
      WHERE background_check_status = 'pre_adverse';
    `);
  }

  // ============================================================
  // 2. VERIFICATION_WEBHOOK_EVENTS TABLE: Encrypted flag
  // ============================================================
  const hasWebhookEvents = await knex.schema.hasTable('verification_webhook_events');
  if (hasWebhookEvents) {
    await knex.schema.alterTable('verification_webhook_events', (table) => {
      table.boolean('encrypted').notNullable().defaultTo(false);
    });
  }

  // ============================================================
  // 3. USERS TABLE: ToS/Privacy consent timestamps
  // ============================================================
  await knex.schema.alterTable('users', (table) => {
    table.timestamp('tos_accepted_at').nullable();
    table.timestamp('privacy_accepted_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove consent timestamps from users
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('tos_accepted_at');
    table.dropColumn('privacy_accepted_at');
  });

  // Remove encrypted flag from webhook events
  await knex.schema.alterTable('verification_webhook_events', (table) => {
    table.dropColumn('encrypted');
  });

  // Remove FCRA indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_verifications_pre_adverse;
    DROP INDEX IF EXISTS idx_verifications_retention_expires;
  `);

  // Revert background_check_status constraint (remove pre_adverse)
  await knex.raw(`
    ALTER TABLE verifications
    DROP CONSTRAINT IF EXISTS chk_verifications_background_check_status;

    ALTER TABLE verifications
    ADD CONSTRAINT chk_verifications_background_check_status
      CHECK (background_check_status IN ('not_started', 'pending', 'approved', 'rejected', 'consider', 'expired'));
  `);

  // Remove added columns from verifications
  await knex.schema.alterTable('verifications', (table) => {
    table.dropColumn('pre_adverse_notice_date');
    table.dropColumn('retention_expires_at');
  });

  // Revert flagged_records back to jsonb
  await knex.raw(`
    ALTER TABLE verifications
    ALTER COLUMN flagged_records TYPE jsonb
    USING CASE
      WHEN flagged_records IS NULL THEN NULL
      WHEN flagged_records::text ~ '^\\{' THEN flagged_records::jsonb
      ELSE NULL
    END;
  `);
}
