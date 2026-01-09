/**
 * Migration: Add Billing Tables for Mobile IAP
 *
 * Creates tables for:
 * - billing_transactions: Track all iOS/Android purchases
 * - subscriptions: Track user subscription status
 *
 * References:
 * - Apple App Store Server API: https://developer.apple.com/documentation/appstoreserverapi
 * - Google Play Developer API: https://developers.google.com/android-publisher
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create billing_transactions table
  await knex.schema.createTable('billing_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('platform', ['ios', 'android']).notNullable();
    table.string('product_id', 255).notNullable();
    table.string('transaction_id', 255);
    table.string('original_transaction_id', 255); // For iOS subscription renewals
    table.string('purchase_token', 1000); // For Google Play
    table.text('receipt_data'); // Original receipt for audit
    table.jsonb('subscription_data'); // Subscription info if applicable
    table.jsonb('verification_data'); // Verification payment info if applicable
    table.enum('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('completed');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for deduplication and lookups
    table.index('user_id');
    table.index('platform');
    table.index('product_id');
    table.unique(['platform', 'transaction_id']);
    table.index(['platform', 'purchase_token']);
  });

  // Create subscriptions table
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('product_id', 255).notNullable();
    table.enum('platform', ['ios', 'android']).notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('auto_renewing').defaultTo(true);
    table.boolean('bundle_purchase').defaultTo(false); // True if from bundle
    table.string('original_transaction_id', 255); // For renewal tracking
    table.enum('status', ['active', 'expired', 'cancelled', 'grace_period']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('expires_at');
    table.index(['user_id', 'product_id']);
    table.index('status');
  });

  // Add bundle_purchase column to verification_payments if not exists
  const hasColumn = await knex.schema.hasColumn('verification_payments', 'bundle_purchase');
  if (!hasColumn) {
    await knex.schema.alterTable('verification_payments', (table) => {
      table.boolean('bundle_purchase').defaultTo(false);
      table.string('transaction_id', 255); // IAP transaction ID
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('billing_transactions');

  // Remove added columns from verification_payments
  const hasColumn = await knex.schema.hasColumn('verification_payments', 'bundle_purchase');
  if (hasColumn) {
    await knex.schema.alterTable('verification_payments', (table) => {
      table.dropColumn('bundle_purchase');
      table.dropColumn('transaction_id');
    });
  }
}
