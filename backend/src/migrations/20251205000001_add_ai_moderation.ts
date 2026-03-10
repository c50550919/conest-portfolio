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
 * AI Content Moderation Migration
 *
 * Adds fields for LLM-powered content moderation to detect:
 * - Adult-to-adult predatory interest in children
 * - Household targeting patterns
 * - Schedule/location surveillance
 *
 * Constitution: Principle I (Child Safety)
 */

export async function up(knex: Knex): Promise<void> {
  // Add AI moderation fields to messages table
  await knex.schema.alterTable('messages', (table) => {
    // AI analysis results
    table.jsonb('ai_moderation_result').nullable();
    table.float('ai_confidence_score').nullable();
    table.string('ai_category', 50).nullable(); // 'normal', 'child_safety_questionable', 'child_predatory_risk'

    // Specific signal flags for pattern tracking
    table.boolean('ai_child_focus').defaultTo(false);
    table.boolean('ai_asks_schedule').defaultTo(false);
    table.boolean('ai_asks_location').defaultTo(false);
    table.boolean('ai_offers_access').defaultTo(false);
    table.boolean('ai_probes_security').defaultTo(false);

    // Processing metadata
    table.timestamp('ai_moderated_at').nullable();
    table.string('ai_provider', 20).nullable(); // 'gemini', 'openai'
    table.string('ai_model', 50).nullable();

    // Indexes for efficient querying
    table.index('ai_category');
    table.index('ai_confidence_score');
    table.index(['ai_child_focus', 'ai_asks_schedule']);
  });

  // Add moderation status fields to users table
  await knex.schema.alterTable('users', (table) => {
    table.integer('moderation_strike_count').defaultTo(0);
    table.timestamp('last_moderation_strike').nullable();
    table
      .enum('moderation_status', ['good_standing', 'warned', 'suspended', 'banned'])
      .defaultTo('good_standing');
    table.timestamp('suspension_until').nullable();
    table.text('suspension_reason').nullable();

    // Index for admin queries
    table.index('moderation_status');
  });

  // Create moderation_patterns table for cross-conversation pattern tracking
  await knex.schema.createTable('moderation_patterns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    // Pattern tracking
    table.string('pattern_type', 50).notNullable(); // 'child_focus', 'schedule_probing', 'location_targeting', etc.
    table.integer('occurrence_count').defaultTo(1);
    table.jsonb('message_ids').defaultTo('[]'); // Array of message IDs exhibiting this pattern

    // Timestamps
    table.timestamp('first_detected').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_detected').notNullable().defaultTo(knex.fn.now());

    // Review tracking
    table.boolean('reviewed').defaultTo(false);
    table.uuid('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at').nullable();
    table.text('review_notes').nullable();
    table.string('action_taken', 50).nullable(); // 'dismissed', 'warning', 'suspension', 'ban'

    table.timestamps(true, true);

    // Indexes
    table.index('user_id');
    table.index('pattern_type');
    table.index(['user_id', 'pattern_type']);
    table.index('reviewed');
    table.index('occurrence_count');
  });

  // Create ai_moderation_logs table for audit trail
  await knex.schema.createTable('ai_moderation_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').references('id').inTable('messages').onDelete('CASCADE').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();

    // AI analysis
    table.string('provider', 20).notNullable(); // 'gemini', 'openai'
    table.string('model', 50).notNullable();
    table.jsonb('request_payload').nullable(); // For debugging (without sensitive content)
    table.jsonb('response_payload').notNullable(); // Full AI response
    table.integer('latency_ms').nullable();

    // Result
    table.string('category', 50).notNullable();
    table.float('confidence').notNullable();
    table.string('action_taken', 50).notNullable(); // 'auto_approved', 'flagged', 'auto_blocked'

    // Error tracking
    table.boolean('had_error').defaultTo(false);
    table.text('error_message').nullable();
    table.boolean('used_fallback').defaultTo(false);

    // Admin feedback for AI improvement
    table.string('admin_feedback', 50).nullable(); // 'false_positive', 'confirmed_violation'
    table.text('admin_feedback_notes').nullable();
    table.string('admin_feedback_category', 50).nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('message_id');
    table.index('user_id');
    table.index('category');
    table.index('action_taken');
    table.index('created_at');
    table.index('had_error');
  });

  // Update message_reports to add AI-detected flag
  await knex.schema.alterTable('message_reports', (table) => {
    table.boolean('ai_detected').defaultTo(false);
    table.float('ai_confidence').nullable();
  });

  // Add new action types to admin_actions enum (if not already present)
  // Note: Knex doesn't support altering enums easily, so we add new columns instead
  await knex.schema.alterTable('admin_actions', (table) => {
    table.boolean('is_ai_escalation').defaultTo(false);
    table.float('ai_confidence_at_escalation').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove AI moderation logs table
  await knex.schema.dropTableIfExists('ai_moderation_logs');

  // Remove moderation patterns table
  await knex.schema.dropTableIfExists('moderation_patterns');

  // Remove fields from message_reports
  await knex.schema.alterTable('message_reports', (table) => {
    table.dropColumn('ai_detected');
    table.dropColumn('ai_confidence');
  });

  // Remove fields from admin_actions
  await knex.schema.alterTable('admin_actions', (table) => {
    table.dropColumn('is_ai_escalation');
    table.dropColumn('ai_confidence_at_escalation');
  });

  // Remove moderation fields from users
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('moderation_strike_count');
    table.dropColumn('last_moderation_strike');
    table.dropColumn('moderation_status');
    table.dropColumn('suspension_until');
    table.dropColumn('suspension_reason');
  });

  // Remove AI moderation fields from messages
  await knex.schema.alterTable('messages', (table) => {
    table.dropColumn('ai_moderation_result');
    table.dropColumn('ai_confidence_score');
    table.dropColumn('ai_category');
    table.dropColumn('ai_child_focus');
    table.dropColumn('ai_asks_schedule');
    table.dropColumn('ai_asks_location');
    table.dropColumn('ai_offers_access');
    table.dropColumn('ai_probes_security');
    table.dropColumn('ai_moderated_at');
    table.dropColumn('ai_provider');
    table.dropColumn('ai_model');
  });
}
