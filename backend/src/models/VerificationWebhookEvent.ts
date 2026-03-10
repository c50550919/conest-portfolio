/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import { db } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * VerificationWebhookEvent Model
 *
 * Purpose: Track processed verification webhook events for deduplication
 * Supports: Veriff ID verification, Certn background checks
 *
 * Constitution Principle III: Security - prevent duplicate event processing
 * Constitution Principle IV: Performance - fast deduplication check (<10ms)
 *
 * Features:
 * - Prevents duplicate webhook event processing
 * - Provides audit trail of all verification webhook events
 * - Supports multiple providers (Veriff, Certn)
 */

export type VerificationProvider = 'veriff' | 'certn' | 'telnyx';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export interface VerificationWebhookEvent {
  id: string;
  provider: VerificationProvider;
  provider_event_id: string;
  event_type: string;
  user_id: string | null;
  processing_status: ProcessingStatus;
  payload: Record<string, unknown> | null;
  encrypted: boolean; // CMP-02: Whether payload is encrypted at rest
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

export interface CreateVerificationWebhookEventData {
  provider: VerificationProvider;
  provider_event_id: string;
  event_type: string;
  user_id?: string;
  payload?: Record<string, unknown>;
  encrypted?: boolean; // CMP-02: Flag for encrypted payloads
}

export const VerificationWebhookEventModel = {
  /**
   * Check if an event has already been processed
   * Returns true if event exists with status 'completed' or 'processing'
   *
   * @param provider - Provider name (veriff, certn)
   * @param providerEventId - Provider's unique event/session ID
   */
  async isEventProcessed(
    provider: VerificationProvider,
    providerEventId: string,
  ): Promise<boolean> {
    try {
      const event = await db('verification_webhook_events')
        .where({ provider, provider_event_id: providerEventId })
        .whereIn('processing_status', ['completed', 'processing'])
        .first();

      return !!event;
    } catch (error: any) {
      // If table doesn't exist yet, treat as not processed
      if (error.code === '42P01') {
        return false;
      }
      throw error;
    }
  },

  /**
   * Create or get existing event record
   * Uses upsert pattern for idempotency
   *
   * @returns Object with event and isNew flag
   */
  async createOrGet(
    data: CreateVerificationWebhookEventData,
  ): Promise<{ event: VerificationWebhookEvent; isNew: boolean }> {
    try {
      // Check for existing event
      const existingEvent = await db('verification_webhook_events')
        .where({
          provider: data.provider,
          provider_event_id: data.provider_event_id,
        })
        .first();

      if (existingEvent) {
        return { event: existingEvent, isNew: false };
      }

      // Create new event record
      const newEvent = {
        id: uuidv4(),
        provider: data.provider,
        provider_event_id: data.provider_event_id,
        event_type: data.event_type,
        user_id: data.user_id || null,
        payload: data.payload ? JSON.stringify(data.payload) : null,
        encrypted: data.encrypted ?? false,
        processing_status: 'pending' as ProcessingStatus,
        received_at: new Date(),
      };

      const [event] = await db('verification_webhook_events').insert(newEvent).returning('*');

      return { event, isNew: true };
    } catch (error: any) {
      // Handle race condition - if insert fails due to unique constraint, fetch existing
      if (error.code === '23505') {
        const existing = await db('verification_webhook_events')
          .where({
            provider: data.provider,
            provider_event_id: data.provider_event_id,
          })
          .first();
        return { event: existing, isNew: false };
      }
      // If table doesn't exist, create a mock response to allow processing
      if (error.code === '42P01') {
        return {
          event: {
            id: uuidv4(),
            provider: data.provider,
            provider_event_id: data.provider_event_id,
            event_type: data.event_type,
            user_id: data.user_id || null,
            processing_status: 'pending',
            payload: data.payload || null,
            encrypted: data.encrypted ?? false,
            error_message: null,
            received_at: new Date(),
            processed_at: null,
            created_at: new Date(),
            retry_count: 0,
            last_retry_at: null,
            next_retry_at: null,
            dead_letter: false,
            dead_letter_at: null,
            dead_letter_reason: null,
          },
          isNew: true,
        };
      }
      throw error;
    }
  },

  /**
   * Mark event as processing
   */
  async markAsProcessing(id: string): Promise<void> {
    try {
      await db('verification_webhook_events')
        .where({ id })
        .update({ processing_status: 'processing' });
    } catch (error: any) {
      if (error.code === '42P01') return; // Table doesn't exist
      throw error;
    }
  },

  /**
   * Mark event as completed
   */
  async markAsCompleted(id: string): Promise<void> {
    try {
      await db('verification_webhook_events').where({ id }).update({
        processing_status: 'completed',
        processed_at: new Date(),
      });
    } catch (error: any) {
      if (error.code === '42P01') return; // Table doesn't exist
      throw error;
    }
  },

  /**
   * Mark event as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    try {
      await db('verification_webhook_events').where({ id }).update({
        processing_status: 'failed',
        error_message: errorMessage,
        processed_at: new Date(),
      });
    } catch (error: any) {
      if (error.code === '42P01') return; // Table doesn't exist
      throw error;
    }
  },

  /**
   * Mark event as skipped (duplicate)
   */
  async markAsSkipped(id: string): Promise<void> {
    try {
      await db('verification_webhook_events').where({ id }).update({
        processing_status: 'skipped',
        processed_at: new Date(),
      });
    } catch (error: any) {
      if (error.code === '42P01') return; // Table doesn't exist
      throw error;
    }
  },

  /**
   * Find failed events for retry
   * TASK-W2-01: Updated to exclude dead letter events
   */
  async findFailedEvents(
    provider?: VerificationProvider,
    limit: number = 50,
  ): Promise<VerificationWebhookEvent[]> {
    try {
      let query = db('verification_webhook_events')
        .where({ processing_status: 'failed' })
        .where((builder) => {
          void builder.where('dead_letter', false).orWhereNull('dead_letter');
        })
        .where('received_at', '>', db.raw("NOW() - INTERVAL '24 hours'"));

      if (provider) {
        query = query.where({ provider });
      }

      return await query.orderBy('received_at', 'asc').limit(limit);
    } catch (error: any) {
      if (error.code === '42P01') return []; // Table doesn't exist
      throw error;
    }
  },

  /**
   * TASK-W2-01: Find events eligible for retry
   */
  async findRetryEligibleEvents(
    maxRetries: number = 3,
    provider?: VerificationProvider,
    limit: number = 50,
  ): Promise<VerificationWebhookEvent[]> {
    try {
      let query = db('verification_webhook_events')
        .where({ processing_status: 'failed' })
        .where((builder) => {
          void builder.where('dead_letter', false).orWhereNull('dead_letter');
        })
        .where((builder) => {
          void builder.where('retry_count', '<', maxRetries).orWhereNull('retry_count');
        })
        .where('received_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
        .whereRaw('(next_retry_at IS NULL OR next_retry_at <= NOW())');

      if (provider) {
        query = query.where({ provider });
      }

      return await query.orderBy('received_at', 'asc').limit(limit);
    } catch (error: any) {
      if (error.code === '42P01') return []; // Table doesn't exist
      throw error;
    }
  },

  /**
   * TASK-W2-01: Get dead letter events
   */
  async getDeadLetterEvents(
    provider?: VerificationProvider,
    limit: number = 50,
  ): Promise<VerificationWebhookEvent[]> {
    try {
      let query = db('verification_webhook_events')
        .where('dead_letter', true)
        .orderBy('dead_letter_at', 'desc')
        .limit(limit);

      if (provider) {
        query = query.where({ provider });
      }

      return await query;
    } catch (error: any) {
      if (error.code === '42P01') return []; // Table doesn't exist
      throw error;
    }
  },
};
