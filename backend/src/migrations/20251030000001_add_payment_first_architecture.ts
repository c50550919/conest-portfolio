import { Knex } from 'knex';

/**
 * Migration: Add Payment-First Architecture
 *
 * Feature: 003-complete-3-critical (Payment-First Verification)
 * Date: 2025-10-30
 *
 * This migration adds the payment-first architecture components:
 * 1. verification_payments table - Payment tracking with Stripe
 * 2. pre_qualification_responses table - Pre-qualification questions
 * 3. Update connection_requests - Add payment tracking fields
 * 4. Update verifications - Add dual-provider and admin review fields
 *
 * Payment Flow: Match → Pay $39 → Background Check → Unlock Connection
 * Refund Policy: 100% automated_fail, 40% courtesy_30day
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // 1. CREATE verification_payments TABLE (NEW)
  // ============================================================
  await knex.schema.createTable('verification_payments', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('connection_request_id').nullable().references('id').inTable('connection_requests').onDelete('SET NULL');

    // Payment details
    table.integer('amount').notNullable().defaultTo(3900); // $39.00 in cents
    table.string('stripe_payment_intent_id', 255).unique().notNullable();
    table.string('status', 20).notNullable().defaultTo('pending');

    // Refund tracking
    table.integer('refund_amount').defaultTo(0);
    table.string('refund_reason', 50).nullable();
    table.timestamp('refunded_at').nullable();

    // Timestamps
    table.timestamp('paid_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check("status IN ('pending', 'succeeded', 'failed', 'refunded')", [], 'chk_verification_payments_status');
    table.check("refund_reason IN ('automated_fail', 'dispute', 'courtesy_30day') OR refund_reason IS NULL", [], 'chk_verification_payments_refund_reason');
    table.check('amount > 0', [], 'chk_verification_payments_amount');
    table.check('refund_amount >= 0 AND refund_amount <= amount', [], 'chk_verification_payments_refund_amount');
  });

  // Indexes for verification_payments
  await knex.raw(`
    CREATE INDEX idx_verification_payments_user ON verification_payments(user_id);
    CREATE INDEX idx_verification_payments_connection ON verification_payments(connection_request_id);
    CREATE INDEX idx_verification_payments_stripe ON verification_payments(stripe_payment_intent_id);
    CREATE INDEX idx_verification_payments_status ON verification_payments(status);
    CREATE INDEX idx_verification_payments_created ON verification_payments(created_at DESC);
  `);

  // ============================================================
  // 2. CREATE pre_qualification_responses TABLE (NEW)
  // ============================================================
  await knex.schema.createTable('pre_qualification_responses', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Question and response
    table.string('question_id', 50).notNullable();
    table.string('response', 50).notNullable();

    // Timestamp
    table.timestamp('answered_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.unique(['user_id', 'question_id'], { indexName: 'idx_pre_qual_unique' });
    table.check("question_id IN ('felony_conviction', 'sex_offender', 'pending_charges')", [], 'chk_pre_qual_question_id');
    table.check("response IN ('yes', 'no', 'prefer_not_to_say')", [], 'chk_pre_qual_response');
  });

  // Indexes for pre_qualification_responses
  await knex.raw(`
    CREATE INDEX idx_pre_qual_user ON pre_qualification_responses(user_id);
    CREATE INDEX idx_pre_qual_question ON pre_qualification_responses(question_id);
  `);

  // ============================================================
  // 3. UPDATE connection_requests TABLE - Add payment tracking
  // ============================================================
  await knex.schema.alterTable('connection_requests', (table) => {
    // Payment tracking fields
    table.uuid('sender_payment_id').nullable().references('id').inTable('verification_payments').onDelete('SET NULL');
    table.uuid('recipient_payment_id').nullable().references('id').inTable('verification_payments').onDelete('SET NULL');
    table.boolean('verification_unlocked').defaultTo(false);
  });

  // Index for unlocked connections
  await knex.raw(`
    CREATE INDEX idx_connection_requests_unlocked ON connection_requests(verification_unlocked);
  `);

  // ============================================================
  // 4. UPDATE verifications TABLE - Add dual-provider and admin review
  // ============================================================
  await knex.schema.alterTable('verifications', (table) => {
    // Dual-provider fields
    table.string('id_provider', 50).notNullable().defaultTo('veriff');
    table.string('background_provider', 50).notNullable().defaultTo('certn');

    // Certn background check fields
    table.string('certn_report_id', 255).nullable();
    table.string('certn_applicant_id', 255).nullable();
    table.jsonb('flagged_records').nullable();

    // Admin review fields (for 'consider' status)
    table.boolean('admin_review_required').defaultTo(false);
    table.uuid('admin_reviewed_by').nullable().references('id').inTable('users');
    table.timestamp('admin_review_date').nullable();
    table.text('admin_review_notes').nullable();
  });

  // Add 'consider' status to background_check_status enum
  // Note: This requires updating the existing check constraint
  await knex.raw(`
    ALTER TABLE verifications DROP CONSTRAINT IF EXISTS chk_verifications_background_check_status;
    ALTER TABLE verifications ADD CONSTRAINT chk_verifications_background_check_status
      CHECK (background_check_status IN ('not_started', 'pending', 'approved', 'rejected', 'consider', 'expired'));
  `);

  // Indexes for admin review
  await knex.raw(`
    CREATE INDEX idx_verifications_id_provider ON verifications(id_provider);
    CREATE INDEX idx_verifications_bg_provider ON verifications(background_provider);
    CREATE INDEX idx_verifications_admin_review ON verifications(admin_review_required, background_check_date) WHERE admin_review_required = TRUE;
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove admin review indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_verifications_admin_review;
    DROP INDEX IF EXISTS idx_verifications_bg_provider;
    DROP INDEX IF EXISTS idx_verifications_id_provider;
  `);

  // Remove connection_requests index
  await knex.raw(`
    DROP INDEX IF EXISTS idx_connection_requests_unlocked;
  `);

  // Remove verification_payments indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_verification_payments_created;
    DROP INDEX IF EXISTS idx_verification_payments_status;
    DROP INDEX IF EXISTS idx_verification_payments_stripe;
    DROP INDEX IF EXISTS idx_verification_payments_connection;
    DROP INDEX IF EXISTS idx_verification_payments_user;
  `);

  // Remove pre_qualification_responses indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_pre_qual_question;
    DROP INDEX IF EXISTS idx_pre_qual_user;
  `);

  // Revert verifications table changes
  await knex.schema.alterTable('verifications', (table) => {
    table.dropColumn('admin_review_notes');
    table.dropColumn('admin_review_date');
    table.dropColumn('admin_reviewed_by');
    table.dropColumn('admin_review_required');
    table.dropColumn('flagged_records');
    table.dropColumn('certn_applicant_id');
    table.dropColumn('certn_report_id');
    table.dropColumn('background_provider');
    table.dropColumn('id_provider');
  });

  // Revert 'consider' status from background_check_status
  await knex.raw(`
    ALTER TABLE verifications DROP CONSTRAINT IF EXISTS chk_verifications_background_check_status;
    ALTER TABLE verifications ADD CONSTRAINT chk_verifications_background_check_status
      CHECK (background_check_status IN ('not_started', 'pending', 'approved', 'rejected', 'expired'));
  `);

  // Revert connection_requests table changes
  await knex.schema.alterTable('connection_requests', (table) => {
    table.dropColumn('verification_unlocked');
    table.dropColumn('recipient_payment_id');
    table.dropColumn('sender_payment_id');
  });

  // Drop tables
  await knex.schema.dropTableIfExists('pre_qualification_responses');
  await knex.schema.dropTableIfExists('verification_payments');
}
