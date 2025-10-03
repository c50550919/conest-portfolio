import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create conversations table
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('participant_1_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('participant_2_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.timestamp('last_message_at');
    table.timestamps(true, true);

    table.index('participant_1_id');
    table.index('participant_2_id');
    table.unique(['participant_1_id', 'participant_2_id']);
  });

  // Create messages table
  return knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('conversation_id').references('id').inTable('conversations').onDelete('CASCADE').notNullable();
    table.uuid('sender_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('content').notNullable(); // Encrypted
    table.enum('message_type', ['text', 'image', 'file']).defaultTo('text');
    table.string('file_url');
    table.boolean('read').defaultTo(false);
    table.timestamp('read_at');
    table.boolean('deleted').defaultTo(false);
    table.timestamps(true, true);

    table.index('conversation_id');
    table.index('sender_id');
    table.index('read');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('messages');
  return knex.schema.dropTable('conversations');
}
