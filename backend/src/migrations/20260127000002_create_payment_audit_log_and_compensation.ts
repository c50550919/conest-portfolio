import { Knex } from 'knex';

/**
 * Migration: Payment Audit Log and Compensation Tables
 *
 * TASK-W2-02: Payment Rollback/Compensation Service
 * Date: 2026-01-27
 *
 * This migration adds:
 * 1. payment_audit_log - Track all payment state transitions for audit trail
 * 2. payment_compensation_events - Track rollback and compensation operations
 * 3. split_rent_operations - Track multi-payment split rent operations with saga state
 *
 * Constitution Principle III: Security - Full audit trail of all payment operations
 * Constitution Principle IV: Performance - Indexed for efficient querying
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // 1. CREATE payment_audit_log TABLE
  // ============================================================
  await knex.schema.createTable('payment_audit_log', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Payment reference
    table.uuid('payment_id').nullable().references('id').inTable('payments').onDelete('SET NULL');
    table.string('stripe_payment_intent_id', 255).nullable();

    // Event details
    table.string('event_type', 50).notNullable();
    table.string('previous_status', 30).nullable();
    table.string('new_status', 30).nullable();

    // Actor tracking
    table.uuid('actor_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('actor_type', 20).notNullable().defaultTo('system'); // system, user, webhook, scheduled

    // Context and metadata
    table.string('operation_id', 255).nullable(); // For correlating related events (e.g., saga operations)
    table.jsonb('metadata').nullable();
    table.text('error_message').nullable();

    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check(
      "event_type IN ('created', 'status_changed', 'intent_created', 'intent_confirmed', 'intent_failed', 'intent_canceled', 'refund_initiated', 'refund_completed', 'refund_failed', 'compensation_started', 'compensation_completed', 'compensation_failed', 'rollback_started', 'rollback_completed', 'rollback_failed')",
      [],
      'chk_payment_audit_event_type',
    );
    table.check(
      "actor_type IN ('system', 'user', 'webhook', 'scheduled', 'compensation')",
      [],
      'chk_payment_audit_actor_type',
    );
  });

  // Indexes for payment_audit_log
  await knex.raw(`
    CREATE INDEX idx_payment_audit_payment_id ON payment_audit_log(payment_id);
    CREATE INDEX idx_payment_audit_stripe_intent ON payment_audit_log(stripe_payment_intent_id);
    CREATE INDEX idx_payment_audit_event_type ON payment_audit_log(event_type);
    CREATE INDEX idx_payment_audit_operation_id ON payment_audit_log(operation_id);
    CREATE INDEX idx_payment_audit_created_at ON payment_audit_log(created_at DESC);
    CREATE INDEX idx_payment_audit_actor ON payment_audit_log(actor_id, actor_type);
  `);

  // ============================================================
  // 2. CREATE payment_compensation_events TABLE
  // ============================================================
  await knex.schema.createTable('payment_compensation_events', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Operation reference
    table.string('operation_id', 255).notNullable(); // Correlates with split rent operation
    table.uuid('payment_id').nullable().references('id').inTable('payments').onDelete('SET NULL');
    table.string('stripe_payment_intent_id', 255).nullable();
    table.string('stripe_refund_id', 255).nullable();

    // Compensation details
    table.string('compensation_type', 30).notNullable(); // refund, void, cancel, reversal
    table.string('status', 20).notNullable().defaultTo('pending');
    table.integer('amount').notNullable().defaultTo(0); // Amount in cents
    table.string('reason', 255).nullable();

    // Error handling
    table.text('error_message').nullable();
    table.integer('retry_count').notNullable().defaultTo(0);
    table.timestamp('last_retry_at').nullable();

    // Timestamps
    table.timestamp('initiated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check(
      "compensation_type IN ('refund', 'void', 'cancel', 'reversal')",
      [],
      'chk_compensation_type',
    );
    table.check(
      "status IN ('pending', 'processing', 'completed', 'failed', 'skipped')",
      [],
      'chk_compensation_status',
    );
  });

  // Indexes for payment_compensation_events
  await knex.raw(`
    CREATE INDEX idx_compensation_operation_id ON payment_compensation_events(operation_id);
    CREATE INDEX idx_compensation_payment_id ON payment_compensation_events(payment_id);
    CREATE INDEX idx_compensation_stripe_intent ON payment_compensation_events(stripe_payment_intent_id);
    CREATE INDEX idx_compensation_status ON payment_compensation_events(status);
    CREATE INDEX idx_compensation_type ON payment_compensation_events(compensation_type);
    CREATE INDEX idx_compensation_created_at ON payment_compensation_events(created_at DESC);
  `);

  // ============================================================
  // 3. CREATE split_rent_operations TABLE
  // ============================================================
  await knex.schema.createTable('split_rent_operations', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Operation tracking
    table.string('operation_id', 255).unique().notNullable(); // Unique operation ID for saga tracking
    table.uuid('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');

    // Saga state
    table.string('saga_status', 30).notNullable().defaultTo('pending');
    table.string('current_step', 50).nullable();
    table.integer('total_steps').notNullable().defaultTo(0);
    table.integer('completed_steps').notNullable().defaultTo(0);

    // Payment details
    table.integer('total_amount').notNullable(); // Total rent amount in cents
    table.integer('member_count').notNullable(); // Number of members in split
    table.jsonb('payment_ids').notNullable().defaultTo('[]'); // Array of payment IDs created
    table.jsonb('stripe_intent_ids').notNullable().defaultTo('[]'); // Array of Stripe intent IDs

    // Period tracking
    table.integer('rent_year').notNullable();
    table.integer('rent_month').notNullable(); // 1-12

    // Idempotency
    table.string('idempotency_key', 255).unique().nullable();

    // Error handling
    table.text('error_message').nullable();
    table.string('failed_step', 50).nullable();

    // Timestamps
    table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('compensated_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.check(
      "saga_status IN ('pending', 'in_progress', 'completed', 'failed', 'compensating', 'compensated', 'compensation_failed')",
      [],
      'chk_saga_status',
    );
    table.check(
      'rent_month >= 1 AND rent_month <= 12',
      [],
      'chk_rent_month_range',
    );
  });

  // Indexes for split_rent_operations
  await knex.raw(`
    CREATE INDEX idx_split_rent_operation_id ON split_rent_operations(operation_id);
    CREATE INDEX idx_split_rent_household ON split_rent_operations(household_id);
    CREATE INDEX idx_split_rent_saga_status ON split_rent_operations(saga_status);
    CREATE INDEX idx_split_rent_period ON split_rent_operations(rent_year, rent_month);
    CREATE INDEX idx_split_rent_idempotency ON split_rent_operations(idempotency_key);
    CREATE INDEX idx_split_rent_created_at ON split_rent_operations(created_at DESC);
  `);

  // Unique constraint for one operation per household per month
  await knex.raw(`
    CREATE UNIQUE INDEX idx_split_rent_household_period
    ON split_rent_operations(household_id, rent_year, rent_month)
    WHERE saga_status NOT IN ('failed', 'compensated', 'compensation_failed');
  `);

  // ============================================================
  // 4. ADD cancelled status to payments table
  // ============================================================
  await knex.raw(`
    ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_status_check;

    ALTER TABLE payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'));
  `);

  // Add operation_id column to payments for saga tracking
  await knex.schema.alterTable('payments', (table) => {
    table.string('operation_id', 255).nullable();
  });

  await knex.raw(`
    CREATE INDEX idx_payments_operation_id ON payments(operation_id);
  `);

  // ============================================================
  // 5. CREATE trigger for updated_at on split_rent_operations
  // ============================================================
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_split_rent_operations_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_split_rent_operations_updated_at ON split_rent_operations;
    CREATE TRIGGER trg_split_rent_operations_updated_at
      BEFORE UPDATE ON split_rent_operations
      FOR EACH ROW
      EXECUTE FUNCTION update_split_rent_operations_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop trigger
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_split_rent_operations_updated_at ON split_rent_operations;
    DROP FUNCTION IF EXISTS update_split_rent_operations_updated_at();
  `);

  // Remove operation_id from payments
  await knex.raw(`
    DROP INDEX IF EXISTS idx_payments_operation_id;
  `);
  await knex.schema.alterTable('payments', (table) => {
    table.dropColumn('operation_id');
  });

  // Restore original payments status constraint
  await knex.raw(`
    ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_status_check;

    ALTER TABLE payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));
  `);

  // Drop split_rent_operations indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_split_rent_household_period;
    DROP INDEX IF EXISTS idx_split_rent_created_at;
    DROP INDEX IF EXISTS idx_split_rent_idempotency;
    DROP INDEX IF EXISTS idx_split_rent_period;
    DROP INDEX IF EXISTS idx_split_rent_saga_status;
    DROP INDEX IF EXISTS idx_split_rent_household;
    DROP INDEX IF EXISTS idx_split_rent_operation_id;
  `);

  // Drop payment_compensation_events indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_compensation_created_at;
    DROP INDEX IF EXISTS idx_compensation_type;
    DROP INDEX IF EXISTS idx_compensation_status;
    DROP INDEX IF EXISTS idx_compensation_stripe_intent;
    DROP INDEX IF EXISTS idx_compensation_payment_id;
    DROP INDEX IF EXISTS idx_compensation_operation_id;
  `);

  // Drop payment_audit_log indexes
  await knex.raw(`
    DROP INDEX IF EXISTS idx_payment_audit_actor;
    DROP INDEX IF EXISTS idx_payment_audit_created_at;
    DROP INDEX IF EXISTS idx_payment_audit_operation_id;
    DROP INDEX IF EXISTS idx_payment_audit_event_type;
    DROP INDEX IF EXISTS idx_payment_audit_stripe_intent;
    DROP INDEX IF EXISTS idx_payment_audit_payment_id;
  `);

  // Drop tables
  await knex.schema.dropTableIfExists('split_rent_operations');
  await knex.schema.dropTableIfExists('payment_compensation_events');
  await knex.schema.dropTableIfExists('payment_audit_log');
}
