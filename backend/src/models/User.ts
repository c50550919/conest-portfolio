import { db } from '../config/database';

/**
 * User Model
 *
 * Constitution Principle I: Child Safety
 * - NO child PII storage - only parent data
 *
 * Constitution Principle III: Security
 * - Password hashing with bcrypt (cost factor 12)
 * - JWT refresh tokens stored as array for multi-device support
 * - Phone and email verification tracking
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  phone?: string; // Database column is "phone", not "phone_number"
  phone_verified: boolean;
  email_verified: boolean;
  mfa_enabled: boolean; // Database column is "mfa_enabled", not "two_factor_enabled"
  mfa_secret?: string; // Database column is "mfa_secret", not "two_factor_secret"
  account_status: 'active' | 'suspended' | 'deleted'; // Database column is "account_status", not "status"
  last_login?: Date; // Database column is "last_login", not "last_login_at"
  refresh_token_hash?: string; // Database column is "refresh_token_hash", not array
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  phone?: string; // Database column is "phone", not "phone_number"
}

export const UserModel = {
  async create(data: CreateUserData): Promise<User> {
    const [user] = await db('users').insert(data).returning('*');
    return user;
  },

  async findById(id: string): Promise<User | undefined> {
    return await db('users').where({ id }).first();
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return await db('users').where({ email }).first();
  },

  async findByPhone(phone: string): Promise<User | undefined> {
    return await db('users').where({ phone }).first();
  },

  async update(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db('users')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return user;
  },

  async updateLastLogin(id: string): Promise<void> {
    await db('users')
      .where({ id })
      .update({ last_login: db.fn.now() });
  },

  async delete(id: string): Promise<void> {
    await db('users').where({ id }).delete();
  },

  /**
   * Set refresh token hash (single token, not array)
   * Database stores single refresh_token_hash, not array
   */
  async setRefreshToken(userId: string, hashedToken: string): Promise<User> {
    return await this.update(userId, { refresh_token_hash: hashedToken });
  },

  /**
   * Clear refresh token (for logout)
   */
  async clearRefreshToken(userId: string): Promise<User> {
    return await this.update(userId, { refresh_token_hash: undefined });
  },

  /**
   * Verify if a refresh token matches stored hash
   */
  async hasRefreshToken(userId: string, hashedToken: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    return user.refresh_token_hash === hashedToken;
  },
};

/**
 * User Model Relations:
 *
 * - hasOne: Profile (via user_id foreign key in profiles table)
 * - hasMany: Matches (via user_id_1 or user_id_2 in matches table)
 * - hasMany: Messages (via sender_id in messages table)
 * - hasMany: Swipes (via user_id in swipes table)
 * - hasMany: Verifications (via user_id in verifications table)
 * - hasMany: Payments (via user_id in payments table)
 */
