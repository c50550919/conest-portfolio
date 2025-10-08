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
  phone_number?: string;
  phone_verified: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  status: 'active' | 'suspended' | 'deactivated';
  last_login_at?: Date;
  refresh_tokens: string[]; // Array of hashed JWT refresh tokens for multi-device support
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  phone_number?: string;
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
    return await db('users').where({ phone_number: phone }).first();
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
      .update({ last_login_at: db.fn.now() });
  },

  async delete(id: string): Promise<void> {
    await db('users').where({ id }).delete();
  },

  /**
   * Add a refresh token to user's token array
   * Supports multi-device login sessions
   */
  async addRefreshToken(userId: string, hashedToken: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const refreshTokens = user.refresh_tokens || [];
    refreshTokens.push(hashedToken);

    return await this.update(userId, { refresh_tokens: refreshTokens });
  },

  /**
   * Remove a specific refresh token (for logout)
   */
  async removeRefreshToken(userId: string, hashedToken: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const refreshTokens = (user.refresh_tokens || []).filter(
      (token) => token !== hashedToken
    );

    return await this.update(userId, { refresh_tokens: refreshTokens });
  },

  /**
   * Clear all refresh tokens (for logout from all devices)
   */
  async clearRefreshTokens(userId: string): Promise<User> {
    return await this.update(userId, { refresh_tokens: [] });
  },

  /**
   * Verify if a refresh token exists for a user
   */
  async hasRefreshToken(userId: string, hashedToken: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    return (user.refresh_tokens || []).includes(hashedToken);
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
