/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Payment Compensation Service
 *
 * TASK-W2-02: Payment Rollback/Compensation Service
 *
 * Purpose: Handle payment rollback and compensation operations using the Saga pattern
 *
 * Constitution Principle III: Security - Full audit trail of all operations
 * Constitution Principle IV: Performance - Efficient transaction handling
 *
 * Features:
 * - Saga pattern implementation for multi-payment operations
 * - Transaction wrapping with automatic rollback
 * - Stripe refund/cancel/void integration
 * - Compensation for partial failures
 * - Audit logging for all operations
 */

import stripe from '../../config/stripe';
import { db } from '../../config/database';
import { PaymentModel, HouseholdModel, Payment } from '../../models/Payment';
import { PaymentAuditLogModel } from '../../models/PaymentAuditLog';
import { SplitRentOperationModel } from '../../models/SplitRentOperation';
import { PaymentCompensationModel, CompensationType } from '../../models/PaymentCompensation';
import logger from '../../config/logger';

// Types for split rent saga
export interface SplitRentPaymentResult {
  payment: Payment;
  stripePaymentIntentId?: string;
  clientSecret?: string;
}

export interface SplitRentSagaResult {
  operationId: string;
  success: boolean;
  payments: SplitRentPaymentResult[];
  error?: string;
  compensated?: boolean;
}

export interface RollbackResult {
  success: boolean;
  paymentId: string;
  stripePaymentIntentId?: string;
  action: 'cancelled' | 'voided' | 'refunded' | 'skipped';
  error?: string;
}

export interface CompensationResult {
  operationId: string;
  success: boolean;
  totalPayments: number;
  compensatedPayments: number;
  failedCompensations: number;
  errors: string[];
}

export const PaymentCompensationService = {
  /**
   * Execute split rent payment with Saga pattern
   *
   * Saga Steps:
   * 1. Create all payment records (pending)
   * 2. Create Stripe payment intents for each
   * 3. On failure at any step: compensate all prior successful operations
   *
   * @param householdId - Household ID
   * @returns SplitRentSagaResult with operation details
   */
  async executeSplitRentSaga(householdId: string): Promise<SplitRentSagaResult> {
    const now = new Date();
    const rentYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const rentMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2; // Next month (1-indexed)

    // Generate idempotency key
    const idempotencyKey = `split_rent_${householdId}_${rentYear}_${String(rentMonth).padStart(2, '0')}`;

    // Check for existing operation
    const existingOperation = await SplitRentOperationModel.findByIdempotencyKey(idempotencyKey);
    if (existingOperation) {
      if (existingOperation.saga_status === 'completed') {
        logger.info(`Split rent already completed for household ${householdId}`, {
          operationId: existingOperation.operation_id,
        });

        // Return existing payments
        const payments = await Promise.all(
          existingOperation.payment_ids.map(async (id) => ({
            payment: (await PaymentModel.findById(id)) as Payment,
          })),
        );

        return {
          operationId: existingOperation.operation_id,
          success: true,
          payments: payments.filter((p) => p.payment),
        };
      }

      if (existingOperation.saga_status === 'in_progress') {
        throw new Error('SPLIT_RENT_ALREADY_IN_PROGRESS');
      }
    }

    // Get household and members
    const household = await HouseholdModel.findById(householdId);
    if (!household) {
      throw new Error('HOUSEHOLD_NOT_FOUND');
    }

    const members = await HouseholdModel.getMembers(householdId);
    if (members.length === 0) {
      throw new Error('NO_HOUSEHOLD_MEMBERS');
    }

    // Calculate total rent from member shares
    const totalAmount = members.reduce((sum, member) => sum + member.rent_share, 0);

    // Create saga operation
    const operation = await SplitRentOperationModel.create({
      household_id: householdId,
      total_amount: totalAmount,
      member_count: members.length,
      rent_year: rentYear,
      rent_month: rentMonth,
      idempotency_key: idempotencyKey,
    });

    const operationId = operation.operation_id;
    const results: SplitRentPaymentResult[] = [];
    const createdPaymentIds: string[] = [];
    const createdStripeIntentIds: string[] = [];

    try {
      // Mark operation as in progress
      await SplitRentOperationModel.markInProgress(operationId, 'creating_payments');

      // Log saga start
      await PaymentAuditLogModel.create({
        event_type: 'created',
        operation_id: operationId,
        actor_type: 'system',
        metadata: {
          saga_type: 'split_rent',
          household_id: householdId,
          member_count: members.length,
          total_amount: totalAmount,
          rent_period: `${rentYear}-${String(rentMonth).padStart(2, '0')}`,
        },
      });

      // Use database transaction for payment creation
      await db.transaction(async (trx) => {
        // Step 1: Create all payment records
        for (const member of members) {
          const dueDate = new Date(rentYear, rentMonth - 1, 1); // 1st of the month

          const [payment] = await trx('payments')
            .insert({
              household_id: householdId,
              payer_id: member.user_id,
              amount: member.rent_share,
              type: 'rent',
              description: `Rent for ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
              due_date: dueDate,
              status: 'pending',
              operation_id: operationId,
            })
            .returning('*');

          createdPaymentIds.push(payment.id);
          await SplitRentOperationModel.addPaymentId(operationId, payment.id);

          // Log payment creation
          await PaymentAuditLogModel.logPaymentCreated(
            payment.id,
            null,
            'system',
            operationId,
            { member_user_id: member.user_id, rent_share: member.rent_share },
          );

          results.push({ payment });
        }
      });

      // Step 2: Create Stripe payment intents (outside transaction)
      await SplitRentOperationModel.updateStatus(operationId, 'in_progress', {
        current_step: 'creating_intents',
      });

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const member = members[i];

        try {
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: member.rent_share,
              currency: 'usd',
              metadata: {
                payment_id: result.payment.id,
                household_id: householdId,
                payer_id: member.user_id,
                type: 'rent',
                operation_id: operationId,
              },
              // If household has connected account, use it
              ...(household.stripe_account_id && {
                transfer_data: {
                  destination: household.stripe_account_id,
                },
              }),
            },
            {
              idempotencyKey: `${operationId}_intent_${result.payment.id}`,
            },
          );

          createdStripeIntentIds.push(paymentIntent.id);
          await SplitRentOperationModel.addStripeIntentId(operationId, paymentIntent.id);

          // Update payment with intent ID
          await PaymentModel.updatePayment(result.payment.id, {
            stripe_payment_intent_id: paymentIntent.id,
            status: 'processing',
          });

          result.stripePaymentIntentId = paymentIntent.id;
          result.clientSecret = paymentIntent.client_secret!;

          // Log intent creation
          await PaymentAuditLogModel.logIntentCreated(
            result.payment.id,
            paymentIntent.id,
            operationId,
            { amount: member.rent_share },
          );
        } catch (stripeError: any) {
          logger.error('Failed to create Stripe payment intent', {
            operationId,
            paymentId: result.payment.id,
            error: stripeError.message,
          });

          // Mark operation as failed
          await SplitRentOperationModel.markFailed(
            operationId,
            stripeError.message,
            `creating_intent_${result.payment.id}`,
          );

          // Compensate: cancel all created intents and mark payments as failed
          const compensationResult = await this.compensateFailedSplit(operationId);

          return {
            operationId,
            success: false,
            payments: results,
            error: `Failed to create payment intent: ${stripeError.message}`,
            compensated: compensationResult.success,
          };
        }
      }

      // Mark saga as completed
      await SplitRentOperationModel.markCompleted(operationId);

      logger.info('Split rent saga completed successfully', {
        operationId,
        householdId,
        paymentCount: results.length,
      });

      return {
        operationId,
        success: true,
        payments: results,
      };
    } catch (error: any) {
      logger.error('Split rent saga failed', {
        operationId,
        householdId,
        error: error.message,
      });

      // Mark operation as failed
      await SplitRentOperationModel.markFailed(operationId, error.message, 'unknown');

      // Attempt compensation
      try {
        const compensationResult = await this.compensateFailedSplit(operationId);
        return {
          operationId,
          success: false,
          payments: results,
          error: error.message,
          compensated: compensationResult.success,
        };
      } catch (compensationError: any) {
        return {
          operationId,
          success: false,
          payments: results,
          error: `${error.message}; Compensation failed: ${compensationError.message}`,
          compensated: false,
        };
      }
    }
  },

  /**
   * Rollback a single payment
   *
   * Actions based on payment state:
   * - pending/processing with no charge: cancel intent
   * - completed with charge: refund
   * - already cancelled/refunded: skip
   *
   * @param paymentId - Payment ID to rollback
   * @param reason - Reason for rollback
   * @returns RollbackResult
   */
  async rollbackPayment(paymentId: string, reason?: string): Promise<RollbackResult> {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    // Log rollback start
    await PaymentAuditLogModel.logRollback(
      'rollback_started',
      payment.operation_id || paymentId,
      paymentId,
      payment.stripe_payment_intent_id || undefined,
      undefined,
      { reason },
    );

    // Check if already rolled back
    if (['cancelled', 'refunded'].includes(payment.status)) {
      await PaymentAuditLogModel.logRollback(
        'rollback_completed',
        payment.operation_id || paymentId,
        paymentId,
        payment.stripe_payment_intent_id || undefined,
        undefined,
        { action: 'skipped', reason: 'already_rolled_back' },
      );

      return {
        success: true,
        paymentId,
        stripePaymentIntentId: payment.stripe_payment_intent_id || undefined,
        action: 'skipped',
      };
    }

    try {
      let action: 'cancelled' | 'voided' | 'refunded' | 'skipped' = 'skipped';

      if (payment.stripe_payment_intent_id) {
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);

        if (paymentIntent.status === 'requires_payment_method' ||
            paymentIntent.status === 'requires_confirmation' ||
            paymentIntent.status === 'requires_action') {
          // Cancel the intent (not yet charged)
          await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
          action = 'cancelled';
        } else if (paymentIntent.status === 'succeeded' && paymentIntent.latest_charge) {
          // Refund the charge
          await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
            reason: 'requested_by_customer',
          });
          action = 'refunded';
        } else if (paymentIntent.status === 'canceled') {
          action = 'skipped';
        }
      }

      // Update payment status
      const newStatus = action === 'refunded' ? 'refunded' : 'cancelled';
      await PaymentModel.updatePayment(paymentId, { status: newStatus });

      // Log status change
      await PaymentAuditLogModel.logStatusChange(
        paymentId,
        payment.status,
        newStatus,
        'compensation',
        undefined,
        payment.operation_id || undefined,
        { action, reason },
      );

      // Log rollback completion
      await PaymentAuditLogModel.logRollback(
        'rollback_completed',
        payment.operation_id || paymentId,
        paymentId,
        payment.stripe_payment_intent_id || undefined,
        undefined,
        { action },
      );

      logger.info('Payment rolled back successfully', {
        paymentId,
        action,
        stripePaymentIntentId: payment.stripe_payment_intent_id,
      });

      return {
        success: true,
        paymentId,
        stripePaymentIntentId: payment.stripe_payment_intent_id || undefined,
        action,
      };
    } catch (error: any) {
      // Log rollback failure
      await PaymentAuditLogModel.logRollback(
        'rollback_failed',
        payment.operation_id || paymentId,
        paymentId,
        payment.stripe_payment_intent_id || undefined,
        error.message,
      );

      logger.error('Failed to rollback payment', {
        paymentId,
        error: error.message,
      });

      return {
        success: false,
        paymentId,
        stripePaymentIntentId: payment.stripe_payment_intent_id || undefined,
        action: 'skipped',
        error: error.message,
      };
    }
  },

  /**
   * Compensate a failed split rent operation
   *
   * Cancels/refunds all payments created as part of the operation
   *
   * @param operationId - Operation ID to compensate
   * @returns CompensationResult
   */
  async compensateFailedSplit(operationId: string): Promise<CompensationResult> {
    const operation = await SplitRentOperationModel.findByOperationId(operationId);
    if (!operation) {
      throw new Error('OPERATION_NOT_FOUND');
    }

    // Mark operation as compensating
    await SplitRentOperationModel.markCompensating(operationId);

    // Log compensation start
    await PaymentAuditLogModel.logCompensation(
      'compensation_started',
      operationId,
      undefined,
      undefined,
      undefined,
      {
        payment_count: operation.payment_ids.length,
        intent_count: operation.stripe_intent_ids.length,
      },
    );

    const errors: string[] = [];
    let compensatedPayments = 0;

    // Create compensation records for each payment
    for (const paymentId of operation.payment_ids) {
      const payment = await PaymentModel.findById(paymentId);
      if (!payment) continue;

      // Create compensation record
      const compensationType: CompensationType = payment.stripe_charge_id ? 'refund' : 'cancel';
      const compensation = await PaymentCompensationModel.create({
        operation_id: operationId,
        payment_id: paymentId,
        stripe_payment_intent_id: payment.stripe_payment_intent_id || undefined,
        compensation_type: compensationType,
        amount: payment.amount,
        reason: 'Split rent saga failed',
      });

      // Execute compensation
      await PaymentCompensationModel.markAsProcessing(compensation.id);

      try {
        const result = await this.rollbackPayment(paymentId, 'Split rent saga compensation');

        if (result.success) {
          await PaymentCompensationModel.markAsCompleted(compensation.id);
          compensatedPayments++;
        } else {
          await PaymentCompensationModel.markAsFailed(compensation.id, result.error || 'Unknown error');
          errors.push(`Payment ${paymentId}: ${result.error}`);
        }
      } catch (error: any) {
        await PaymentCompensationModel.markAsFailed(compensation.id, error.message);
        errors.push(`Payment ${paymentId}: ${error.message}`);
      }
    }

    // Cancel any Stripe intents that weren't linked to payments
    for (const intentId of operation.stripe_intent_ids) {
      try {
        const intent = await stripe.paymentIntents.retrieve(intentId);
        if (intent.status !== 'canceled' && intent.status !== 'succeeded') {
          await stripe.paymentIntents.cancel(intentId);
        }
      } catch (error: any) {
        // Intent may not exist or already be cancelled
        logger.warn(`Failed to cancel Stripe intent ${intentId}: ${error.message}`);
      }
    }

    // Update operation status
    if (errors.length === 0) {
      await SplitRentOperationModel.markCompensated(operationId);

      await PaymentAuditLogModel.logCompensation(
        'compensation_completed',
        operationId,
        undefined,
        undefined,
        undefined,
        {
          compensated_payments: compensatedPayments,
          total_payments: operation.payment_ids.length,
        },
      );
    } else {
      await SplitRentOperationModel.markCompensationFailed(operationId, errors.join('; '));

      await PaymentAuditLogModel.logCompensation(
        'compensation_failed',
        operationId,
        undefined,
        undefined,
        errors.join('; '),
        {
          compensated_payments: compensatedPayments,
          total_payments: operation.payment_ids.length,
          error_count: errors.length,
        },
      );
    }

    logger.info(`Compensation completed for operation ${operationId}`, {
      success: errors.length === 0,
      compensatedPayments,
      totalPayments: operation.payment_ids.length,
      errors: errors.length,
    });

    return {
      operationId,
      success: errors.length === 0,
      totalPayments: operation.payment_ids.length,
      compensatedPayments,
      failedCompensations: errors.length,
      errors,
    };
  },

  /**
   * Get operation status
   */
  async getOperationStatus(operationId: string): Promise<{
    operation: ReturnType<typeof SplitRentOperationModel.findByOperationId> extends Promise<infer T> ? T : never;
    compensations: ReturnType<typeof PaymentCompensationModel.getOperationStats> extends Promise<infer T> ? T : never;
    auditLog: ReturnType<typeof PaymentAuditLogModel.findByOperationId> extends Promise<infer T> ? T : never;
  } | null> {
    const operation = await SplitRentOperationModel.findByOperationId(operationId);
    if (!operation) {
      return null;
    }

    const compensations = await PaymentCompensationModel.getOperationStats(operationId);
    const auditLog = await PaymentAuditLogModel.findByOperationId(operationId);

    return {
      operation,
      compensations,
      auditLog,
    };
  },

  /**
   * Process failed operations needing compensation (scheduled job)
   */
  async processFailedOperations(): Promise<{
    processed: number;
    compensated: number;
    failed: number;
  }> {
    const failedOperations = await SplitRentOperationModel.getFailedOperationsNeedingCompensation();

    let processed = 0;
    let compensated = 0;
    let failed = 0;

    for (const operation of failedOperations) {
      processed++;

      try {
        const result = await this.compensateFailedSplit(operation.operation_id);
        if (result.success) {
          compensated++;
        } else {
          failed++;
        }
      } catch (error: any) {
        logger.error(`Failed to compensate operation ${operation.operation_id}`, {
          error: error.message,
        });
        failed++;
      }
    }

    logger.info('Processed failed operations', {
      processed,
      compensated,
      failed,
    });

    return { processed, compensated, failed };
  },
};

export default PaymentCompensationService;
