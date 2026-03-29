import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('housing_units', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.string('address', 500).notNullable();
    table.string('city', 100).notNullable();
    table.string('state', 2).notNullable();
    table.string('zip', 10).notNullable();
    table.specificType('location', 'geography(Point, 4326)').nullable();
    table.integer('bedrooms').notNullable();
    table.integer('bathrooms').notNullable();
    table.integer('rent_amount').notNullable();
    table.string('landlord_name', 255).nullable();
    table.string('landlord_contact', 255).nullable();
    table.jsonb('accessibility_features').notNullable().defaultTo('[]');
    table.string('language_spoken', 50).nullable();
    table.date('available_from').nullable();
    table.date('available_until').nullable();
    table.enum('status', ['available', 'reserved', 'occupied', 'inactive']).notNullable().defaultTo('available');
    table.jsonb('nearby_services').notNullable().defaultTo('{}');
    table.text('notes').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_housing_units_org_id ON housing_units (org_id);
    CREATE INDEX idx_housing_units_status ON housing_units (status);
    CREATE INDEX idx_housing_units_org_status ON housing_units (org_id, status);
    CREATE INDEX idx_housing_units_rent ON housing_units (rent_amount);
    CREATE INDEX idx_housing_units_bedrooms ON housing_units (bedrooms);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('housing_units');
}
