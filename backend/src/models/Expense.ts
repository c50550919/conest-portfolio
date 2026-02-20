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
 * Expense Model
 *
 * Manages household expenses and payment tracking.
 * Works alongside Payment model for Stripe integration.
 *
 * Business Model:
 * - Rent splitting and shared expenses
 * - Due date tracking and overdue detection
 * - Payment status workflow
 */

export interface Expense {
  id: string;
  household_id: string;
  payer_id: string;
  amount: number; // Amount in cents
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

export interface CreateExpenseData {
  household_id: string;
  payer_id: string;
  amount: number;
  type: 'rent' | 'utilities' | 'deposit' | 'other';
  description?: string;
  due_date?: Date;
}

export const ExpenseModel = {
  async create(data: CreateExpenseData): Promise<Expense> {
    const [expense] = await db('payments')
      .insert({ ...data, status: 'pending' })
      .returning('*');
    return expense;
  },

  async findById(id: string): Promise<Expense | undefined> {
    return await db('payments').where({ id }).first();
  },

  async findByHousehold(householdId: string): Promise<Expense[]> {
    return await db('payments')
      .where({ household_id: householdId })
      .orderBy('created_at', 'desc');
  },

  async findByUser(userId: string): Promise<Expense[]> {
    return await db('payments')
      .where({ payer_id: userId })
      .orderBy('created_at', 'desc');
  },

  async findByStatus(householdId: string, status: Expense['status']): Promise<Expense[]> {
    return await db('payments')
      .where({ household_id: householdId, status })
      .orderBy('created_at', 'desc');
  },

  async findByType(householdId: string, type: Expense['type']): Promise<Expense[]> {
    return await db('payments')
      .where({ household_id: householdId, type })
      .orderBy('created_at', 'desc');
  },

  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const updateData: any = { ...data, updated_at: db.fn.now() };

    if (data.status === 'completed') {
      updateData.paid_at = db.fn.now();
    }

    const [expense] = await db('payments')
      .where({ id })
      .update(updateData)
      .returning('*');
    return expense;
  },

  async delete(id: string): Promise<void> {
    await db('payments').where({ id }).delete();
  },

  /**
   * Get all overdue expenses for household
   */
  async getOverdue(householdId: string): Promise<Expense[]> {
    return await db('payments')
      .where({ household_id: householdId, status: 'pending' })
      .where('due_date', '<', db.fn.now())
      .orderBy('due_date', 'asc');
  },

  /**
   * Get pending expenses for household
   */
  async getPending(householdId: string): Promise<Expense[]> {
    return await db('payments')
      .where({ household_id: householdId, status: 'pending' })
      .orderBy('due_date', 'asc');
  },

  /**
   * Calculate total amount for expenses
   */
  async getTotalAmount(householdId: string): Promise<number> {
    const result = await db('payments')
      .where({ household_id: householdId })
      .sum('amount as total')
      .first();
    return parseInt(result?.total as string || '0', 10);
  },

  /**
   * Calculate pending amount
   */
  async getPendingAmount(householdId: string): Promise<number> {
    const result = await db('payments')
      .where({ household_id: householdId, status: 'pending' })
      .sum('amount as total')
      .first();
    return parseInt(result?.total as string || '0', 10);
  },

  /**
   * Calculate overdue amount
   */
  async getOverdueAmount(householdId: string): Promise<number> {
    const result = await db('payments')
      .where({ household_id: householdId, status: 'pending' })
      .where('due_date', '<', db.fn.now())
      .sum('amount as total')
      .first();
    return parseInt(result?.total as string || '0', 10);
  },

  /**
   * Mark expense as paid
   */
  async markAsPaid(id: string, stripeChargeId?: string): Promise<Expense> {
    return await this.update(id, {
      status: 'completed',
      stripe_charge_id: stripeChargeId,
      paid_at: db.fn.now() as any,
    });
  },

  /**
   * Mark expense as failed
   */
  async markAsFailed(id: string): Promise<Expense> {
    return await this.update(id, { status: 'failed' });
  },

  /**
   * Mark expense as processing
   */
  async markAsProcessing(id: string, stripePaymentIntentId: string): Promise<Expense> {
    return await this.update(id, {
      status: 'processing',
      stripe_payment_intent_id: stripePaymentIntentId,
    });
  },

  /**
   * Refund expense
   */
  async refund(id: string): Promise<Expense> {
    return await this.update(id, { status: 'refunded' });
  },

  /**
   * Get expenses summary for household
   */
  async getSummary(householdId: string): Promise<{
    total: number;
    pending: number;
    overdue: number;
  }> {
    const total = await this.getTotalAmount(householdId);
    const pending = await this.getPendingAmount(householdId);
    const overdue = await this.getOverdueAmount(householdId);

    return { total, pending, overdue };
  },
};

/**
 * Expense Model Relations:
 *
 * - belongsTo: Household (via household_id foreign key)
 * - belongsTo: User (via payer_id foreign key)
 */
