/**
 * Parent Model
 *
 * Purpose: Database model for parent profiles
 * Constitution: Principle I - NO child PII, only aggregated data
 *
 * Table: parents
 * Child Safety: ONLY stores childrenCount and childrenAgeGroups (NO names, photos, schools)
 */

import db from '../config/database';

export interface Parent {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_photo_url?: string;
  date_of_birth: Date;

  // Children info (NO PII - Constitution Principle I)
  children_count: number;
  children_age_groups: string[]; // ['infant', 'toddler', 'elementary', 'teen']

  // Location
  city?: string;
  state?: string;
  zip_code?: string;
  location?: any; // PostGIS geography point
  preferred_radius?: number;

  // Work & Schedule
  occupation?: string;
  employer?: string;
  work_schedule?: any; // JSON
  work_from_home?: boolean;

  // Parenting & Household
  parenting_style?: string;
  household_preferences?: any; // JSON
  dietary_restrictions?: string[];
  allergies?: string[];

  // Housing
  budget_min?: number;
  budget_max?: number;
  move_in_date?: Date;
  looking_for_housing?: boolean;
  school_districts?: string[];

  // Verification
  verified_status?: string;
  background_check_status?: string;
  background_check_date?: Date;
  id_verified?: boolean;
  income_verified?: boolean;
  references_count?: number;

  // Profile metrics
  profile_completed?: boolean;
  profile_completion_percentage?: number;
  trust_score?: number;
  response_rate?: number;
  average_response_time?: number;

  created_at: Date;
  updated_at: Date;
}

export interface CreateParentData {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | Date; // Optional for OAuth users (can be added later)
  children_count: number;
  children_age_groups: string[];
  city?: string;
  state?: string;
  zip_code?: string;
  budget_min?: number;
  budget_max?: number;
}

export const ParentModel = {
  /**
   * Create new parent profile
   * CRITICAL: Only accepts aggregated child data (count + age groups)
   * Supports transactions for atomic OAuth user creation
   */
  async create(data: CreateParentData, trx?: any): Promise<Parent> {
    const parentData = {
      user_id: data.user_id,
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth || null, // Optional for OAuth signups
      children_count: data.children_count,
      children_age_groups: data.children_age_groups,
      city: data.city,
      state: data.state,
      zip_code: data.zip_code,
      budget_min: data.budget_min || 0,
      budget_max: data.budget_max || 0,
      verified_status: 'pending',
      background_check_status: 'not_started',
      id_verified: false,
      income_verified: false,
      references_count: 0,
      looking_for_housing: true,
      profile_completed: false,
      profile_completion_percentage: 30, // Basic info provided
      trust_score: 0.50,
      response_rate: 0.00,
      preferred_radius: 10,
    };

    const query = trx ? trx('parents') : db('parents');
    const [parent] = await query
      .insert(parentData)
      .returning('*');

    return parent;
  },

  /**
   * Find parent profile by user ID
   */
  async findByUserId(userId: string): Promise<Parent | undefined> {
    return await db('parents')
      .where({ user_id: userId })
      .first();
  },

  /**
   * Find parent profile by parent ID
   */
  async findById(id: string): Promise<Parent | undefined> {
    return await db('parents')
      .where({ id })
      .first();
  },

  /**
   * Update parent profile
   */
  async update(id: string, data: Partial<Parent>): Promise<Parent> {
    const [parent] = await db('parents')
      .where({ id })
      .update({
        ...data,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return parent;
  },

  /**
   * Search parents for discovery
   */
  async search(filters: {
    city?: string;
    state?: string;
    budgetMin?: number;
    budgetMax?: number;
    lookingForHousing?: boolean;
  }): Promise<Parent[]> {
    let query = db('parents').select('*');

    if (filters.city) {
      query = query.where({ city: filters.city });
    }
    if (filters.state) {
      query = query.where({ state: filters.state });
    }
    if (filters.budgetMin) {
      query = query.where('budget_max', '>=', filters.budgetMin);
    }
    if (filters.budgetMax) {
      query = query.where('budget_min', '<=', filters.budgetMax);
    }
    if (filters.lookingForHousing !== undefined) {
      query = query.where({ looking_for_housing: filters.lookingForHousing });
    }

    return await query;
  },
};
