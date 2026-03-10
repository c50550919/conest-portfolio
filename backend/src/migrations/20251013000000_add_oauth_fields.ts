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
 * Migration: Add OAuth support to users table
 * Feature: 002-oauth-social-login
 * Created: 2025-10-13
 *
 * Adds OAuth provider fields to enable Google Sign In and Apple Sign In:
 * - oauth_provider: 'google', 'apple', or NULL
 * - oauth_provider_id: Provider's unique user ID
 * - oauth_profile_picture: Profile picture URL from OAuth provider
 *
 * Constitution Principle I: Only parent data, no child PII
 * Constitution Principle III: Secure OAuth implementation with server-side verification
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Add OAuth provider fields
    table.string('oauth_provider', 50).nullable();
    table.string('oauth_provider_id', 255).nullable();
    table.text('oauth_profile_picture').nullable();

    // Create indexes for OAuth lookups
    table.index(['oauth_provider', 'oauth_provider_id'], 'idx_users_oauth');
    table.index(['email', 'email_verified'], 'idx_users_email_verified');
  });

  // Modify password_hash to be nullable (OAuth users don't have passwords)
  await knex.raw(`
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
  `);

  // Add constraints
  await knex.raw(`
    -- Only allow valid OAuth providers
    ALTER TABLE users ADD CONSTRAINT users_oauth_provider_check
      CHECK (oauth_provider IN ('google', 'apple') OR oauth_provider IS NULL);

    -- OAuth provider ID is required if provider is set
    ALTER TABLE users ADD CONSTRAINT users_oauth_consistency_check
      CHECK (
        (oauth_provider IS NULL AND oauth_provider_id IS NULL) OR
        (oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL)
      );

    -- Either password_hash OR oauth_provider must be set (not both null)
    ALTER TABLE users ADD CONSTRAINT users_auth_method_check
      CHECK (
        password_hash IS NOT NULL OR oauth_provider IS NOT NULL
      );
  `);

  // Add column comments for documentation
  await knex.raw(`
    COMMENT ON COLUMN users.oauth_provider IS 'OAuth provider (google, apple, or NULL for email/password)';
    COMMENT ON COLUMN users.oauth_provider_id IS 'Unique user ID from OAuth provider (Google sub, Apple sub)';
    COMMENT ON COLUMN users.oauth_profile_picture IS 'Profile picture URL from OAuth provider';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Remove constraints
  await knex.raw(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_oauth_provider_check;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_oauth_consistency_check;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_method_check;
  `);

  // Remove indexes
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['oauth_provider', 'oauth_provider_id'], 'idx_users_oauth');
    table.dropIndex(['email', 'email_verified'], 'idx_users_email_verified');
  });

  // Remove OAuth columns
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('oauth_provider');
    table.dropColumn('oauth_provider_id');
    table.dropColumn('oauth_profile_picture');
  });

  // Make password_hash NOT NULL again (email/password only)
  // WARNING: This will fail if OAuth users exist
  await knex.raw(`
    ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
  `);
}
