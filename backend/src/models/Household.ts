import { db } from '../config/database';

/**
 * Household Model
 *
 * Constitution Principle I: Child Safety
 * - NO child PII storage in household data
 *
 * Business Model:
 * - Rent splitting and expense management
 * - Stripe Connect integration for payments
 * - Multi-member household support
 */

export interface Household {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  monthly_rent: number; // Amount in cents
  lease_start_date?: Date;
  lease_end_date?: Date;
  stripe_account_id?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface CreateHouseholdData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  monthly_rent: number;
  lease_start_date?: Date;
  lease_end_date?: Date;
}

export const HouseholdModel = {
  async create(data: CreateHouseholdData): Promise<Household> {
    const [household] = await db('households')
      .insert({ ...data, status: 'active' })
      .returning('*');
    return household;
  },

  async findById(id: string): Promise<Household | undefined> {
    return await db('households').where({ id }).first();
  },

  async findByAddress(address: string, zipCode: string): Promise<Household | undefined> {
    return await db('households')
      .where({ address, zip_code: zipCode })
      .first();
  },

  async update(id: string, data: Partial<Household>): Promise<Household> {
    const [household] = await db('households')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return household;
  },

  async delete(id: string): Promise<void> {
    await db('households').where({ id }).delete();
  },

  /**
   * Get all active households
   */
  async getActive(): Promise<Household[]> {
    return await db('households')
      .where({ status: 'active' })
      .orderBy('created_at', 'desc');
  },

  /**
   * Deactivate household (soft delete)
   */
  async deactivate(id: string): Promise<Household> {
    return await this.update(id, { status: 'inactive' });
  },

  /**
   * Link Stripe Connect account to household
   */
  async setStripeAccount(id: string, stripeAccountId: string): Promise<Household> {
    return await this.update(id, { stripe_account_id: stripeAccountId });
  },

  /**
   * Get household member count
   */
  async getMemberCount(id: string): Promise<number> {
    const result = await db('household_members')
      .where({ household_id: id, status: 'active' })
      .count('* as count')
      .first();
    return parseInt(result?.count as string || '0', 10);
  },

  /**
   * Check if household is full (optional capacity limit)
   */
  async isFull(id: string, maxMembers: number = 4): Promise<boolean> {
    const count = await this.getMemberCount(id);
    return count >= maxMembers;
  },
};

/**
 * Household Model Relations:
 *
 * - hasMany: HouseholdMembers (via household_id foreign key)
 * - hasMany: Payments (via household_id foreign key)
 * - hasMany: Expenses (via household_id foreign key)
 */
