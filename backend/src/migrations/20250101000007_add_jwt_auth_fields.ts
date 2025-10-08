import { Knex } from 'knex';

/**
 * Migration: Add JWT authentication fields to users table
 *
 * Adds refresh token storage and expiry for JWT-based authentication
 * following the 15min access + 7 day refresh token pattern.
 *
 * Constitution Principle III: Security-First Development
 * - JWT tokens: 15min access + 7 day refresh tokens
 * - Refresh tokens stored securely with expiry tracking
 */
export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    // JWT refresh token fields
    table.text('refresh_token'); // Hashed refresh token
    table.timestamp('refresh_token_expires_at'); // 7 days from issue
    table.timestamp('refresh_token_issued_at'); // Track when issued

    // Add index for refresh token lookups
    table.index('refresh_token');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropIndex('refresh_token');
    table.dropColumn('refresh_token');
    table.dropColumn('refresh_token_expires_at');
    table.dropColumn('refresh_token_issued_at');
  });
}
