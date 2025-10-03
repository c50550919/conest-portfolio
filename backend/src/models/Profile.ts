import db from '../config/database';

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  bio?: string;
  profile_image_url?: string;

  // Location
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;

  // Housing preferences
  budget_min: number;
  budget_max: number;
  move_in_date?: Date;
  lease_duration_months?: number;

  // Parenting info (NO CHILD DATA - only parent info)
  number_of_children: number;
  ages_of_children: string; // JSON string of age ranges only, e.g., "3-5,8-10"
  parenting_style?: string; // e.g., "structured", "relaxed", "balanced"

  // Compatibility factors
  schedule_type: 'flexible' | 'fixed' | 'shift_work';
  work_from_home: boolean;
  pets?: boolean;
  smoking?: boolean;
  dietary_preferences?: string;
  house_rules?: string; // JSON string

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
  number_of_children: number;
  ages_of_children: string;
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
