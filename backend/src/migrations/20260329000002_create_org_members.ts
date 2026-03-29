import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('org_members', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('org_id').notNullable().references('id').inTable('organizations').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('role', ['case_manager', 'program_director', 'org_admin', 'super_admin']).notNullable().defaultTo('case_manager');
    table.timestamp('invited_at').nullable();
    table.timestamp('accepted_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.unique(['org_id', 'user_id']);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_org_members_org_id ON org_members (org_id);
    CREATE INDEX idx_org_members_user_id ON org_members (user_id);
    CREATE INDEX idx_org_members_role ON org_members (role);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('org_members');
}
