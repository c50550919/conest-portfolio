/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
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
 *
 * IMPORTANT: The actual database schema uses `active` (boolean),
 * not `status` (enum). This model matches the actual database.
 */

export interface Household {
  id: string;
  name: string;
  address_encrypted: string;
  address_hash?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  monthly_rent: number; // Amount in dollars (numeric)
  bedrooms: number;
  max_occupants: number;
  house_rules: string;
  lease_start_date?: Date;
  lease_end_date?: Date;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHouseholdData {
  name: string;
  address_encrypted: string;
  address_hash?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  monthly_rent: number;
  bedrooms: number;
  max_occupants: number;
  house_rules: string;
  location: string; // PostGIS geography point
  lease_start_date?: Date;
  lease_end_date?: Date;
}

export const HouseholdModel = {
  async create(data: CreateHouseholdData): Promise<Household> {
    const [household] = await db('households')
      .insert({ ...data, active: true })
      .returning('*');
    return household;
  },

  async findById(id: string): Promise<Household | undefined> {
    return await db('households').where({ id }).first();
  },

  async findByAddressHash(addressHash: string): Promise<Household | undefined> {
    return await db('households')
      .where({ address_hash: addressHash })
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
      .where({ active: true })
      .orderBy('created_at', 'desc');
  },

  /**
   * Deactivate household (soft delete)
   */
  async deactivate(id: string): Promise<Household> {
    return await this.update(id, { active: false });
  },

  /**
   * Get household member count
   * Note: household_members table doesn't have status column,
   * use move_out_date to determine active members
   */
  async getMemberCount(id: string): Promise<number> {
    const result = await db('household_members')
      .where({ household_id: id })
      .whereNull('move_out_date')
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
 */
