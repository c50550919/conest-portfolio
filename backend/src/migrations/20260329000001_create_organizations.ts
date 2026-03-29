import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('organizations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('slug', 100).notNullable().unique();
    table.enum('plan_tier', ['starter', 'professional', 'enterprise']).notNullable().defaultTo('starter');
    table.string('stripe_customer_id', 255).nullable();
    table.jsonb('settings').notNullable().defaultTo('{}');
    table.string('phone', 20).nullable();
    table.string('email', 255).nullable();
    table.string('website', 255).nullable();
    table.string('address', 500).nullable();
    table.string('city', 100).nullable();
    table.string('state', 2).nullable();
    table.string('zip', 10).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_organizations_slug ON organizations (slug);
    CREATE INDEX idx_organizations_plan_tier ON organizations (plan_tier);
    CREATE INDEX idx_organizations_is_active ON organizations (is_active);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organizations');
}
