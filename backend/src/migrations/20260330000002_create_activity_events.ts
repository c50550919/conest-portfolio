import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('activity_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('idempotency_key', 255).nullable();
    table.uuid('org_id').notNullable().references('id').inTable('organizations');
    table.uuid('client_id').nullable().references('id').inTable('clients').onDelete('SET NULL');
    table.uuid('placement_id').nullable().references('id').inTable('placements').onDelete('SET NULL');
    table.uuid('actor_id').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    table.string('event_type', 50).notNullable();
    table.string('origin', 20).notNullable().defaultTo('user');
    table.boolean('is_private').notNullable().defaultTo(false);
    table.string('title', 255).nullable();
    table.text('body').nullable();
    table.string('note_type', 50).nullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_activity_events_org ON activity_events (org_id);
    CREATE INDEX idx_activity_events_client ON activity_events (client_id);
    CREATE INDEX idx_activity_events_placement ON activity_events (placement_id);
    CREATE INDEX idx_activity_events_type ON activity_events (event_type);
    CREATE INDEX idx_activity_events_created ON activity_events (created_at DESC);
    CREATE INDEX idx_activity_events_client_timeline ON activity_events (client_id, created_at DESC) WHERE client_id IS NOT NULL;
    CREATE UNIQUE INDEX idx_activity_events_idempotency ON activity_events (idempotency_key) WHERE idempotency_key IS NOT NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('activity_events');
}
