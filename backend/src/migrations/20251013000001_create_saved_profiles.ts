import { Knex } from 'knex';

/**
 * Migration: Create saved_profiles table
 *
 * Feature: 003-complete-3-critical (Saved/Bookmarked Profiles)
 * Constitution Principle I: NO child PII - only parent data
 *
 * Entity: SavedProfile
 * - Bookmarked profiles for later review
 * - Organized into 4 folders with optional private notes
 * - Maximum 50 saved profiles per user
 * - Private notes encrypted with AES-256-GCM
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('saved_profiles', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('profile_id').notNullable().references('id').inTable('users').onDelete('CASCADE');

    // Data fields
    table.string('folder', 50).notNullable();
    table.text('notes_encrypted').nullable();
    table.string('notes_iv', 32).nullable();

    // Timestamps
    table.timestamp('saved_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.unique(['user_id', 'profile_id'], { indexName: 'idx_saved_profiles_unique' });

    // Check: folder must be one of 4 predefined values
    table.check(
      "folder IN ('Top Choice', 'Strong Maybe', 'Considering', 'Backup')",
      [],
      'chk_saved_profiles_folder',
    );

    // Check: user cannot save own profile
    table.check(
      'user_id != profile_id',
      [],
      'chk_saved_profiles_not_own',
    );
  });

  // Indexes for performance
  await knex.raw(`
    CREATE INDEX idx_saved_profiles_user_id ON saved_profiles(user_id);
    CREATE INDEX idx_saved_profiles_folder ON saved_profiles(user_id, folder);
    CREATE INDEX idx_saved_profiles_saved_at ON saved_profiles(user_id, saved_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('saved_profiles');
}
