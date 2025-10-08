import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('swipes', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Foreign keys
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('User who performed the swipe');

    table
      .uuid('target_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .comment('Profile being swiped on');

    // Swipe data
    table
      .enum('direction', ['left', 'right'])
      .notNullable()
      .comment('Swipe direction: left=pass, right=interest');

    // Timestamps
    table
      .timestamp('swiped_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When swipe occurred');

    // Constraints
    table.check('user_id <> target_user_id', [], 'no_self_swipe');

    // Unique constraint: user cannot swipe on same target twice (swipes are final - no undo)
    table.unique(['user_id', 'target_user_id'], {
      indexName: 'unique_swipe',
    });

    // Indexes for performance
    table.index(['user_id', 'target_user_id'], 'idx_swipes_user_target');
    table.index(['target_user_id', 'direction'], 'idx_swipes_target_direction');
    table.index('swiped_at', 'idx_swipes_swiped_at');

    // Metadata
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Add trigger for updated_at
  await knex.raw(`
    CREATE TRIGGER update_swipes_updated_at
    BEFORE UPDATE ON swipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('swipes');
}
