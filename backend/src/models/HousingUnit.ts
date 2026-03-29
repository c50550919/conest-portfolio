import { db } from '../config/database';

export interface HousingUnit {
  id: string;
  org_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  location: unknown;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  landlord_name: string | null;
  landlord_contact: string | null;
  accessibility_features: string[];
  language_spoken: string | null;
  available_from: string | null;
  available_until: string | null;
  status: 'available' | 'reserved' | 'occupied' | 'inactive';
  nearby_services: Record<string, unknown>;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const HousingUnitModel = {
  async findByOrg(
    orgId: string,
    filters?: { status?: string; min_bedrooms?: number },
  ): Promise<HousingUnit[]> {
    let query = db('housing_units').where({ org_id: orgId });
    if (filters?.status) query = query.where({ status: filters.status });
    if (filters?.min_bedrooms)
      query = query.where('bedrooms', '>=', filters.min_bedrooms);
    return query.orderBy('created_at', 'desc');
  },

  async findById(
    orgId: string,
    id: string,
  ): Promise<HousingUnit | undefined> {
    return db('housing_units').where({ id, org_id: orgId }).first();
  },

  async findAvailable(orgId: string): Promise<HousingUnit[]> {
    return db('housing_units')
      .where({ org_id: orgId, status: 'available' })
      .orderBy('rent_amount', 'asc');
  },

  async create(data: Partial<HousingUnit>): Promise<HousingUnit> {
    const [unit] = await db('housing_units').insert(data).returning('*');
    return unit;
  },

  async update(
    orgId: string,
    id: string,
    data: Partial<HousingUnit>,
  ): Promise<HousingUnit> {
    const [unit] = await db('housing_units')
      .where({ id, org_id: orgId })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return unit;
  },
};

export default HousingUnitModel;
