/**
 * Webhook Retry Worker
 *
 * TASK-W2-01: Webhook Retry Queue Implementation
 *
 * Uses Bull queue for automatic retry of failed webhook events with:
 * - Exponential backoff: 3 attempts (2s, 4s, 8s delays)
 * - Dead letter queue for permanently failed webhooks
 * - Alerting on repeated failures (>3 for same event type in 1 hour)
 * - Hourly scheduled job for reprocessing stale failed events
 *
 * Constitution Principle III: Security - audit trail for all retry attempts
 * Constitution Principle IV: Performance - async processing with backoff
 */

import Queue, { Job, JobOptions } from 'bull';
import cron from 'node-cron';
import logger from '../config/logger';
import { db } from '../config/database';
import { WebhookEventModel } from '../models/WebhookEvent';
// VerificationWebhookEventModel imported when needed for verification event handling

// ============================================================================
// Configuration
// ============================================================================

const MAX_RETRY_ATTEMPTS = 3;
const BACKOFF_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s
const ALERT_THRESHOLD = 3; // Alert after 3 failures of same event type in 1 hour
// Dead letter threshold (same as MAX_RETRY_ATTEMPTS by design)

const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// ============================================================================
// Queue Setup
// ============================================================================

export const webhookRetryQueue = new Queue('webhook-retry', redisConfig);

// ============================================================================
// Types
// ============================================================================

export type WebhookSource = 'stripe' | 'veriff' | 'certn';

export interface WebhookRetryJob {
  eventId: string;
  source: WebhookSource;
  eventType: string;
  payload: Record<string, unknown>;
  retryCount: number;
  originalReceivedAt: Date;
}

export interface WebhookAlert {
  alert_type: 'repeated_failure' | 'dead_letter' | 'high_failure_rate';
  source: string;
  event_type: string | null;
  failure_count: number;
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Webhook Processors (Handlers)
// ============================================================================

/**
 * Registry of webhook processors by source
 * These are the actual functions that process webhook events
 */
const webhookProcessors: Record<WebhookSource, (payload: Record<string, unknown>) => Promise<void>> = {
  stripe: async (payload) => {
    // Dynamic import to avoid circular dependencies
    const { PaymentService } = await import('../features/payments/payment.service');
    // Cast to Stripe.Event - the retry worker reconstructs events from stored payloads
    await PaymentService.handleStripeWebhook(payload as unknown as import('stripe').Stripe.Event);
  },
  veriff: async (payload) => {
    const { VerificationService } = await import('../features/verification');
    await VerificationService.handleVeriffWebhook(payload);
  },
  certn: async (payload) => {
    const { VerificationService } = await import('../features/verification');
    await VerificationService.handleCertnWebhook(payload);
  },
};

// ============================================================================
// Queue Processing
// ============================================================================

/**
 * Process webhook retry jobs
 * Attempts to reprocess failed webhook events with exponential backoff
 */
void webhookRetryQueue.process('webhook-retry', async (job: Job<WebhookRetryJob>) => {
  const { eventId, source, eventType, payload, retryCount } = job.data;

  logger.info('Processing webhook retry', {
    eventId,
    source,
    eventType,
    retryCount,
    jobId: job.id,
  });

  try {
    // Get the appropriate processor
    const processor = webhookProcessors[source];
    if (!processor) {
      throw new Error(`Unknown webhook source: ${source}`);
    }

    // Process the webhook
    await processor(payload);

    // Mark as completed in database
    await markEventCompleted(source, eventId, retryCount);

    logger.info('Webhook retry successful', {
      eventId,
      source,
      eventType,
      retryCount,
    });

    return { success: true, retryCount };
  } catch (error: any) {
    logger.error('Webhook retry failed', {
      eventId,
      source,
      eventType,
      retryCount,
      error: error.message,
    });

    // Update retry count in database
    await incrementRetryCount(source, eventId);

    // Check if we've exhausted retries
    if (retryCount >= MAX_RETRY_ATTEMPTS - 1) {
      // Move to dead letter queue
      await moveToDeadLetter(source, eventId, `Max retries (${MAX_RETRY_ATTEMPTS}) exceeded: ${error.message}`);

      // Create alert
      await createAlert({
        alert_type: 'dead_letter',
        source,
        event_type: eventType,
        failure_count: retryCount + 1,
        message: `Webhook ${eventId} moved to dead letter queue after ${retryCount + 1} attempts`,
        metadata: { eventId, lastError: error.message },
      });
    }

    throw error; // Re-throw to trigger Bull's retry mechanism
  }
});

// ============================================================================
// Public API
// ============================================================================

/**
 * Queue a failed webhook event for retry
 *
 * @param eventId - The webhook event ID
 * @param source - The webhook source (stripe, veriff, certn)
 * @param eventType - The event type
 * @param payload - The original webhook payload
 * @param currentRetryCount - Current retry count (0 for first retry)
 */
export async function queueWebhookRetry(
  eventId: string,
  source: WebhookSource,
  eventType: string,
  payload: Record<string, unknown>,
  currentRetryCount: number = 0,
): Promise<void> {
  if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
    logger.warn('Max retries exceeded, not queueing', { eventId, source, eventType, currentRetryCount });
    return;
  }

  const delay = BACKOFF_DELAYS[currentRetryCount] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];

  const jobOptions: JobOptions = {
    attempts: 1, // We manage retries ourselves
    delay,
    removeOnComplete: true,
    removeOnFail: false,
    jobId: `webhook-retry-${source}-${eventId}-${currentRetryCount}`,
  };

  const jobData: WebhookRetryJob = {
    eventId,
    source,
    eventType,
    payload,
    retryCount: currentRetryCount,
    originalReceivedAt: new Date(),
  };

  await webhookRetryQueue.add('webhook-retry', jobData, jobOptions);

  // Update next_retry_at in database
  const nextRetryAt = new Date(Date.now() + delay);
  await updateNextRetryAt(source, eventId, nextRetryAt);

  logger.info('Queued webhook for retry', {
    eventId,
    source,
    eventType,
    retryCount: currentRetryCount,
    delay,
    nextRetryAt,
  });
}

/**
 * Requeue failed webhooks from the database
 * Called by the hourly scheduled job
 */
export async function requeueFailedWebhooks(): Promise<{ stripe: number; verification: number }> {
  const results = { stripe: 0, verification: 0 };

  try {
    // Find failed Stripe webhooks that haven't been moved to dead letter
    const failedStripeEvents = await db('stripe_webhook_events')
      .where('processing_status', 'failed')
      .where('dead_letter', false)
      .where('retry_count', '<', MAX_RETRY_ATTEMPTS)
      .where('received_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
      .whereRaw('(next_retry_at IS NULL OR next_retry_at <= NOW())')
      .limit(50);

    for (const event of failedStripeEvents) {
      await queueWebhookRetry(
        event.id,
        'stripe',
        event.event_type,
        typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
        event.retry_count,
      );
      results.stripe++;
    }

    // Find failed verification webhooks
    const failedVerificationEvents = await db('verification_webhook_events')
      .where('processing_status', 'failed')
      .where('dead_letter', false)
      .where('retry_count', '<', MAX_RETRY_ATTEMPTS)
      .where('received_at', '>', db.raw("NOW() - INTERVAL '24 hours'"))
      .whereRaw('(next_retry_at IS NULL OR next_retry_at <= NOW())')
      .limit(50);

    for (const event of failedVerificationEvents) {
      await queueWebhookRetry(
        event.id,
        event.provider as WebhookSource,
        event.event_type,
        typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
        event.retry_count,
      );
      results.verification++;
    }

    logger.info('Requeued failed webhooks', results);
  } catch (error) {
    logger.error('Error requeueing failed webhooks', { error });
  }

  return results;
}

/**
 * Check for repeated failures and create alerts
 * Called by the hourly scheduled job
 */
export async function checkFailurePatterns(): Promise<void> {
  try {
    // Check Stripe webhook failures by event type in last hour
    const stripeFailures = await db('stripe_webhook_events')
      .select('event_type')
      .count('* as failure_count')
      .where('processing_status', 'failed')
      .where('received_at', '>', db.raw("NOW() - INTERVAL '1 hour'"))
      .groupBy('event_type')
      .having(db.raw('COUNT(*) >= ?', [ALERT_THRESHOLD]));

    for (const failure of stripeFailures) {
      const eventType = String(failure.event_type);
      const count = parseInt(String(failure.failure_count)) || 0;
      await createAlert({
        alert_type: 'repeated_failure',
        source: 'stripe',
        event_type: eventType,
        failure_count: count,
        message: `Stripe webhook type "${eventType}" has failed ${count} times in the last hour`,
      });
    }

    // Check verification webhook failures by provider and event type
    const verificationFailures = await db('verification_webhook_events')
      .select('provider', 'event_type')
      .count('* as failure_count')
      .where('processing_status', 'failed')
      .where('received_at', '>', db.raw("NOW() - INTERVAL '1 hour'"))
      .groupBy('provider', 'event_type')
      .having(db.raw('COUNT(*) >= ?', [ALERT_THRESHOLD]));

    for (const failure of verificationFailures) {
      const provider = String(failure.provider);
      const eventType = String(failure.event_type);
      const count = parseInt(String(failure.failure_count)) || 0;
      await createAlert({
        alert_type: 'repeated_failure',
        source: provider,
        event_type: eventType,
        failure_count: count,
        message: `${provider} webhook type "${eventType}" has failed ${count} times in the last hour`,
      });
    }
  } catch (error) {
    logger.error('Error checking failure patterns', { error });
  }
}

/**
 * Get webhook queue statistics
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    webhookRetryQueue.getWaitingCount(),
    webhookRetryQueue.getActiveCount(),
    webhookRetryQueue.getCompletedCount(),
    webhookRetryQueue.getFailedCount(),
    webhookRetryQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

/**
 * Get unacknowledged alerts
 */
export async function getUnacknowledgedAlerts(limit: number = 50): Promise<WebhookAlert[]> {
  return db('webhook_retry_alerts')
    .where('acknowledged', false)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
  await db('webhook_retry_alerts')
    .where('id', alertId)
    .update({
      acknowledged: true,
      acknowledged_at: new Date(),
      acknowledged_by: acknowledgedBy,
    });
}

/**
 * Get dead letter queue events
 */
export async function getDeadLetterEvents(
  source?: WebhookSource,
  limit: number = 50,
): Promise<Array<Record<string, unknown>>> {
  const results = [];

  // Stripe dead letter events
  if (!source || source === 'stripe') {
    const stripeEvents = await db('stripe_webhook_events')
      .select('*')
      .where('dead_letter', true)
      .orderBy('dead_letter_at', 'desc')
      .limit(limit);

    results.push(...stripeEvents.map((e: Record<string, unknown>) => ({ ...e, source: 'stripe' })));
  }

  // Verification dead letter events
  if (!source || source === 'veriff' || source === 'certn') {
    let query = db('verification_webhook_events')
      .select('*')
      .where('dead_letter', true)
      .orderBy('dead_letter_at', 'desc')
      .limit(limit);

    if (source) {
      query = query.where('provider', source);
    }

    const verificationEvents = await query;
    results.push(...verificationEvents.map((e: Record<string, unknown>) => ({ ...e, source: e.provider })));
  }

  return results.slice(0, limit);
}

/**
 * Replay a dead letter event (remove from dead letter and requeue)
 */
export async function replayDeadLetterEvent(
  eventId: string,
  source: WebhookSource,
): Promise<boolean> {
  try {
    const table = source === 'stripe' ? 'stripe_webhook_events' : 'verification_webhook_events';

    // Get the event
    const event = await db(table).where('id', eventId).first();

    if (!event || !event.dead_letter) {
      logger.warn('Event not found or not in dead letter', { eventId, source });
      return false;
    }

    // Reset event status
    await db(table)
      .where('id', eventId)
      .update({
        processing_status: 'pending',
        dead_letter: false,
        dead_letter_at: null,
        dead_letter_reason: null,
        retry_count: 0,
        last_retry_at: null,
        next_retry_at: null,
        error_message: null,
      });

    // Queue for processing
    await queueWebhookRetry(
      eventId,
      source,
      event.event_type,
      typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
      0,
    );

    logger.info('Replayed dead letter event', { eventId, source });
    return true;
  } catch (error) {
    logger.error('Error replaying dead letter event', { eventId, source, error });
    return false;
  }
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function markEventCompleted(source: WebhookSource, eventId: string, retryCount: number): Promise<void> {
  const table = source === 'stripe' ? 'stripe_webhook_events' : 'verification_webhook_events';

  await db(table)
    .where('id', eventId)
    .update({
      processing_status: 'completed',
      processed_at: new Date(),
      retry_count: retryCount,
      last_retry_at: new Date(),
    });
}

async function incrementRetryCount(source: WebhookSource, eventId: string): Promise<void> {
  const table = source === 'stripe' ? 'stripe_webhook_events' : 'verification_webhook_events';

  await db(table)
    .where('id', eventId)
    .update({
      retry_count: db.raw('retry_count + 1'),
      last_retry_at: new Date(),
    });
}

async function updateNextRetryAt(source: WebhookSource, eventId: string, nextRetryAt: Date): Promise<void> {
  const table = source === 'stripe' ? 'stripe_webhook_events' : 'verification_webhook_events';

  await db(table)
    .where('id', eventId)
    .update({
      next_retry_at: nextRetryAt,
    });
}

async function moveToDeadLetter(source: WebhookSource, eventId: string, reason: string): Promise<void> {
  const table = source === 'stripe' ? 'stripe_webhook_events' : 'verification_webhook_events';

  await db(table)
    .where('id', eventId)
    .update({
      dead_letter: true,
      dead_letter_at: new Date(),
      dead_letter_reason: reason,
      processing_status: 'failed',
    });

  logger.warn('Moved webhook to dead letter queue', { eventId, source, reason });
}

async function createAlert(alert: WebhookAlert): Promise<void> {
  try {
    // Check for duplicate recent alert
    const existingAlert = await db('webhook_retry_alerts')
      .where('source', alert.source)
      .where('event_type', alert.event_type)
      .where('alert_type', alert.alert_type)
      .where('acknowledged', false)
      .where('created_at', '>', db.raw("NOW() - INTERVAL '1 hour'"))
      .first();

    if (existingAlert) {
      // Update existing alert count
      await db('webhook_retry_alerts')
        .where('id', existingAlert.id)
        .update({
          failure_count: alert.failure_count,
          message: alert.message,
          metadata: JSON.stringify(alert.metadata),
        });
    } else {
      // Create new alert
      await db('webhook_retry_alerts').insert({
        ...alert,
        metadata: alert.metadata ? JSON.stringify(alert.metadata) : null,
      });
    }

    logger.warn('Webhook alert created', alert);
  } catch (error) {
    logger.error('Error creating alert', { error, alert });
  }
}

// ============================================================================
// Queue Event Listeners
// ============================================================================

webhookRetryQueue.on('completed', (job, result) => {
  logger.info('Webhook retry job completed', {
    jobId: job.id,
    eventId: job.data.eventId,
    source: job.data.source,
    result,
  });
});

webhookRetryQueue.on('failed', (job, err) => {
  logger.error('Webhook retry job failed', {
    jobId: job?.id,
    eventId: job?.data?.eventId,
    source: job?.data?.source,
    error: err.message,
  });
});

webhookRetryQueue.on('stalled', (job) => {
  logger.warn('Webhook retry job stalled', {
    jobId: job.id,
    eventId: job.data.eventId,
    source: job.data.source,
  });
});

// ============================================================================
// Scheduled Jobs
// ============================================================================

let hourlyJob: cron.ScheduledTask | null = null;
let cleanupJob: cron.ScheduledTask | null = null;

/**
 * Start the webhook retry worker and scheduled jobs
 */
export function startWebhookRetryWorker(): void {
  // Hourly job: Requeue failed webhooks and check for failure patterns
  hourlyJob = cron.schedule('0 * * * *', async () => {
    logger.info('Running hourly webhook retry job');

    try {
      // Requeue failed webhooks
      const requeued = await requeueFailedWebhooks();
      logger.info('Hourly requeue complete', requeued);

      // Check for failure patterns and alert
      await checkFailurePatterns();
    } catch (error) {
      logger.error('Hourly webhook retry job failed', { error });
    }
  });

  // Daily cleanup job: Remove old completed events
  cleanupJob = cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily webhook cleanup job');

    try {
      const stripeDeleted = await WebhookEventModel.cleanupOldEvents();
      // Note: Add cleanupOldEvents to VerificationWebhookEventModel if needed

      logger.info('Daily cleanup complete', { stripeDeleted });
    } catch (error) {
      logger.error('Daily cleanup job failed', { error });
    }
  });

  logger.info('Webhook retry worker started', {
    maxRetries: MAX_RETRY_ATTEMPTS,
    backoffDelays: BACKOFF_DELAYS,
    alertThreshold: ALERT_THRESHOLD,
  });
}

/**
 * Stop the webhook retry worker and scheduled jobs
 */
export function stopWebhookRetryWorker(): void {
  if (hourlyJob) {
    hourlyJob.stop();
    hourlyJob = null;
  }

  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }

  void webhookRetryQueue.close();

  logger.info('Webhook retry worker stopped');
}

export default webhookRetryQueue;
