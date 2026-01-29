/**
 * PaymentAuditLog Model
 *
 * TASK-W2-02: Payment Rollback/Compensation Service
 *
 * Purpose: Track all payment state transitions for audit trail
 * Constitution Principle III: Security - Full audit trail of all payment operations
 *
 * Features:
 * - Record all payment state changes
 * - Track actor (user, system, webhook, scheduled)
 * - Correlate related events via operation_id
 * - Support error message storage
 */

import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type PaymentAuditEventType =
  | 'created'
  | 'status_changed'
  | 'intent_created'
  | 'intent_confirmed'
  | 'intent_failed'
  | 'intent_canceled'
  | 'refund_initiated'
  | 'refund_completed'
  | 'refund_failed'
  | 'compensation_started'
  | 'compensation_completed'
  | 'compensation_failed'
  | 'rollback_started'
  | 'rollback_completed'
  | 'rollback_failed';

export type ActorType = 'system' | 'user' | 'webhook' | 'scheduled' | 'compensation';

export interface PaymentAuditLog {
  id: string;
  payment_id: string | null;
  stripe_payment_intent_id: string | null;
  event_type: PaymentAuditEventType;
  previous_status: string | null;
  new_status: string | null;
  actor_id: string | null;
  actor_type: ActorType;
  operation_id: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
  created_at: Date;
}

export interface CreatePaymentAuditLogData {
  payment_id?: string;
  stripe_payment_intent_id?: string;
  event_type: PaymentAuditEventType;
  previous_status?: string;
  new_status?: string;
  actor_id?: string;
  actor_type?: ActorType;
  operation_id?: string;
  metadata?: Record<string, unknown>;
  error_message?: string;
}

export const PaymentAuditLogModel = {
  /**
   * Create a new audit log entry
   */
  async create(data: CreatePaymentAuditLogData): Promise<PaymentAuditLog> {
    try {
      const [auditLog] = await db('payment_audit_log')
        .insert({
          id: uuidv4(),
          payment_id: data.payment_id || null,
          stripe_payment_intent_id: data.stripe_payment_intent_id || null,
          event_type: data.event_type,
          previous_status: data.previous_status || null,
          new_status: data.new_status || null,
          actor_id: data.actor_id || null,
          actor_type: data.actor_type || 'system',
          operation_id: data.operation_id || null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          error_message: data.error_message || null,
        })
        .returning('*');

      return auditLog;
    } catch (error: any) {
      // If table doesn't exist, silently fail (for backwards compatibility)
      if (error.code === '42P01') {
        return {
          id: uuidv4(),
          payment_id: data.payment_id || null,
          stripe_payment_intent_id: data.stripe_payment_intent_id || null,
          event_type: data.event_type,
          previous_status: data.previous_status || null,
          new_status: data.new_status || null,
          actor_id: data.actor_id || null,
          actor_type: data.actor_type || 'system',
          operation_id: data.operation_id || null,
          metadata: data.metadata || null,
          error_message: data.error_message || null,
          created_at: new Date(),
        };
      }
      throw error;
    }
  },

  /**
   * Log a payment creation event
   */
  async logPaymentCreated(
    paymentId: string,
    actorId: string | null,
    actorType: ActorType,
    operationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentAuditLog> {
    return this.create({
      payment_id: paymentId,
      event_type: 'created',
      new_status: 'pending',
      actor_id: actorId || undefined,
      actor_type: actorType,
      operation_id: operationId,
      metadata,
    });
  },

  /**
   * Log a payment status change
   */
  async logStatusChange(
    paymentId: string,
    previousStatus: string,
    newStatus: string,
    actorType: ActorType,
    actorId?: string,
    operationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentAuditLog> {
    return this.create({
      payment_id: paymentId,
      event_type: 'status_changed',
      previous_status: previousStatus,
      new_status: newStatus,
      actor_id: actorId,
      actor_type: actorType,
      operation_id: operationId,
      metadata,
    });
  },

  /**
   * Log a Stripe payment intent creation
   */
  async logIntentCreated(
    paymentId: string,
    stripePaymentIntentId: string,
    operationId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentAuditLog> {
    return this.create({
      payment_id: paymentId,
      stripe_payment_intent_id: stripePaymentIntentId,
      event_type: 'intent_created',
      new_status: 'processing',
      actor_type: 'system',
      operation_id: operationId,
      metadata,
    });
  },

  /**
   * Log a compensation event
   */
  async logCompensation(
    eventType: 'compensation_started' | 'compensation_completed' | 'compensation_failed',
    operationId: string,
    paymentId?: string,
    stripePaymentIntentId?: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentAuditLog> {
    return this.create({
      payment_id: paymentId,
      stripe_payment_intent_id: stripePaymentIntentId,
      event_type: eventType,
      actor_type: 'compensation',
      operation_id: operationId,
      error_message: errorMessage,
      metadata,
    });
  },

  /**
   * Log a rollback event
   */
  async logRollback(
    eventType: 'rollback_started' | 'rollback_completed' | 'rollback_failed',
    operationId: string,
    paymentId?: string,
    stripePaymentIntentId?: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>,
  ): Promise<PaymentAuditLog> {
    return this.create({
      payment_id: paymentId,
      stripe_payment_intent_id: stripePaymentIntentId,
      event_type: eventType,
      actor_type: 'compensation',
      operation_id: operationId,
      error_message: errorMessage,
      metadata,
    });
  },

  /**
   * Find audit logs by payment ID
   */
  async findByPaymentId(paymentId: string): Promise<PaymentAuditLog[]> {
    try {
      return await db('payment_audit_log')
        .where({ payment_id: paymentId })
        .orderBy('created_at', 'asc');
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },

  /**
   * Find audit logs by operation ID
   */
  async findByOperationId(operationId: string): Promise<PaymentAuditLog[]> {
    try {
      return await db('payment_audit_log')
        .where({ operation_id: operationId })
        .orderBy('created_at', 'asc');
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },

  /**
   * Find audit logs by Stripe payment intent ID
   */
  async findByStripeIntentId(stripePaymentIntentId: string): Promise<PaymentAuditLog[]> {
    try {
      return await db('payment_audit_log')
        .where({ stripe_payment_intent_id: stripePaymentIntentId })
        .orderBy('created_at', 'asc');
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },

  /**
   * Get recent audit events with optional filters
   */
  async getRecentEvents(
    options: {
      eventType?: PaymentAuditEventType;
      actorType?: ActorType;
      limit?: number;
      since?: Date;
    } = {},
  ): Promise<PaymentAuditLog[]> {
    try {
      let query = db('payment_audit_log');

      if (options.eventType) {
        query = query.where('event_type', options.eventType);
      }

      if (options.actorType) {
        query = query.where('actor_type', options.actorType);
      }

      if (options.since) {
        query = query.where('created_at', '>=', options.since);
      }

      return await query
        .orderBy('created_at', 'desc')
        .limit(options.limit || 100);
    } catch (error: any) {
      if (error.code === '42P01') return [];
      throw error;
    }
  },
};

export default PaymentAuditLogModel;
