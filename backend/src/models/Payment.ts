import db from '../config/database';

export interface Payment {
  id: string;
  household_id: string;
  payer_id: string;
  amount: number;
  type: 'rent' | 'utilities' | 'deposit' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  description?: string;
  due_date?: Date;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Household {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  monthly_rent: number;
  lease_start_date?: Date;
  lease_end_date?: Date;
  stripe_account_id?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  rent_share: number; // Amount in cents
  joined_at: Date;
  left_at?: Date;
  status: 'active' | 'inactive';
}

export interface CreatePaymentData {
  household_id: string;
  payer_id: string;
  amount: number;
  type: 'rent' | 'utilities' | 'deposit' | 'other';
  description?: string;
  due_date?: Date;
}

export const PaymentModel = {
  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const [payment] = await db('payments')
      .insert({ ...data, status: 'pending' })
      .returning('*');
    return payment;
  },

  async findById(id: string): Promise<Payment | undefined> {
    return await db('payments').where({ id }).first();
  },

  async findByHousehold(householdId: string): Promise<Payment[]> {
    return await db('payments')
      .where({ household_id: householdId })
      .orderBy('created_at', 'desc');
  },

  async findByUser(userId: string): Promise<Payment[]> {
    return await db('payments')
      .where({ payer_id: userId })
      .orderBy('created_at', 'desc');
  },

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment> {
    const updateData: any = { ...data, updated_at: db.fn.now() };

    if (data.status === 'completed') {
      updateData.paid_at = db.fn.now();
    }

    const [payment] = await db('payments')
      .where({ id })
      .update(updateData)
      .returning('*');
    return payment;
  },

  async getOverduePayments(householdId?: string): Promise<Payment[]> {
    let query = db('payments')
      .where({ status: 'pending' })
      .where('due_date', '<', db.fn.now());

    if (householdId) {
      query = query.where({ household_id: householdId });
    }

    return await query.orderBy('due_date', 'asc');
  },
};

export const HouseholdModel = {
  async create(data: Omit<Household, 'id' | 'created_at' | 'updated_at'>): Promise<Household> {
    const [household] = await db('households')
      .insert({ ...data, status: 'active' })
      .returning('*');
    return household;
  },

  async findById(id: string): Promise<Household | undefined> {
    return await db('households').where({ id }).first();
  },

  async update(id: string, data: Partial<Household>): Promise<Household> {
    const [household] = await db('households')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return household;
  },

  async addMember(householdId: string, userId: string, rentShare: number, role: 'admin' | 'member' = 'member'): Promise<HouseholdMember> {
    const [member] = await db('household_members')
      .insert({
        household_id: householdId,
        user_id: userId,
        role,
        rent_share: rentShare,
        status: 'active',
      })
      .returning('*');
    return member;
  },

  async getMembers(householdId: string): Promise<HouseholdMember[]> {
    return await db('household_members')
      .where({ household_id: householdId, status: 'active' });
  },

  async removeMember(householdId: string, userId: string): Promise<void> {
    await db('household_members')
      .where({ household_id: householdId, user_id: userId })
      .update({ status: 'inactive', left_at: db.fn.now() });
  },
};
