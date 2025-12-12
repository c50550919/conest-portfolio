import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enhance messages table for encryption and moderation
  await knex.schema.alterTable('messages', (table) => {
    // Encryption fields
    table.string('encryption_iv', 32).notNullable(); // Initialization vector for AES-256
    table.string('encryption_salt', 64); // Salt for key derivation
    table.enum('encryption_version', ['aes-256-gcm-v1']).defaultTo('aes-256-gcm-v1');

    // Moderation fields
    table.boolean('flagged_for_review').defaultTo(false);
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at');
    table.enum('moderation_status', ['pending', 'approved', 'rejected', 'auto_approved']).defaultTo('auto_approved');
    table.text('moderation_notes');

    // Metadata
    table.jsonb('metadata'); // For additional file info, etc.
    table.boolean('is_system_message').defaultTo(false);

    // Indexes for moderation queries
    table.index('flagged_for_review');
    table.index('moderation_status');
    table.index(['flagged_for_review', 'moderation_status']);
  });

  // Enhance conversations table
  await knex.schema.alterTable('conversations', (table) => {
    // Verification enforcement
    table.boolean('both_verified').defaultTo(false);
    table.boolean('archived').defaultTo(false);
    table.uuid('archived_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('archived_at');

    // Conversation metadata
    table.integer('unread_count_p1').defaultTo(0);
    table.integer('unread_count_p2').defaultTo(0);
    table.uuid('last_message_sender_id').references('id').inTable('users').onDelete('SET NULL');
    table.text('last_message_preview'); // Unencrypted preview (first 100 chars)

    // Moderation
    table.boolean('muted_by_p1').defaultTo(false);
    table.boolean('muted_by_p2').defaultTo(false);
    table.boolean('blocked').defaultTo(false);
    table.uuid('blocked_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('blocked_at');

    // Indexes
    table.index('both_verified');
    table.index('archived');
    table.index(['participant_1_id', 'archived']);
    table.index(['participant_2_id', 'archived']);
  });

  // Create message_reports table for user reporting
  await knex.schema.createTable('message_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').references('id').inTable('messages').onDelete('CASCADE').notNullable();
    table.uuid('reported_by').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('reported_user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    table.enum('report_type', [
      'inappropriate_content',
      'harassment',
      'spam',
      'scam',
      'child_safety_concern',
      'other',
    ]).notNullable();

    table.text('description');
    table.enum('status', ['pending', 'investigating', 'resolved', 'dismissed']).defaultTo('pending');
    table.enum('severity', ['low', 'medium', 'high', 'critical']).defaultTo('medium');

    // Admin action tracking
    table.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('resolved_at');
    table.text('resolution_notes');
    table.enum('action_taken', [
      'none',
      'warning_issued',
      'message_deleted',
      'user_suspended',
      'user_banned',
      'escalated',
    ]);

    table.timestamps(true, true);

    // Indexes
    table.index('message_id');
    table.index('reported_by');
    table.index('reported_user_id');
    table.index('status');
    table.index('severity');
    table.index(['status', 'severity']);
    table.index('assigned_to');
  });

  // Create encryption_keys table for key rotation
  await knex.schema.createTable('encryption_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key_id').unique().notNullable(); // e.g., 'msg-key-2025-01'
    table.string('encrypted_key').notNullable(); // Master key encrypted with app key
    table.integer('version').notNullable();
    table.timestamp('active_from').notNullable();
    table.timestamp('active_until');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);

    table.index('key_id');
    table.index(['is_active', 'active_from']);
  });

  // Create admin_actions table for audit trail
  await knex.schema.createTable('admin_actions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('admin_id').references('id').inTable('users').onDelete('SET NULL').notNullable();
    table.enum('action_type', [
      'message_deleted',
      'message_approved',
      'message_rejected',
      'user_warned',
      'user_suspended',
      'user_banned',
      'conversation_closed',
      'report_resolved',
    ]).notNullable();

    table.uuid('target_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('target_message_id').references('id').inTable('messages').onDelete('SET NULL');
    table.uuid('target_conversation_id').references('id').inTable('conversations').onDelete('SET NULL');
    table.uuid('related_report_id').references('id').inTable('message_reports').onDelete('SET NULL');

    table.text('reason').notNullable();
    table.jsonb('metadata'); // Additional context
    table.timestamps(true, true);

    // Indexes
    table.index('admin_id');
    table.index('action_type');
    table.index('target_user_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('admin_actions');
  await knex.schema.dropTableIfExists('encryption_keys');
  await knex.schema.dropTableIfExists('message_reports');

  await knex.schema.alterTable('conversations', (table) => {
    table.dropColumn('both_verified');
    table.dropColumn('archived');
    table.dropColumn('archived_by');
    table.dropColumn('archived_at');
    table.dropColumn('unread_count_p1');
    table.dropColumn('unread_count_p2');
    table.dropColumn('last_message_sender_id');
    table.dropColumn('last_message_preview');
    table.dropColumn('muted_by_p1');
    table.dropColumn('muted_by_p2');
    table.dropColumn('blocked');
    table.dropColumn('blocked_by');
    table.dropColumn('blocked_at');
  });

  await knex.schema.alterTable('messages', (table) => {
    table.dropColumn('encryption_iv');
    table.dropColumn('encryption_salt');
    table.dropColumn('encryption_version');
    table.dropColumn('flagged_for_review');
    table.dropColumn('reviewed_by');
    table.dropColumn('reviewed_at');
    table.dropColumn('moderation_status');
    table.dropColumn('moderation_notes');
    table.dropColumn('metadata');
    table.dropColumn('is_system_message');
  });
}
