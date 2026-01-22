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
  error_message: string | null;
  received_at: Date;
  processed_at: Date | null;
  created_at: Date;
}

export interface CreateVerificationWebhookEventData {
  provider: VerificationProvider;
  provider_event_id: string;
  event_type: string;
  user_id?: string;
  payload?: Record<string, unknown>;
}

export const VerificationWebhookEventModel = {
  /**
   * Check if an event has already been processed
   * Returns true if event exists with status 'completed' or 'processing'
   *
   * @param provider - Provider name (veriff, certn)
   * @param providerEventId - Provider's unique event/session ID
   */
  async isEventProcessed(provider: VerificationProvider, providerEventId: string): Promise<boolean> {
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
        processing_status: 'pending' as ProcessingStatus,
        received_at: new Date(),
      };

      const [event] = await db('verification_webhook_events')
        .insert(newEvent)
        .returning('*');

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
            error_message: null,
            received_at: new Date(),
            processed_at: null,
            created_at: new Date(),
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
      await db('verification_webhook_events')
        .where({ id })
        .update({
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
      await db('verification_webhook_events')
        .where({ id })
        .update({
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
      await db('verification_webhook_events')
        .where({ id })
        .update({
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
   */
  async findFailedEvents(provider?: VerificationProvider, limit: number = 50): Promise<VerificationWebhookEvent[]> {
    try {
      let query = db('verification_webhook_events')
        .where({ processing_status: 'failed' })
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
};
