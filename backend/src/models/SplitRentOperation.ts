/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * SplitRentOperation Model
 *
 * TASK-W2-02: Payment Rollback/Compensation Service
 *
 * Purpose: Track multi-payment split rent operations with saga state
 * Constitution Principle III: Security - Atomic transaction tracking
 *
 * Features:
 * - Saga pattern state management
 * - Track individual payments within split operation
 * - Support rollback and compensation
 * - Idempotency key support
 */

import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type SagaStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'compensating'
  | 'compensated'
  | 'compensation_failed';

export interface SplitRentOperation {
  id: string;
  operation_id: string;
  household_id: string;
  saga_status: SagaStatus;
  current_step: string | null;
  total_steps: number;
  completed_steps: number;
  total_amount: number;
  member_count: number;
  payment_ids: string[];
  stripe_intent_ids: string[];
  rent_year: number;
  rent_month: number;
  idempotency_key: string | null;
  error_message: string | null;
  failed_step: string | null;
  started_at: Date;
  completed_at: Date | null;
  compensated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSplitRentOperationData {
  household_id: string;
  total_amount: number;
  member_count: number;
  rent_year: number;
  rent_month: number;
  idempotency_key?: string;
}

export const SplitRentOperationModel = {
  /**
   * Create a new split rent operation
   */
  async create(data: CreateSplitRentOperationData): Promise<SplitRentOperation> {
    const operationId = `split_rent_${data.household_id}_${data.rent_year}_${String(data.rent_month).padStart(2, '0')}_${uuidv4().slice(0, 8)}`;

    try {
      const [operation] = await db('split_rent_operations')
        .insert({
          id: uuidv4(),
          operation_id: operationId,
          household_id: data.household_id,
          saga_status: 'pending',
          total_amount: data.total_amount,
          member_count: data.member_count,
          total_steps: data.member_count * 2, // Each member: create payment + create intent
          completed_steps: 0,
          payment_ids: JSON.stringify([]),
          stripe_intent_ids: JSON.stringify([]),
          rent_year: data.rent_year,
          rent_month: data.rent_month,
          idempotency_key: data.idempotency_key || null,
        })
        .returning('*');

      // Parse JSON fields
      operation.payment_ids = JSON.parse(operation.payment_ids);
      operation.stripe_intent_ids = JSON.parse(operation.stripe_intent_ids);

      return operation;
    } catch (error: any) {
      // If table doesn't exist, return mock for backwards compatibility
      if (error.code === '42P01') {
        return {
          id: uuidv4(),
          operation_id: operationId,
          household_id: data.household_id,
          saga_status: 'pending',
          current_step: null,
          total_steps: data.member_count * 2,
          completed_steps: 0,
          total_amount: data.total_amount,
          member_count: data.member_count,
          payment_ids: [],
          stripe_intent_ids: [],
          rent_year: data.rent_year,
          rent_month: data.rent_month,
          idempotency_key: data.idempotency_key || null,
          error_message: null,
          failed_step: null,
          started_at: new Date(),
          completed_at: null,
          compensated_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      throw error;
    }
  },

  /**
   * Find by operation ID
   */
  async findByOperationId(operationId: string): Promise<SplitRentOperation | undefined> {
    try {
      const operation = await db('split_rent_operations')
        .where({ operation_id: operationId })
        .first();

      if (operation) {
        operation.payment_ids = JSON.parse(operation.payment_ids || '[]');
        operation.stripe_intent_ids = JSON.parse(operation.stripe_intent_ids || '[]');
      }

      return operation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Find by idempotency key
   */
  async findByIdempotencyKey(idempotencyKey: string): Promise<SplitRentOperation | undefined> {
    try {
      const operation = await db('split_rent_operations')
        .where({ idempotency_key: idempotencyKey })
        .first();

      if (operation) {
        operation.payment_ids = JSON.parse(operation.payment_ids || '[]');
        operation.stripe_intent_ids = JSON.parse(operation.stripe_intent_ids || '[]');
      }

      return operation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Find active operation for household month
   */
  async findActiveForHouseholdMonth(
    householdId: string,
    rentYear: number,
    rentMonth: number,
  ): Promise<SplitRentOperation | undefined> {
    try {
      const operation = await db('split_rent_operations')
        .where({
          household_id: householdId,
          rent_year: rentYear,
          rent_month: rentMonth,
        })
        .whereNotIn('saga_status', ['failed', 'compensated', 'compensation_failed'])
        .first();

      if (operation) {
        operation.payment_ids = JSON.parse(operation.payment_ids || '[]');
        operation.stripe_intent_ids = JSON.parse(operation.stripe_intent_ids || '[]');
      }

      return operation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Update saga status
   */
  async updateStatus(
    operationId: string,
    status: SagaStatus,
    updates: Partial<{
      current_step: string | null;
      completed_steps: number;
      error_message: string | null;
      failed_step: string | null;
    }> = {},
  ): Promise<SplitRentOperation | undefined> {
    try {
      const updateData: any = {
        saga_status: status,
        ...updates,
      };

      if (status === 'completed') {
        updateData.completed_at = db.fn.now();
      }

      if (status === 'compensated') {
        updateData.compensated_at = db.fn.now();
      }

      const [operation] = await db('split_rent_operations')
        .where({ operation_id: operationId })
        .update(updateData)
        .returning('*');

      if (operation) {
        operation.payment_ids = JSON.parse(operation.payment_ids || '[]');
        operation.stripe_intent_ids = JSON.parse(operation.stripe_intent_ids || '[]');
      }

      return operation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Mark operation as in progress
   */
  async markInProgress(operationId: string, currentStep: string): Promise<SplitRentOperation | undefined> {
    return this.updateStatus(operationId, 'in_progress', { current_step: currentStep });
  },

  /**
   * Mark operation as completed
   */
  async markCompleted(operationId: string): Promise<SplitRentOperation | undefined> {
    return this.updateStatus(operationId, 'completed', {
      current_step: null,
    });
  },

  /**
   * Mark operation as failed
   */
  async markFailed(
    operationId: string,
    errorMessage: string,
    failedStep: string,
  ): Promise<SplitRentOperation | undefined> {
    return this.updateStatus(operationId, 'failed', {
      error_message: errorMessage,
      failed_step: failedStep,
    });
  },

  /**
   * Mark operation as compensating
   */
  async markCompensating(operationId: string): Promise<SplitRentOperation | undefined> {
    return this.updateStatus(operationId, 'compensating', {
      current_step: 'compensation',
    });
  },

  /**
   * Mark operation as compensated
   */
  async markCompensated(operationId: string): Promise<SplitRentOperation | undefined> {
    return this.updateStatus(operationId, 'compensated', {
      current_step: null,
    });
  },

  /**
   * Mark compensation as failed
   */
  async markCompensationFailed(
    operationId: string,
    errorMessage: string,
  ): Promise<SplitRentOperation | undefined> {
    return this.updateStatus(operationId, 'compensation_failed', {
      error_message: errorMessage,
    });
  },

  /**
   * Add payment ID to operation
   */
  async addPaymentId(operationId: string, paymentId: string): Promise<void> {
    try {
      await db.raw(`
        UPDATE split_rent_operations
        SET payment_ids = payment_ids || ?::jsonb,
            completed_steps = completed_steps + 1
        WHERE operation_id = ?
      `, [JSON.stringify([paymentId]), operationId]);
    } catch (error: any) {
      if (error.code === '42P01') return;
      throw error;
    }
  },

  /**
   * Add Stripe intent ID to operation
   */
  async addStripeIntentId(operationId: string, stripeIntentId: string): Promise<void> {
    try {
      await db.raw(`
        UPDATE split_rent_operations
        SET stripe_intent_ids = stripe_intent_ids || ?::jsonb,
            completed_steps = completed_steps + 1
        WHERE operation_id = ?
      `, [JSON.stringify([stripeIntentId]), operationId]);
    } catch (error: any) {
      if (error.code === '42P01') return;
      throw error;
    }
  },

  /**
   * Get failed operations needing compensation
   */
  async getFailedOperationsNeedingCompensation(limit: number = 50): Promise<SplitRentOperation[]> {
    try {
      const operations = await db('split_rent_operations')
        .where('saga_status', 'failed')
        .where('started_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
        .orderBy('started_at', 'asc')
        .limit(limit);

      return operations.map((op: any) => ({
        ...op,
        payment_ids: JSON.parse(op.payment_ids || '[]'),
        stripe_intent_ids: JSON.parse(op.stripe_intent_ids || '[]'),
      }));
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },

  /**
   * Get recent operations for a household
   */
  async getRecentForHousehold(householdId: string, limit: number = 10): Promise<SplitRentOperation[]> {
    try {
      const operations = await db('split_rent_operations')
        .where({ household_id: householdId })
        .orderBy('created_at', 'desc')
        .limit(limit);

      return operations.map((op: any) => ({
        ...op,
        payment_ids: JSON.parse(op.payment_ids || '[]'),
        stripe_intent_ids: JSON.parse(op.stripe_intent_ids || '[]'),
      }));
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },
};

export default SplitRentOperationModel;
