import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('phone').unique();
    table.boolean('phone_verified').defaultTo(false);
    table.boolean('email_verified').defaultTo(false);
    table.boolean('two_factor_enabled').defaultTo(false);
    table.string('two_factor_secret');
    table.enum('status', ['active', 'suspended', 'deactivated']).defaultTo('active');
    table.timestamp('last_login_at');
    table.timestamps(true, true);

    table.index('email');
    table.index('phone');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
