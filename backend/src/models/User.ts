import db from '../config/database';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  phone?: string;
  phone_verified: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  status: 'active' | 'suspended' | 'deactivated';
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password_hash: string;
  phone?: string;
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
      .update({ last_login_at: db.fn.now() });
  },

  async delete(id: string): Promise<void> {
    await db('users').where({ id }).delete();
  },
};
