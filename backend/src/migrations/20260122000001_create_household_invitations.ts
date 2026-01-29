/**
 * Create Household Invitations Table
 *
 * Purpose: Store household membership invitations
 * Constitution: Principle I (Child Safety - NO child PII in invitations)
 *
 * Columns:
 * - id: UUID primary key
 * - household_id: Reference to households table
 * - inviter_id: User who sent the invitation
 * - invitee_id: User who received the invitation
 * - status: pending, accepted, declined, cancelled, expired
 * - proposed_rent_share: Suggested rent share in cents
 * - message_encrypted: Optional encrypted message
 * - message_iv: IV for message encryption
 * - expires_at: When invitation expires (default 7 days)
 * - responded_at: When invitee responded
 * - created_at, updated_at: Timestamps
 *
 * Constraints:
 * - Unique pending invite per household+invitee
 * - Foreign keys to households and profiles tables
 *
 * Indexes:
 * - invitee_id + status (for fetching received invitations)
 * - household_id + status (for fetching sent invitations)
 *
 * Created: 2026-01-22
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create invitation status enum
  await knex.raw(`
    DO $$ BEGIN
      CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled', 'expired');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Create household_invitations table
  await knex.schema.createTable('household_invitations', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Relationships
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.uuid('inviter_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');
    table.uuid('invitee_id').notNullable().references('id').inTable('profiles').onDelete('CASCADE');

    // Invitation details
    table.specificType('status', 'invitation_status').notNullable().defaultTo('pending');
    table.bigInteger('proposed_rent_share').unsigned(); // In cents, optional
    table.binary('message_encrypted'); // Optional encrypted message
    table.binary('message_iv'); // IV for decryption

    // Timing
    table.timestamp('expires_at').notNullable().defaultTo(knex.raw("NOW() + INTERVAL '7 days'"));
    table.timestamp('responded_at');

    // Standard timestamps
    table.timestamps(true, true);

    // Indexes for common queries
    table.index(['invitee_id', 'status'], 'idx_invitations_invitee_status');
    table.index(['household_id', 'status'], 'idx_invitations_household_status');
    table.index(['inviter_id'], 'idx_invitations_inviter');
    table.index(['expires_at'], 'idx_invitations_expires');
  });

  // Add partial unique index for pending invitations
  // Prevents multiple pending invitations to the same user for the same household
  await knex.raw(`
    CREATE UNIQUE INDEX idx_unique_pending_invite
    ON household_invitations (household_id, invitee_id)
    WHERE status = 'pending';
  `);

  // Add check constraint: inviter cannot invite themselves
  await knex.raw(`
    ALTER TABLE household_invitations
    ADD CONSTRAINT chk_no_self_invite
    CHECK (inviter_id != invitee_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('household_invitations');
  await knex.raw('DROP TYPE IF EXISTS invitation_status;');
}
