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
  // Create households table
  await knex.schema.createTable('households', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('address').notNullable();
    table.string('city').notNullable();
    table.string('state', 2).notNullable();
    table.string('zip_code', 5).notNullable();
    table.integer('monthly_rent').notNullable();
    table.date('lease_start_date');
    table.date('lease_end_date');
    table.string('stripe_account_id');
    table.enum('status', ['active', 'inactive']).defaultTo('active');
    table.timestamps(true, true);

    table.index('status');
  });

  // Create household_members table
  await knex.schema.createTable('household_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('household_id')
      .references('id')
      .inTable('households')
      .onDelete('CASCADE')
      .notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.enum('role', ['admin', 'member']).defaultTo('member');
    table.integer('rent_share').notNullable(); // Amount in cents
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('left_at');
    table.enum('status', ['active', 'inactive']).defaultTo('active');

    table.index('household_id');
    table.index('user_id');
    table.index('status');
    table.unique(['household_id', 'user_id']);
  });

  // Create payments table
  return knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('household_id')
      .references('id')
      .inTable('households')
      .onDelete('CASCADE')
      .notNullable();
    table.uuid('payer_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.integer('amount').notNullable(); // Amount in cents
    table.enum('type', ['rent', 'utilities', 'deposit', 'other']).notNullable();
    table
      .enum('status', ['pending', 'processing', 'completed', 'failed', 'refunded'])
      .defaultTo('pending');
    table.string('stripe_payment_intent_id');
    table.string('stripe_charge_id');
    table.text('description');
    table.timestamp('due_date');
    table.timestamp('paid_at');
    table.timestamps(true, true);

    table.index('household_id');
    table.index('payer_id');
    table.index('status');
    table.index('type');
    table.index('due_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('payments');
  await knex.schema.dropTable('household_members');
  return knex.schema.dropTable('households');
}
