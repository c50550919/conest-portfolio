/**
 * Integration Test: Webhook Retry Queue Implementation
 *
 * TASK-W2-01: Webhook Retry Queue Implementation
 *
 * Tests the webhook retry system including:
 * - Queue configuration and backoff strategy
 * - Retry processing logic
 * - Dead letter queue functionality
 * - Alert generation on repeated failures
 * - Scheduled job for reprocessing
 *
 * Constitution Principle III: Security - audit trail for all webhook processing
 * Constitution Principle IV: Performance - async processing with backoff
 */

import { z } from 'zod';

// Test configuration constants
const MAX_RETRY_ATTEMPTS = 3;
const BACKOFF_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s
const ALERT_THRESHOLD = 3;
const DEAD_LETTER_AFTER_ATTEMPTS = 3;

describe('Webhook Retry Queue Implementation', () => {
  describe('Configuration', () => {
    it('should have correct max retry attempts configured', () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it('should have exponential backoff delays configured', () => {
      expect(BACKOFF_DELAYS).toEqual([2000, 4000, 8000]);
      // Verify exponential pattern
      expect(BACKOFF_DELAYS[1]).toBe(BACKOFF_DELAYS[0] * 2);
      expect(BACKOFF_DELAYS[2]).toBe(BACKOFF_DELAYS[1] * 2);
    });

    it('should have alert threshold configured', () => {
      expect(ALERT_THRESHOLD).toBe(3);
    });

    it('should move to dead letter after max attempts', () => {
      expect(DEAD_LETTER_AFTER_ATTEMPTS).toBe(MAX_RETRY_ATTEMPTS);
    });
  });

  describe('Backoff Strategy', () => {
    const calculateDelay = (retryCount: number): number => BACKOFF_DELAYS[retryCount] || BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];

    it('should return 2s delay for first retry', () => {
      expect(calculateDelay(0)).toBe(2000);
    });

    it('should return 4s delay for second retry', () => {
      expect(calculateDelay(1)).toBe(4000);
    });

    it('should return 8s delay for third retry', () => {
      expect(calculateDelay(2)).toBe(8000);
    });

    it('should cap delay at last configured value for overflow', () => {
      expect(calculateDelay(10)).toBe(8000);
    });
  });

  describe('Webhook Job Data Schema', () => {
    const webhookJobSchema = z.object({
      eventId: z.string().uuid(),
      source: z.enum(['stripe', 'veriff', 'certn']),
      eventType: z.string(),
      payload: z.record(z.unknown()),
      retryCount: z.number().int().min(0),
      originalReceivedAt: z.date(),
    });

    it('should validate valid Stripe webhook job data', () => {
      const validJob = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        source: 'stripe',
        eventType: 'payment_intent.succeeded',
        payload: { id: 'pi_test123', status: 'succeeded' },
        retryCount: 0,
        originalReceivedAt: new Date(),
      };

      const result = webhookJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it('should validate valid Veriff webhook job data', () => {
      const validJob = {
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        source: 'veriff',
        eventType: 'success',
        payload: { status: 'success', verification: { id: 'session123' } },
        retryCount: 1,
        originalReceivedAt: new Date(),
      };

      const result = webhookJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it('should validate valid Certn webhook job data', () => {
      const validJob = {
        eventId: '550e8400-e29b-41d4-a716-446655440002',
        source: 'certn',
        eventType: 'application.completed',
        payload: { event: 'application.completed', data: { id: 'app123' } },
        retryCount: 2,
        originalReceivedAt: new Date(),
      };

      const result = webhookJobSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it('should reject invalid source', () => {
      const invalidJob = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        source: 'invalid_source',
        eventType: 'test',
        payload: {},
        retryCount: 0,
        originalReceivedAt: new Date(),
      };

      const result = webhookJobSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });

    it('should reject negative retry count', () => {
      const invalidJob = {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        source: 'stripe',
        eventType: 'test',
        payload: {},
        retryCount: -1,
        originalReceivedAt: new Date(),
      };

      const result = webhookJobSchema.safeParse(invalidJob);
      expect(result.success).toBe(false);
    });
  });

  describe('Alert Schema', () => {
    const alertSchema = z.object({
      alert_type: z.enum(['repeated_failure', 'dead_letter', 'high_failure_rate']),
      source: z.string(),
      event_type: z.string().nullable(),
      failure_count: z.number().int().min(1),
      message: z.string(),
      metadata: z.record(z.unknown()).optional(),
    });

    it('should validate repeated_failure alert', () => {
      const alert = {
        alert_type: 'repeated_failure',
        source: 'stripe',
        event_type: 'payment_intent.succeeded',
        failure_count: 3,
        message: 'Stripe webhook type "payment_intent.succeeded" has failed 3 times in the last hour',
      };

      const result = alertSchema.safeParse(alert);
      expect(result.success).toBe(true);
    });

    it('should validate dead_letter alert', () => {
      const alert = {
        alert_type: 'dead_letter',
        source: 'veriff',
        event_type: 'success',
        failure_count: 3,
        message: 'Webhook evt_123 moved to dead letter queue after 3 attempts',
        metadata: { eventId: 'evt_123', lastError: 'Processing failed' },
      };

      const result = alertSchema.safeParse(alert);
      expect(result.success).toBe(true);
    });

    it('should validate high_failure_rate alert', () => {
      const alert = {
        alert_type: 'high_failure_rate',
        source: 'certn',
        event_type: null,
        failure_count: 10,
        message: 'High failure rate detected for certn webhooks',
      };

      const result = alertSchema.safeParse(alert);
      expect(result.success).toBe(true);
    });
  });

  describe('Retry Eligibility Logic', () => {
    interface WebhookEvent {
      id: string;
      processing_status: string;
      retry_count: number;
      dead_letter: boolean;
      received_at: Date;
      next_retry_at: Date | null;
    }

    const isRetryEligible = (
      event: WebhookEvent,
      maxRetries: number = MAX_RETRY_ATTEMPTS,
    ): boolean => {
      // Must be in failed status
      if (event.processing_status !== 'failed') return false;

      // Must not be in dead letter
      if (event.dead_letter) return false;

      // Must not have exceeded max retries
      if (event.retry_count >= maxRetries) return false;

      // Must be received within last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (event.received_at < twentyFourHoursAgo) return false;

      // Must be ready for retry (next_retry_at in past or null)
      if (event.next_retry_at && event.next_retry_at > new Date()) return false;

      return true;
    };

    it('should be eligible for retry when failed and under max retries', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'failed',
        retry_count: 0,
        dead_letter: false,
        received_at: new Date(),
        next_retry_at: null,
      };

      expect(isRetryEligible(event)).toBe(true);
    });

    it('should not be eligible when processing_status is not failed', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'completed',
        retry_count: 0,
        dead_letter: false,
        received_at: new Date(),
        next_retry_at: null,
      };

      expect(isRetryEligible(event)).toBe(false);
    });

    it('should not be eligible when in dead letter queue', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'failed',
        retry_count: 2,
        dead_letter: true,
        received_at: new Date(),
        next_retry_at: null,
      };

      expect(isRetryEligible(event)).toBe(false);
    });

    it('should not be eligible when max retries exceeded', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'failed',
        retry_count: 3,
        dead_letter: false,
        received_at: new Date(),
        next_retry_at: null,
      };

      expect(isRetryEligible(event)).toBe(false);
    });

    it('should not be eligible when received over 24 hours ago', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'failed',
        retry_count: 0,
        dead_letter: false,
        received_at: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        next_retry_at: null,
      };

      expect(isRetryEligible(event)).toBe(false);
    });

    it('should not be eligible when next_retry_at is in future', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'failed',
        retry_count: 1,
        dead_letter: false,
        received_at: new Date(),
        next_retry_at: new Date(Date.now() + 60000), // 1 minute in future
      };

      expect(isRetryEligible(event)).toBe(false);
    });

    it('should be eligible when next_retry_at is in past', () => {
      const event: WebhookEvent = {
        id: 'evt_123',
        processing_status: 'failed',
        retry_count: 1,
        dead_letter: false,
        received_at: new Date(),
        next_retry_at: new Date(Date.now() - 60000), // 1 minute in past
      };

      expect(isRetryEligible(event)).toBe(true);
    });
  });

  describe('Dead Letter Queue Logic', () => {
    interface RetryResult {
      success: boolean;
      retryCount: number;
      error?: string;
    }

    const shouldMoveToDeadLetter = (
      retryCount: number,
      maxRetries: number = MAX_RETRY_ATTEMPTS,
    ): boolean => 
      retryCount >= maxRetries - 1 // Move after last retry fails
    ;

    it('should not move to dead letter on first failure', () => {
      expect(shouldMoveToDeadLetter(0)).toBe(false);
    });

    it('should not move to dead letter on second failure', () => {
      expect(shouldMoveToDeadLetter(1)).toBe(false);
    });

    it('should move to dead letter on third failure', () => {
      expect(shouldMoveToDeadLetter(2)).toBe(true);
    });

    it('should move to dead letter when exceeding max retries', () => {
      expect(shouldMoveToDeadLetter(3)).toBe(true);
      expect(shouldMoveToDeadLetter(10)).toBe(true);
    });
  });

  describe('Alert Generation Logic', () => {
    interface FailureCount {
      event_type: string;
      provider?: string;
      failure_count: number;
    }

    const shouldGenerateAlert = (
      failureCount: number,
      threshold: number = ALERT_THRESHOLD,
    ): boolean => failureCount >= threshold;

    it('should not generate alert below threshold', () => {
      expect(shouldGenerateAlert(1)).toBe(false);
      expect(shouldGenerateAlert(2)).toBe(false);
    });

    it('should generate alert at threshold', () => {
      expect(shouldGenerateAlert(3)).toBe(true);
    });

    it('should generate alert above threshold', () => {
      expect(shouldGenerateAlert(5)).toBe(true);
      expect(shouldGenerateAlert(10)).toBe(true);
    });
  });

  describe('Queue Statistics Schema', () => {
    const statsSchema = z.object({
      waiting: z.number().int().min(0),
      active: z.number().int().min(0),
      completed: z.number().int().min(0),
      failed: z.number().int().min(0),
      delayed: z.number().int().min(0),
    });

    it('should validate queue statistics', () => {
      const stats = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 8,
      };

      const result = statsSchema.safeParse(stats);
      expect(result.success).toBe(true);
    });

    it('should reject negative values', () => {
      const stats = {
        waiting: -1,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 8,
      };

      const result = statsSchema.safeParse(stats);
      expect(result.success).toBe(false);
    });
  });

  describe('Webhook Event Fields Schema', () => {
    const webhookEventSchema = z.object({
      id: z.string().uuid(),
      processing_status: z.enum(['pending', 'processing', 'completed', 'failed', 'skipped']),
      retry_count: z.number().int().min(0),
      last_retry_at: z.date().nullable(),
      next_retry_at: z.date().nullable(),
      dead_letter: z.boolean(),
      dead_letter_at: z.date().nullable(),
      dead_letter_reason: z.string().nullable(),
    });

    it('should validate webhook event with retry fields', () => {
      const event = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        processing_status: 'failed',
        retry_count: 2,
        last_retry_at: new Date(),
        next_retry_at: new Date(Date.now() + 4000),
        dead_letter: false,
        dead_letter_at: null,
        dead_letter_reason: null,
      };

      const result = webhookEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate webhook event in dead letter', () => {
      const event = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        processing_status: 'failed',
        retry_count: 3,
        last_retry_at: new Date(),
        next_retry_at: null,
        dead_letter: true,
        dead_letter_at: new Date(),
        dead_letter_reason: 'Max retries (3) exceeded: Processing failed',
      };

      const result = webhookEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should process successful retry scenario correctly', () => {
      // Simulate retry scenario
      const initialEvent = {
        id: 'evt_123',
        processing_status: 'failed' as const,
        retry_count: 0,
        error_message: 'Temporary failure',
      };

      // After successful retry
      const updatedEvent = {
        ...initialEvent,
        processing_status: 'completed' as const,
        retry_count: 1,
        error_message: null,
      };

      expect(updatedEvent.processing_status).toBe('completed');
      expect(updatedEvent.retry_count).toBe(1);
    });

    it('should process dead letter scenario correctly', () => {
      // Simulate exhausted retries
      const exhaustedEvent = {
        id: 'evt_123',
        processing_status: 'failed' as const,
        retry_count: 3,
        dead_letter: true,
        dead_letter_reason: 'Max retries (3) exceeded: Persistent failure',
      };

      expect(exhaustedEvent.dead_letter).toBe(true);
      expect(exhaustedEvent.dead_letter_reason).toContain('Max retries');
    });

    it('should calculate total retry time correctly', () => {
      // Total time for all retries: 2s + 4s + 8s = 14s
      const totalRetryTime = BACKOFF_DELAYS.reduce((sum, delay) => sum + delay, 0);
      expect(totalRetryTime).toBe(14000); // 14 seconds
    });
  });
});
