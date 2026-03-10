/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('household_safety_disclosures', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.uuid('parent_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');

    // Disclosure type for renewals
    table.string('disclosure_type', 50).notNullable().defaultTo('initial');
    // 'initial', 'annual_renewal', 'update_required'

    // Status tracking
    table.string('status', 50).notNullable().defaultTo('pending');
    // 'pending', 'attested', 'expired', 'superseded'

    // Attestation responses (array of question/answer/timestamp)
    table.jsonb('attestation_responses').notNullable().defaultTo('[]');

    // Signature data (base64 image)
    table.text('signature_data');
    table.timestamp('signed_at');

    // Audit trail
    table.specificType('ip_address', 'inet');
    table.text('user_agent');

    // Validity (1 year from signing)
    table.timestamp('expires_at').notNullable();

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Indexes for common queries
  await knex.raw(`
    CREATE INDEX idx_hsd_household ON household_safety_disclosures(household_id);
  `);
  await knex.raw(`
    CREATE INDEX idx_hsd_parent ON household_safety_disclosures(parent_id);
  `);
  await knex.raw(`
    CREATE INDEX idx_hsd_status ON household_safety_disclosures(status);
  `);
  await knex.raw(`
    CREATE INDEX idx_hsd_expires ON household_safety_disclosures(expires_at);
  `);

  // Unique constraint: one active disclosure per parent per type
  await knex.raw(`
    CREATE UNIQUE INDEX idx_hsd_unique_active
    ON household_safety_disclosures(parent_id, disclosure_type)
    WHERE status = 'attested';
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('household_safety_disclosures');
}
