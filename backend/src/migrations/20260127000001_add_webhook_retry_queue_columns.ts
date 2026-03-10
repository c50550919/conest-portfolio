/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Migration: Add Webhook Retry Queue Columns
 *
 * TASK-W2-01: Webhook Retry Queue Implementation
 *
 * Adds retry tracking columns to webhook event tables:
 * - retry_count: Number of retry attempts made
 * - last_retry_at: Timestamp of last retry attempt
 * - next_retry_at: Scheduled timestamp for next retry
 * - dead_letter: Boolean flag for permanently failed events
 * - dead_letter_at: Timestamp when moved to dead letter queue
 * - dead_letter_reason: Reason for moving to dead letter
 *
 * Constitution Principle III: Security - audit trail for all webhook processing
 * Constitution Principle IV: Performance - indexed columns for efficient retry queries
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add retry columns to stripe_webhook_events table
  await knex.schema.alterTable('stripe_webhook_events', (table) => {
    // Retry tracking
    table.integer('retry_count').defaultTo(0).notNullable();
    table.timestamp('last_retry_at').nullable();
    table.timestamp('next_retry_at').nullable();

    // Dead letter queue
    table.boolean('dead_letter').defaultTo(false).notNullable();
    table.timestamp('dead_letter_at').nullable();
    table.text('dead_letter_reason').nullable();

    // Index for retry queue processing
    table.index(['processing_status', 'next_retry_at'], 'idx_stripe_webhook_retry_queue');
    table.index(['dead_letter', 'event_type'], 'idx_stripe_webhook_dead_letter');
  });

  // Add retry columns to verification_webhook_events table
  await knex.schema.alterTable('verification_webhook_events', (table) => {
    // Retry tracking
    table.integer('retry_count').defaultTo(0).notNullable();
    table.timestamp('last_retry_at').nullable();
    table.timestamp('next_retry_at').nullable();

    // Dead letter queue
    table.boolean('dead_letter').defaultTo(false).notNullable();
    table.timestamp('dead_letter_at').nullable();
    table.text('dead_letter_reason').nullable();

    // Index for retry queue processing
    table.index(['processing_status', 'next_retry_at'], 'idx_verification_webhook_retry_queue');
    table.index(['dead_letter', 'provider', 'event_type'], 'idx_verification_webhook_dead_letter');
  });

  // Create webhook_retry_alerts table for alerting
  await knex.schema.createTable('webhook_retry_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('alert_type', 50).notNullable(); // 'repeated_failure', 'dead_letter', 'high_failure_rate'
    table.string('source', 20).notNullable(); // 'stripe', 'veriff', 'certn'
    table.string('event_type', 100).nullable();
    table.integer('failure_count').notNullable();
    table.text('message').notNullable();
    table.jsonb('metadata').nullable(); // Additional context
    table.boolean('acknowledged').defaultTo(false).notNullable();
    table.timestamp('acknowledged_at').nullable();
    table.string('acknowledged_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Indexes for efficient querying
    table.index(['acknowledged', 'created_at'], 'idx_webhook_alerts_unacknowledged');
    table.index(['source', 'event_type', 'created_at'], 'idx_webhook_alerts_by_source');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop webhook_retry_alerts table
  await knex.schema.dropTableIfExists('webhook_retry_alerts');

  // Remove columns from verification_webhook_events
  await knex.schema.alterTable('verification_webhook_events', (table) => {
    table.dropIndex(['processing_status', 'next_retry_at'], 'idx_verification_webhook_retry_queue');
    table.dropIndex(
      ['dead_letter', 'provider', 'event_type'],
      'idx_verification_webhook_dead_letter',
    );
    table.dropColumn('retry_count');
    table.dropColumn('last_retry_at');
    table.dropColumn('next_retry_at');
    table.dropColumn('dead_letter');
    table.dropColumn('dead_letter_at');
    table.dropColumn('dead_letter_reason');
  });

  // Remove columns from stripe_webhook_events
  await knex.schema.alterTable('stripe_webhook_events', (table) => {
    table.dropIndex(['processing_status', 'next_retry_at'], 'idx_stripe_webhook_retry_queue');
    table.dropIndex(['dead_letter', 'event_type'], 'idx_stripe_webhook_dead_letter');
    table.dropColumn('retry_count');
    table.dropColumn('last_retry_at');
    table.dropColumn('next_retry_at');
    table.dropColumn('dead_letter');
    table.dropColumn('dead_letter_at');
    table.dropColumn('dead_letter_reason');
  });
}
