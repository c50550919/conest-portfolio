import db from '../config/database';
import { EnhancedPreferences } from '../types/preferences';

/**
 * Profile Model - FHA COMPLIANT
 *
 * Purpose: User profile with preference-based compatibility data
 * Date: 2025-11-07 (Enhanced with 8-factor scoring)
 *
 * FHA COMPLIANCE:
 * - Child data is OPTIONAL (user-initiated disclosure)
 * - All compatibility fields are USER PREFERENCES, not protected characteristics
 * - 100% preference-based scoring (0% family composition scoring)
 */

export interface Profile extends EnhancedPreferences {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  bio?: string;
  profile_image_url?: string;

  // FHA COMPLIANCE: Child data is OPTIONAL (user-initiated disclosure)
  // Users can choose whether to share family information
  children_count?: number; // OPTIONAL - not used in scoring
  children_age_groups?: string; // OPTIONAL - not used in scoring
  parenting_style?: string; // User preference (philosophy, not family composition)

  // Verification status
  verified: boolean;
  verification_level: 'none' | 'basic' | 'full';

  created_at: Date;
  updated_at: Date;
}

export interface CreateProfileData {
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  city: string;
  state: string;
  zip_code: string;
  budget_min: number;
  budget_max: number;
  children_count?: number;
  children_age_groups?: string;
  schedule_type: 'flexible' | 'fixed' | 'shift_work';
  work_from_home: boolean;
}

export const ProfileModel = {
  async create(data: CreateProfileData): Promise<Profile> {
    const [profile] = await db('profiles').insert(data).returning('*');
    return profile;
  },

  async findById(id: string): Promise<Profile | undefined> {
    return await db('profiles').where({ id }).first();
  },

  async findByUserId(userId: string): Promise<Profile | undefined> {
    return await db('profiles').where({ user_id: userId }).first();
  },

  async update(id: string, data: Partial<Profile>): Promise<Profile> {
    const [profile] = await db('profiles')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return profile;
  },

  async search(filters: {
    city?: string;
    state?: string;
    budgetMin?: number;
    budgetMax?: number;
    verified?: boolean;
  }): Promise<Profile[]> {
    let query = db('profiles').select('*');

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
    if (filters.verified !== undefined) {
      query = query.where({ verified: filters.verified });
    }

    return await query;
  },

  async delete(id: string): Promise<void> {
    await db('profiles').where({ id }).delete();
  },
};
