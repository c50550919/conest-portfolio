/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * PaymentCompensation Model
 *
 * TASK-W2-02: Payment Rollback/Compensation Service
 *
 * Purpose: Track rollback and compensation operations
 * Constitution Principle III: Security - Audit trail for all compensation operations
 *
 * Features:
 * - Track refunds, voids, cancels, and reversals
 * - Retry support with exponential backoff
 * - Error handling and status tracking
 */

import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type CompensationType = 'refund' | 'void' | 'cancel' | 'reversal';
export type CompensationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface PaymentCompensation {
  id: string;
  operation_id: string;
  payment_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  compensation_type: CompensationType;
  status: CompensationStatus;
  amount: number;
  reason: string | null;
  error_message: string | null;
  retry_count: number;
  last_retry_at: Date | null;
  initiated_at: Date;
  completed_at: Date | null;
  created_at: Date;
}

export interface CreatePaymentCompensationData {
  operation_id: string;
  payment_id?: string;
  stripe_payment_intent_id?: string;
  compensation_type: CompensationType;
  amount: number;
  reason?: string;
}

export const PaymentCompensationModel = {
  /**
   * Create a new compensation record
   */
  async create(data: CreatePaymentCompensationData): Promise<PaymentCompensation> {
    try {
      const [compensation] = await db('payment_compensation_events')
        .insert({
          id: uuidv4(),
          operation_id: data.operation_id,
          payment_id: data.payment_id || null,
          stripe_payment_intent_id: data.stripe_payment_intent_id || null,
          compensation_type: data.compensation_type,
          status: 'pending',
          amount: data.amount,
          reason: data.reason || null,
        })
        .returning('*');

      return compensation;
    } catch (error: any) {
      // If table doesn't exist, return mock
      if (error.code === '42P01') {
        return {
          id: uuidv4(),
          operation_id: data.operation_id,
          payment_id: data.payment_id || null,
          stripe_payment_intent_id: data.stripe_payment_intent_id || null,
          stripe_refund_id: null,
          compensation_type: data.compensation_type,
          status: 'pending',
          amount: data.amount,
          reason: data.reason || null,
          error_message: null,
          retry_count: 0,
          last_retry_at: null,
          initiated_at: new Date(),
          completed_at: null,
          created_at: new Date(),
        };
      }
      throw error;
    }
  },

  /**
   * Find by ID
   */
  async findById(id: string): Promise<PaymentCompensation | undefined> {
    try {
      return await db('payment_compensation_events').where({ id }).first();
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Find by operation ID
   */
  async findByOperationId(operationId: string): Promise<PaymentCompensation[]> {
    try {
      return await db('payment_compensation_events')
        .where({ operation_id: operationId })
        .orderBy('created_at', 'asc');
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },

  /**
   * Mark as processing
   */
  async markAsProcessing(id: string): Promise<PaymentCompensation | undefined> {
    try {
      const [compensation] = await db('payment_compensation_events')
        .where({ id })
        .update({
          status: 'processing',
        })
        .returning('*');

      return compensation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Mark as completed
   */
  async markAsCompleted(
    id: string,
    stripeRefundId?: string,
  ): Promise<PaymentCompensation | undefined> {
    try {
      const updateData: any = {
        status: 'completed',
        completed_at: db.fn.now(),
      };

      if (stripeRefundId) {
        updateData.stripe_refund_id = stripeRefundId;
      }

      const [compensation] = await db('payment_compensation_events')
        .where({ id })
        .update(updateData)
        .returning('*');

      return compensation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Mark as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<PaymentCompensation | undefined> {
    try {
      const [compensation] = await db('payment_compensation_events')
        .where({ id })
        .update({
          status: 'failed',
          error_message: errorMessage,
          retry_count: db.raw('retry_count + 1'),
          last_retry_at: db.fn.now(),
        })
        .returning('*');

      return compensation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Mark as skipped (e.g., no charge to refund)
   */
  async markAsSkipped(id: string, reason: string): Promise<PaymentCompensation | undefined> {
    try {
      const [compensation] = await db('payment_compensation_events')
        .where({ id })
        .update({
          status: 'skipped',
          reason,
          completed_at: db.fn.now(),
        })
        .returning('*');

      return compensation;
    } catch (error: any) {
      if (error.code === '42P01') return undefined;
      throw error;
    }
  },

  /**
   * Get pending compensations for retry
   */
  async getPendingCompensations(limit: number = 50): Promise<PaymentCompensation[]> {
    try {
      return await db('payment_compensation_events')
        .where('status', 'pending')
        .orWhere((builder) => {
          void builder
            .where('status', 'failed')
            .where('retry_count', '<', 3)
            .where('last_retry_at', '<', db.raw("NOW() - INTERVAL '5 minutes'"));
        })
        .orderBy('created_at', 'asc')
        .limit(limit);
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },

  /**
   * Get statistics for an operation
   */
  async getOperationStats(operationId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
    totalAmount: number;
    refundedAmount: number;
  }> {
    try {
      const stats = await db('payment_compensation_events')
        .where({ operation_id: operationId })
        .select(
          db.raw('COUNT(*) as total'),
          db.raw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending"),
          db.raw("SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing"),
          db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed"),
          db.raw("SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed"),
          db.raw("SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped"),
          db.raw('SUM(amount) as total_amount'),
          db.raw("SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as refunded_amount"),
        )
        .first();

      return {
        total: parseInt(stats?.total || '0'),
        pending: parseInt(stats?.pending || '0'),
        processing: parseInt(stats?.processing || '0'),
        completed: parseInt(stats?.completed || '0'),
        failed: parseInt(stats?.failed || '0'),
        skipped: parseInt(stats?.skipped || '0'),
        totalAmount: parseInt(stats?.total_amount || '0'),
        refundedAmount: parseInt(stats?.refunded_amount || '0'),
      };
    } catch (error: any) {
      if (error.code === '42P01') {
        return {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          skipped: 0,
          totalAmount: 0,
          refundedAmount: 0,
        };
      }
      throw error;
    }
  },
};

export default PaymentCompensationModel;
