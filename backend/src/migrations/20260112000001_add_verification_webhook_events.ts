import { Knex } from 'knex';

/**
 * Migration: Add verification_webhook_events table
 *
 * Purpose: Track processed webhook events from verification providers
 * for idempotency and audit purposes.
 *
 * Supports: Veriff (ID verification), Certn (background checks), Telnyx (phone)
 *
 * Constitution Principle III: Security - prevent duplicate event processing
 * Constitution Principle IV: Performance - indexed for fast lookups
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('verification_webhook_events', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.fn.uuid());

    // Provider identification
    table
      .enum('provider', ['veriff', 'certn', 'telnyx'])
      .notNullable()
      .comment('Verification provider name');

    table
      .string('provider_event_id', 255)
      .notNullable()
      .comment('Unique event/session ID from the provider');

    // Event metadata
    table
      .string('event_type', 100)
      .notNullable()
      .comment('Type of webhook event (e.g., success, completed)');

    table
      .uuid('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('Associated user ID if known');

    // Processing status
    table
      .enum('processing_status', ['pending', 'processing', 'completed', 'failed', 'skipped'])
      .notNullable()
      .defaultTo('pending')
      .comment('Current processing status');

    // Payload storage (for debugging/replay)
    table.jsonb('payload').nullable().comment('Full webhook payload');

    // Error tracking
    table.text('error_message').nullable().comment('Error message if processing failed');

    // Timestamps
    table.timestamp('received_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('processed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Unique constraint: one event per provider+event_id combination
    table.unique(['provider', 'provider_event_id'], {
      indexName: 'idx_verification_webhook_events_unique',
    });

    // Index for fast duplicate checks
    table.index(['provider', 'provider_event_id', 'processing_status'], 'idx_verification_webhook_lookup');

    // Index for finding failed events
    table.index(['processing_status', 'received_at'], 'idx_verification_webhook_failed');

    // Index for user-based queries
    table.index('user_id', 'idx_verification_webhook_user');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE verification_webhook_events IS
    'Tracks webhook events from verification providers (Veriff, Certn, Telnyx) for idempotency and audit'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verification_webhook_events');
}
