import { db } from '../config/database';

export interface Client {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  household_size: number;
  income_range: string | null;
  language_primary: string | null;
  language_secondary: string | null;
  cultural_preferences: Record<string, unknown>;
  accessibility_needs: Record<string, unknown>;
  location_preference: unknown;
  preferred_area: string | null;
  budget_max: number | null;
  status: 'intake' | 'ready' | 'placed' | 'exited';
  case_manager_id: string | null;
  intake_date: string | null;
  notes_encrypted: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

const ClientModel = {
  async findByOrg(
    orgId: string,
    filters?: { status?: string; case_manager_id?: string },
  ): Promise<Client[]> {
    let query = db('clients').where({ org_id: orgId });
    if (filters?.status) query = query.where({ status: filters.status });
    if (filters?.case_manager_id)
      query = query.where({ case_manager_id: filters.case_manager_id });
    return query.orderBy('created_at', 'desc');
  },

  async findById(orgId: string, id: string): Promise<Client | undefined> {
    return db('clients').where({ id, org_id: orgId }).first();
  },

  async create(data: Partial<Client>): Promise<Client> {
    const [client] = await db('clients').insert(data).returning('*');
    return client;
  },

  async update(
    orgId: string,
    id: string,
    data: Partial<Client>,
  ): Promise<Client> {
    const [client] = await db('clients')
      .where({ id, org_id: orgId })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return client;
  },

  async delete(orgId: string, id: string): Promise<boolean> {
    const count = await db('clients').where({ id, org_id: orgId }).del();
    return count > 0;
  },

  async deleteBulk(orgId: string, ids: string[]): Promise<number> {
    return db('clients').where({ org_id: orgId }).whereIn('id', ids).del();
  },

  async countByOrg(orgId: string): Promise<Record<string, number>> {
    const counts = await db('clients')
      .where({ org_id: orgId })
      .groupBy('status')
      .select('status')
      .count('* as count');
    return counts.reduce(
      (acc: Record<string, number>, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  },
};

export default ClientModel;
