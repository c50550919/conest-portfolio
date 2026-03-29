import { db } from '../config/database';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: 'starter' | 'professional' | 'enterprise';
  stripe_customer_id: string | null;
  settings: Record<string, unknown>;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const OrganizationModel = {
  async findById(id: string): Promise<Organization | undefined> {
    return db('organizations').where({ id }).first();
  },

  async findBySlug(slug: string): Promise<Organization | undefined> {
    return db('organizations').where({ slug, is_active: true }).first();
  },

  async create(data: Partial<Organization>): Promise<Organization> {
    const [org] = await db('organizations').insert(data).returning('*');
    return org;
  },

  async update(
    id: string,
    data: Partial<Organization>,
  ): Promise<Organization> {
    const [org] = await db('organizations')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return org;
  },
};

export default OrganizationModel;
