import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.integer('household_size').notNullable().defaultTo(1);
    table.string('income_range', 50).nullable();
    table.string('language_primary', 50).nullable();
    table.string('language_secondary', 50).nullable();
    table.jsonb('cultural_preferences').notNullable().defaultTo('{}');
    table.jsonb('accessibility_needs').notNullable().defaultTo('{}');
    table.specificType('location_preference', 'geography(Point, 4326)').nullable();
    table.string('preferred_area', 255).nullable();
    table.integer('budget_max').nullable();
    table.enum('status', ['intake', 'ready', 'placed', 'exited']).notNullable().defaultTo('intake');
    table.uuid('case_manager_id').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    table.date('intake_date').nullable();
    table.text('notes_encrypted').nullable();
    table.string('phone', 20).nullable();
    table.string('email', 255).nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_clients_org_id ON clients (org_id);
    CREATE INDEX idx_clients_status ON clients (status);
    CREATE INDEX idx_clients_case_manager_id ON clients (case_manager_id);
    CREATE INDEX idx_clients_org_status ON clients (org_id, status);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clients');
}
