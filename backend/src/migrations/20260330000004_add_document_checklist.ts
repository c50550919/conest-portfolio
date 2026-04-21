import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('placements', (table) => {
    table.jsonb('document_checklist').notNullable().defaultTo(JSON.stringify({
      version: 1,
      items: [
        { type: 'government_id', label: 'Government ID', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'income_proof', label: 'Income Verification', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'background_check', label: 'Background Check', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'references', label: 'References', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'lease_agreement', label: 'Lease Agreement', status: 'missing', updated_at: null, activity_event_id: null },
        { type: 'inspection_report', label: 'Unit Inspection', status: 'missing', updated_at: null, activity_event_id: null },
      ],
    }));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('placements', (table) => {
    table.dropColumn('document_checklist');
  });
}
