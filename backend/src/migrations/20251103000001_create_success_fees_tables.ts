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
 * Migration: Create Success Fees and Housing Documents Tables
 *
 * Purpose: Fraud prevention for tiered success fee system
 * Date: 2025-11-03
 *
 * Tables:
 * 1. success_fees - Tracks success fee charges with tier determination
 * 2. housing_documents - Stores uploaded lease/rental agreements for verification
 *
 * Fraud Prevention Strategy:
 * - Platform determines tier based on documentary evidence, not user claims
 * - Confidence scoring algorithm detects fraud signals
 * - Bilateral confirmation required from both users
 * - Manual admin review for low-confidence cases (<70 score)
 *
 * Tier Structure:
 * - Tier 1 ($29 each): Both on lease, written rental agreement
 * - Tier 2 ($15 each): Partial protections (oral agreement, landlord approval)
 * - Tier 3 ($0): Informal arrangements, no legal protections
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // 1. ALTER profiles TABLE - Add address tracking for cross-checking
  // ============================================================
  await knex.schema.alterTable('profiles', (table) => {
    table.text('current_address').nullable();
    table.timestamp('address_updated_at').nullable();
    table.boolean('move_in_confirmed').defaultTo(false);
    // Note: move_in_date already exists in profiles table from initial migration
  });

  await knex.raw(`
    CREATE INDEX idx_profiles_address ON profiles(current_address)
    WHERE current_address IS NOT NULL;
  `);

  // ============================================================
  // 2. CREATE housing_documents TABLE
  // ============================================================
  await knex.schema.createTable('housing_documents', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('success_fee_id').nullable(); // Will be set after success_fees table created

    // Document details
    table.string('document_type', 50).notNullable();
    table.string('file_url', 500).notNullable();
    table.string('file_name', 255).notNullable();
    table.integer('file_size').notNullable();
    table.string('mime_type', 100).notNullable();

    // Verification status
    table.string('verification_status', 20).notNullable().defaultTo('pending');
    table.uuid('verified_by').nullable().references('id').inTable('users');
    table.timestamp('verified_at').nullable();
    table.text('rejection_reason').nullable();

    // Extracted data (for cross-checking)
    table.text('extracted_address').nullable();
    table.specificType('extracted_names', 'TEXT[]').nullable();
    table.date('extracted_move_in_date').nullable();
    table.date('extracted_lease_end_date').nullable();

    // Timestamps
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check(
      `document_type IN (
        'lease_both_names',
        'lease_one_name',
        'sublease_agreement',
        'rental_agreement',
        'landlord_approval_letter',
        'proof_of_address'
      )`,
      [],
      'chk_housing_documents_type',
    );
    table.check(
      "verification_status IN ('pending', 'approved', 'rejected', 'needs_more_info')",
      [],
      'chk_housing_documents_verification_status',
    );
    table.check('file_size > 0', [], 'chk_housing_documents_file_size');
  });

  // Indexes for housing_documents
  await knex.raw(`
    CREATE INDEX idx_housing_docs_user ON housing_documents(user_id);
    CREATE INDEX idx_housing_docs_success_fee ON housing_documents(success_fee_id);
    CREATE INDEX idx_housing_docs_status ON housing_documents(verification_status);
    CREATE INDEX idx_housing_docs_type ON housing_documents(document_type);
    CREATE INDEX idx_housing_docs_uploaded ON housing_documents(uploaded_at DESC);
  `);

  // ============================================================
  // 3. CREATE success_fees TABLE
  // ============================================================
  await knex.schema.createTable('success_fees', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table.uuid('user_a_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('user_b_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('connection_request_id')
      .nullable()
      .references('id')
      .inTable('connection_requests')
      .onDelete('SET NULL');

    // Tier determination
    table.integer('tier').notNullable();
    table.string('tier_determination_method', 50).notNullable();

    // Amount calculation (in cents)
    table.integer('amount_per_user').notNullable();
    table.integer('total_amount').notNullable();

    // Confidence scoring (fraud detection)
    table.integer('confidence_score').notNullable();
    table.jsonb('fraud_signals').defaultTo('[]');

    // Payment status
    table.string('status', 30).notNullable().defaultTo('pending_confirmation');

    // User confirmations (bilateral)
    table.timestamp('user_a_confirmed_at').nullable();
    table.integer('user_a_claimed_tier').nullable();
    table.timestamp('user_b_confirmed_at').nullable();
    table.integer('user_b_claimed_tier').nullable();

    // Add check constraints using raw SQL
    table.check('tier IN (1, 2, 3)', [], 'chk_success_fees_tier');
    table.check(
      'confidence_score >= 0 AND confidence_score <= 100',
      [],
      'chk_success_fees_confidence',
    );
    table.check(
      'user_a_claimed_tier IS NULL OR user_a_claimed_tier IN (1, 2, 3)',
      [],
      'chk_user_a_tier',
    );
    table.check(
      'user_b_claimed_tier IS NULL OR user_b_claimed_tier IN (1, 2, 3)',
      [],
      'chk_user_b_tier',
    );

    // Document evidence
    table.uuid('document_user_a_id').nullable(); // References housing_documents
    table.uuid('document_user_b_id').nullable(); // References housing_documents
    table.uuid('document_verified_by').nullable().references('id').inTable('users');
    table.timestamp('document_verified_at').nullable();

    // Payment processing
    table.string('stripe_payment_intent_id', 255).unique().nullable();
    table.timestamp('charged_at').nullable();
    table.integer('refund_amount').defaultTo(0);
    table.timestamp('refunded_at').nullable();
    table.text('refund_reason').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check(
      `tier_determination_method IN (
        'document_verified',
        'address_cross_check',
        'manual_review',
        'default_tier_3'
      )`,
      [],
      'chk_success_fees_tier_method',
    );
    table.check(
      `status IN (
        'pending_confirmation',
        'pending_documents',
        'under_review',
        'approved',
        'charged',
        'disputed',
        'refunded'
      )`,
      [],
      'chk_success_fees_status',
    );
    table.check('amount_per_user >= 0', [], 'chk_success_fees_amount');
    table.check('total_amount >= 0', [], 'chk_success_fees_total');
    table.check(
      'refund_amount >= 0 AND refund_amount <= total_amount',
      [],
      'chk_success_fees_refund',
    );
  });

  // Indexes for success_fees
  await knex.raw(`
    CREATE INDEX idx_success_fees_user_a ON success_fees(user_a_id);
    CREATE INDEX idx_success_fees_user_b ON success_fees(user_b_id);
    CREATE INDEX idx_success_fees_connection ON success_fees(connection_request_id);
    CREATE INDEX idx_success_fees_status ON success_fees(status);
    CREATE INDEX idx_success_fees_stripe ON success_fees(stripe_payment_intent_id);
    CREATE INDEX idx_success_fees_created ON success_fees(created_at DESC);

    -- Index for fraud detection (low confidence cases requiring manual review)
    CREATE INDEX idx_success_fees_low_confidence ON success_fees(confidence_score)
    WHERE confidence_score < 70;

    -- Index for pending document verification
    CREATE INDEX idx_success_fees_pending_docs ON success_fees(status, created_at)
    WHERE status = 'pending_documents';

    -- Index for manual review queue
    CREATE INDEX idx_success_fees_review_queue ON success_fees(status, created_at)
    WHERE status = 'under_review';
  `);

  // ============================================================
  // 4. ADD foreign key constraints for housing_documents.success_fee_id
  // ============================================================
  await knex.raw(`
    ALTER TABLE housing_documents
    ADD CONSTRAINT fk_housing_documents_success_fee
    FOREIGN KEY (success_fee_id)
    REFERENCES success_fees(id)
    ON DELETE CASCADE;
  `);

  // ============================================================
  // 5. CREATE admin_audit_log TABLE (for compliance)
  // ============================================================
  await knex.schema.createTable('admin_audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('admin_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('action', 100).notNullable();
    table.uuid('target_id').notNullable(); // ID of success_fee or document
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_user_id);
    CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);
    CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('admin_audit_log');

  // Remove foreign key constraint from housing_documents
  await knex.raw(`
    ALTER TABLE housing_documents
    DROP CONSTRAINT IF EXISTS fk_housing_documents_success_fee;
  `);

  // Drop indexes for success_fees
  await knex.raw(`
    DROP INDEX IF EXISTS idx_success_fees_review_queue;
    DROP INDEX IF EXISTS idx_success_fees_pending_docs;
    DROP INDEX IF EXISTS idx_success_fees_low_confidence;
    DROP INDEX IF EXISTS idx_success_fees_created;
    DROP INDEX IF EXISTS idx_success_fees_stripe;
    DROP INDEX IF EXISTS idx_success_fees_status;
    DROP INDEX IF EXISTS idx_success_fees_connection;
    DROP INDEX IF EXISTS idx_success_fees_user_b;
    DROP INDEX IF EXISTS idx_success_fees_user_a;
  `);

  await knex.schema.dropTableIfExists('success_fees');

  // Drop indexes for housing_documents
  await knex.raw(`
    DROP INDEX IF EXISTS idx_housing_docs_uploaded;
    DROP INDEX IF EXISTS idx_housing_docs_type;
    DROP INDEX IF EXISTS idx_housing_docs_status;
    DROP INDEX IF EXISTS idx_housing_docs_success_fee;
    DROP INDEX IF EXISTS idx_housing_docs_user;
  `);

  await knex.schema.dropTableIfExists('housing_documents');

  // Revert profiles table changes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_profiles_address;
  `);

  await knex.schema.alterTable('profiles', (table) => {
    // Note: move_in_date was not added by this migration (exists in initial migration)
    table.dropColumn('move_in_confirmed');
    table.dropColumn('address_updated_at');
    table.dropColumn('current_address');
  });
}
