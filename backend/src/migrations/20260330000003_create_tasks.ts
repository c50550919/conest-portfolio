import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('client_id').nullable().references('id').inTable('clients').onDelete('SET NULL');
    table.uuid('placement_id').nullable().references('id').inTable('placements').onDelete('SET NULL');
    table.uuid('assigned_to').nullable().references('id').inTable('org_members').onDelete('SET NULL');
    table.uuid('created_by').notNullable().references('id').inTable('org_members');
    table.string('created_by_name', 255).notNullable();

    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.date('due_date').nullable();
    table.string('priority', 20).notNullable().defaultTo('medium'); // low, medium, high, urgent
    table.string('status', 20).notNullable().defaultTo('pending'); // pending, in_progress, completed, cancelled

    table.boolean('auto_generated').notNullable().defaultTo(false);
    table.string('source_event', 100).nullable();
    table.uuid('source_activity_event_id').nullable().references('id').inTable('activity_events').onDelete('SET NULL');

    table.timestamp('completed_at', { useTz: true }).nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    CREATE INDEX idx_tasks_org ON tasks (org_id);
    CREATE INDEX idx_tasks_client ON tasks (client_id);
    CREATE INDEX idx_tasks_placement ON tasks (placement_id);
    CREATE INDEX idx_tasks_assigned ON tasks (assigned_to);
    CREATE INDEX idx_tasks_status ON tasks (status);
    CREATE INDEX idx_tasks_due ON tasks (due_date);
    CREATE INDEX idx_tasks_dashboard ON tasks (org_id, status, due_date) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tasks_assignee_dashboard ON tasks (assigned_to, status, due_date) WHERE deleted_at IS NULL;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tasks');
}
