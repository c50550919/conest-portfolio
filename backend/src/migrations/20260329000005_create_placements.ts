import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('placements', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE');
    table.uuid('unit_id').nullable().references('id').inTable('housing_units').onDelete('SET NULL');
    table.uuid('case_manager_id').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    table.enum('stage', ['intake', 'matching', 'proposed', 'accepted', 'placed', 'closed']).notNullable().defaultTo('intake');
    table.decimal('compatibility_score', 5, 2).nullable();
    table.jsonb('score_breakdown').nullable();
    table.timestamp('proposed_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.timestamp('placed_at').nullable();
    table.timestamp('closed_at').nullable();
    table.enum('outcome', ['successful', 'unsuccessful', 'withdrawn']).nullable();
    table.text('notes_encrypted').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_placements_org_id ON placements (org_id);
    CREATE INDEX idx_placements_client_id ON placements (client_id);
    CREATE INDEX idx_placements_unit_id ON placements (unit_id);
    CREATE INDEX idx_placements_stage ON placements (stage);
    CREATE INDEX idx_placements_org_stage ON placements (org_id, stage);
    CREATE INDEX idx_placements_case_manager ON placements (case_manager_id);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('placements');
}
