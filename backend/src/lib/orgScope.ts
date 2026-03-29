import { db } from '../config/database';
import { Knex } from 'knex';

/**
 * Returns a Knex query builder pre-scoped to a specific org_id.
 * Use this instead of raw db('table') to enforce tenant isolation.
 */
export function scopedQuery(table: string, orgId: string): Knex.QueryBuilder {
  if (!orgId) {
    throw new Error('orgId is required for scoped queries');
  }
  return db(table).where({ org_id: orgId });
}

/**
 * Returns an org-scoped context object with a bound query helper.
 * Usage:
 *   const scoped = withOrgScope(req.orgId);
 *   const clients = await scoped.query('clients').where({ status: 'ready' });
 */
export function withOrgScope(orgId: string) {
  if (!orgId) {
    throw new Error('orgId is required for org scope');
  }

  return {
    orgId,
    query: (table: string) => db(table).where({ org_id: orgId }),
    insert: (
      table: string,
      data: Record<string, unknown> | Record<string, unknown>[],
    ) => {
      const rows = Array.isArray(data) ? data : [data];
      const scopedRows = rows.map((row) => ({ ...row, org_id: orgId }));
      return db(table).insert(scopedRows).returning('*');
    },
  };
}
