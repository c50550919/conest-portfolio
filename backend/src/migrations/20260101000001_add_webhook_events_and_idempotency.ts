import { Knex } from 'knex';

/**
 * Migration: Add Webhook Events Table and Idempotency Tracking
 *
 * Feature: Payment System Hardening
 * Date: 2026-01-01
 *
 * This migration adds:
 * 1. stripe_webhook_events table - For webhook deduplication
 * 2. idempotency_keys table - For payment intent deduplication
 *
 * Security:
 * - Prevents duplicate webhook processing
 * - Ensures payment intent idempotency
 * - Tracks all processed events for audit
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // 1. CREATE stripe_webhook_events TABLE
  // ============================================================
  await knex.schema.createTable('stripe_webhook_events', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Stripe event tracking
    table.string('stripe_event_id', 255).unique().notNullable();
    table.string('event_type', 100).notNullable();
    table.string('processing_status', 20).notNullable().defaultTo('pending');

    // Event metadata
    table.jsonb('payload').nullable();
    table.text('error_message').nullable();

    // Timestamps
    table.timestamp('received_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check(
      "processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')",
      [],
      'chk_webhook_events_status'
    );
  });

  // Indexes for stripe_webhook_events
  await knex.raw(`
    CREATE INDEX idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);
    CREATE INDEX idx_webhook_events_type ON stripe_webhook_events(event_type);
    CREATE INDEX idx_webhook_events_status ON stripe_webhook_events(processing_status);
    CREATE INDEX idx_webhook_events_received ON stripe_webhook_events(received_at DESC);
  `);

  // ============================================================
  // 2. CREATE idempotency_keys TABLE
  // ============================================================
  await knex.schema.createTable('idempotency_keys', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Key tracking
    table.string('idempotency_key', 255).unique().notNullable();
    table.string('operation_type', 50).notNullable();

    // User who created this key
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Result storage
    table.string('status', 20).notNullable().defaultTo('pending');
    table.string('result_id', 255).nullable(); // e.g., payment_intent_id
    table.jsonb('result_data').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('expires_at').notNullable(); // Keys expire after 24 hours

    // Constraints
    table.check(
      "status IN ('pending', 'processing', 'completed', 'failed')",
      [],
      'chk_idempotency_keys_status'
    );
    table.check(
      "operation_type IN ('verification_payment', 'payment_intent', 'subscription', 'bundle_payment')",
      [],
      'chk_idempotency_keys_operation'
    );
  });

  // Indexes for idempotency_keys
  await knex.raw(`
    CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(idempotency_key);
    CREATE INDEX idx_idempotency_keys_user ON idempotency_keys(user_id);
    CREATE INDEX idx_idempotency_keys_operation ON idempotency_keys(operation_type);
    CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);
    CREATE INDEX idx_idempotency_keys_created ON idempotency_keys(created_at DESC);
  `);

  // Add trigger to auto-delete expired keys
  await knex.raw(`
    CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
    RETURNS TRIGGER AS $$
    BEGIN
      DELETE FROM idempotency_keys WHERE expires_at < NOW() - INTERVAL '1 day';
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_cleanup_idempotency_keys ON idempotency_keys;
    CREATE TRIGGER trg_cleanup_idempotency_keys
      AFTER INSERT ON idempotency_keys
      EXECUTE FUNCTION cleanup_expired_idempotency_keys();
  `);

  // ============================================================
  // 3. ADD idempotency_key column to verification_payments
  // ============================================================
  await knex.schema.alterTable('verification_payments', (table) => {
    table.string('idempotency_key', 255).nullable().unique();
  });

  // Index for idempotency lookup
  await knex.raw(`
    CREATE INDEX idx_verification_payments_idempotency ON verification_payments(idempotency_key);
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove idempotency_key from verification_payments
  await knex.raw(`
    DROP INDEX IF EXISTS idx_verification_payments_idempotency;
  `);

  await knex.schema.alterTable('verification_payments', (table) => {
    table.dropColumn('idempotency_key');
  });

  // Drop trigger
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_cleanup_idempotency_keys ON idempotency_keys;
    DROP FUNCTION IF EXISTS cleanup_expired_idempotency_keys();
  `);

  // Drop idempotency_keys indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_idempotency_keys_created;
    DROP INDEX IF EXISTS idx_idempotency_keys_expires;
    DROP INDEX IF EXISTS idx_idempotency_keys_operation;
    DROP INDEX IF EXISTS idx_idempotency_keys_user;
    DROP INDEX IF EXISTS idx_idempotency_keys_key;
  `);

  // Drop stripe_webhook_events indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_webhook_events_received;
    DROP INDEX IF EXISTS idx_webhook_events_status;
    DROP INDEX IF EXISTS idx_webhook_events_type;
    DROP INDEX IF EXISTS idx_webhook_events_stripe_id;
  `);

  // Drop tables
  await knex.schema.dropTableIfExists('idempotency_keys');
  await knex.schema.dropTableIfExists('stripe_webhook_events');
}
