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
 * WebhookEvent Model
 *
 * Purpose: Track processed Stripe webhook events for deduplication
 * Constitution Principle III: Security - prevent duplicate event processing
 * Constitution Principle IV: Performance - fast deduplication check (<10ms)
 *
 * Features:
 * - Prevents duplicate webhook event processing
 * - Provides audit trail of all webhook events
 * - Supports event replay for debugging
 *
 * Performance Requirements:
 * - Event lookup by Stripe ID: <10ms
 * - Event creation: <50ms
 * - Cleanup of old events: scheduled job
 */

export interface WebhookEvent {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  payload: Record<string, unknown> | null;
  error_message: string | null;
  received_at: Date;
  processed_at: Date | null;
  created_at: Date;
  // TASK-W2-01: Retry queue fields
  retry_count: number;
  last_retry_at: Date | null;
  next_retry_at: Date | null;
  dead_letter: boolean;
  dead_letter_at: Date | null;
  dead_letter_reason: string | null;
}

export interface CreateWebhookEventData {
  stripe_event_id: string;
  event_type: string;
  payload?: Record<string, unknown>;
}

export const WebhookEventModel = {
  /**
   * Check if an event has already been processed
   * Returns true if event exists with status 'completed' or 'processing'
   *
   * @param stripeEventId - Stripe event ID to check
   */
  async isEventProcessed(stripeEventId: string): Promise<boolean> {
    const event = await db('stripe_webhook_events')
      .where({ stripe_event_id: stripeEventId })
      .whereIn('processing_status', ['completed', 'processing'])
      .first();

    return !!event;
  },

  /**
   * Create or get existing event record
   * Uses upsert pattern for idempotency
   *
   * @returns Object with event and isNew flag
   */
  async createOrGet(
    data: CreateWebhookEventData,
  ): Promise<{ event: WebhookEvent; isNew: boolean }> {
    // Check for existing event
    const existingEvent = await db('stripe_webhook_events')
      .where({ stripe_event_id: data.stripe_event_id })
      .first();

    if (existingEvent) {
      return { event: existingEvent, isNew: false };
    }

    // Create new event record
    const [event] = await db('stripe_webhook_events')
      .insert({
        stripe_event_id: data.stripe_event_id,
        event_type: data.event_type,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        processing_status: 'pending',
        received_at: db.fn.now(),
      })
      .returning('*')
      .onConflict('stripe_event_id')
      .ignore();

    // If insert was ignored due to conflict, fetch existing
    if (!event) {
      const existing = await db('stripe_webhook_events')
        .where({ stripe_event_id: data.stripe_event_id })
        .first();
      return { event: existing, isNew: false };
    }

    return { event, isNew: true };
  },

  /**
   * Mark event as processing
   * Called at the start of webhook handling
   */
  async markAsProcessing(id: string): Promise<void> {
    await db('stripe_webhook_events').where({ id }).update({
      processing_status: 'processing',
    });
  },

  /**
   * Mark event as completed
   * Called after successful processing
   */
  async markAsCompleted(id: string): Promise<void> {
    await db('stripe_webhook_events').where({ id }).update({
      processing_status: 'completed',
      processed_at: db.fn.now(),
    });
  },

  /**
   * Mark event as failed
   * Called when processing encounters an error
   */
  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    await db('stripe_webhook_events').where({ id }).update({
      processing_status: 'failed',
      error_message: errorMessage,
      processed_at: db.fn.now(),
    });
  },

  /**
   * Mark event as skipped
   * Called when event is a duplicate or not applicable
   */
  async markAsSkipped(id: string): Promise<void> {
    await db('stripe_webhook_events').where({ id }).update({
      processing_status: 'skipped',
      processed_at: db.fn.now(),
    });
  },

  /**
   * Find event by Stripe event ID
   */
  async findByStripeEventId(stripeEventId: string): Promise<WebhookEvent | undefined> {
    return await db('stripe_webhook_events').where({ stripe_event_id: stripeEventId }).first();
  },

  /**
   * Find events by type for debugging/replay
   */
  async findByType(eventType: string, limit: number = 100): Promise<WebhookEvent[]> {
    return await db('stripe_webhook_events')
      .where({ event_type: eventType })
      .orderBy('received_at', 'desc')
      .limit(limit);
  },

  /**
   * Find failed events for retry
   * Returns events that failed processing within the last 24 hours
   * TASK-W2-01: Updated to exclude dead letter events
   */
  async findFailedEvents(limit: number = 50): Promise<WebhookEvent[]> {
    return await db('stripe_webhook_events')
      .where({ processing_status: 'failed' })
      .where((builder) => {
        void builder.where('dead_letter', false).orWhereNull('dead_letter');
      })
      .where('received_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
      .orderBy('received_at', 'asc')
      .limit(limit);
  },

  /**
   * TASK-W2-01: Find events eligible for retry
   * Returns failed events that haven't exceeded max retries and aren't in dead letter
   */
  async findRetryEligibleEvents(
    maxRetries: number = 3,
    limit: number = 50,
  ): Promise<WebhookEvent[]> {
    return await db('stripe_webhook_events')
      .where({ processing_status: 'failed' })
      .where((builder) => {
        void builder.where('dead_letter', false).orWhereNull('dead_letter');
      })
      .where((builder) => {
        void builder.where('retry_count', '<', maxRetries).orWhereNull('retry_count');
      })
      .where('received_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
      .whereRaw('(next_retry_at IS NULL OR next_retry_at <= NOW())')
      .orderBy('received_at', 'asc')
      .limit(limit);
  },

  /**
   * TASK-W2-01: Mark event as failed and queue for retry
   */
  async markAsFailedAndQueueRetry(
    id: string,
    errorMessage: string,
  ): Promise<WebhookEvent | undefined> {
    await db('stripe_webhook_events').where({ id }).update({
      processing_status: 'failed',
      error_message: errorMessage,
      processed_at: db.fn.now(),
    });

    return await db('stripe_webhook_events').where({ id }).first();
  },

  /**
   * TASK-W2-01: Get dead letter events
   */
  async getDeadLetterEvents(limit: number = 50): Promise<WebhookEvent[]> {
    return await db('stripe_webhook_events')
      .where('dead_letter', true)
      .orderBy('dead_letter_at', 'desc')
      .limit(limit);
  },

  /**
   * Cleanup old events
   * Removes completed events older than 90 days
   * Should be run as a scheduled job
   */
  async cleanupOldEvents(): Promise<number> {
    const result = await db('stripe_webhook_events')
      .where('processing_status', 'completed')
      .where('received_at', '<', db.raw("NOW() - INTERVAL '90 days'"))
      .delete();

    return result;
  },

  /**
   * Get event statistics for monitoring
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    skipped: number;
    last24Hours: number;
  }> {
    const stats = await db('stripe_webhook_events')
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending"),
        db.raw("COUNT(CASE WHEN processing_status = 'processing' THEN 1 END) as processing"),
        db.raw("COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed"),
        db.raw("COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed"),
        db.raw("COUNT(CASE WHEN processing_status = 'skipped' THEN 1 END) as skipped"),
        db.raw(
          "COUNT(CASE WHEN received_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24_hours",
        ),
      )
      .first();

    return {
      total: parseInt(stats.total) || 0,
      pending: parseInt(stats.pending) || 0,
      processing: parseInt(stats.processing) || 0,
      completed: parseInt(stats.completed) || 0,
      failed: parseInt(stats.failed) || 0,
      skipped: parseInt(stats.skipped) || 0,
      last24Hours: parseInt(stats.last_24_hours) || 0,
    };
  },
};
