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
 * Migration: Create connection_requests table
 *
 * Feature: 003-complete-3-critical (Connection Request Flow)
 * Constitution Principle I: NO child PII - only parent data
 * Constitution Principle III: Encrypted messages (AES-256-GCM)
 *
 * Entity: ConnectionRequest
 * - Deliberate connection attempts with personalized messages
 * - 14-day expiration, 90-day archival
 * - Rate limits: 5/day, 15/week (enforced in application layer)
 * - Creates Match on acceptance
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('connection_requests', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Encrypted message fields (AES-256-GCM)
    table.text('message_encrypted').notNullable();
    table.string('message_iv', 32).notNullable();

    // Status and lifecycle
    table.string('status', 20).notNullable().defaultTo('pending');
    table.timestamp('sent_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable().defaultTo(knex.raw("NOW() + INTERVAL '14 days'"));

    // Response fields (optional)
    table.text('response_message_encrypted').nullable();
    table.string('response_message_iv', 32).nullable();
    table.timestamp('responded_at').nullable();

    // Archival
    table.timestamp('archived_at').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.unique(['sender_id', 'recipient_id'], { indexName: 'idx_connection_requests_unique' });

    // Check: status must be valid
    table.check(
      "status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')",
      [],
      'chk_connection_requests_status',
    );

    // Check: sender cannot send request to self
    table.check(
      'sender_id != recipient_id',
      [],
      'chk_connection_requests_not_self',
    );
  });

  // Indexes for performance
  await knex.raw(`
    CREATE INDEX idx_connection_requests_recipient ON connection_requests(recipient_id, status);
    CREATE INDEX idx_connection_requests_sender ON connection_requests(sender_id, status);
    CREATE INDEX idx_connection_requests_expires_at ON connection_requests(expires_at) WHERE status = 'pending';
    CREATE INDEX idx_connection_requests_archived_at ON connection_requests(archived_at) WHERE archived_at IS NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('connection_requests');
}
