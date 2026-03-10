/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Moderation Worker
 *
 * Async worker that processes messages for AI content moderation.
 * Polls for messages with 'pending_ai_review' status and sends them
 * through the ContentModerationService.
 *
 * Can run as either:
 * 1. Bull queue worker (recommended for production)
 * 2. Polling worker (simpler, for development)
 *
 * Constitution: Principle I (Child Safety)
 */

import Queue from 'bull';
import db from '../../config/database';
import logger from '../../config/logger';
import ContentModerationService from './content-moderation.service';
import { ModerationInput, ModerationResponse } from './moderation.types';
import { decrypt } from '../../utils/encryption';

// Redis configuration
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// Configuration
const BATCH_SIZE = parseInt(process.env.AI_MODERATION_BATCH_SIZE || '10');
const POLL_INTERVAL_MS = parseInt(process.env.AI_MODERATION_POLL_INTERVAL_MS || '5000');
const MAX_RETRIES = parseInt(process.env.AI_MODERATION_MAX_RETRIES || '3');
const CONTEXT_MESSAGE_COUNT = 5; // Number of previous messages for context

// Create moderation queue
export const moderationQueue = new Queue('content-moderation', redisConfig);

/**
 * Job data structure
 */
interface ModerationJob {
  messageId: string;
  content: string;
  senderId: string;
  conversationId: string;
  attempt: number;
}

/**
 * Get previous messages for context
 */
async function getPreviousMessages(
  conversationId: string,
  beforeMessageId: string,
  limit: number = CONTEXT_MESSAGE_COUNT,
): Promise<string[]> {
  try {
    const messages = await db('messages')
      .where('conversation_id', conversationId)
      .where('id', '!=', beforeMessageId)
      .where('deleted', false)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('content', 'sender_id');

    // Decrypt and format messages
    return messages.reverse().map((m) => {
      try {
        return decrypt(m.content);
      } catch {
        return '[encrypted]';
      }
    });
  } catch (error) {
    logger.warn('Failed to get previous messages for context', { conversationId, error });
    return [];
  }
}

/**
 * Process a single moderation job
 */
async function processModeration(job: ModerationJob): Promise<ModerationResponse> {
  const { messageId, content, senderId, conversationId } = job;

  logger.info(`Processing moderation for message ${messageId}`);

  // Get previous messages for context
  const previousMessages = await getPreviousMessages(conversationId, messageId);

  // Create moderation input
  const input: ModerationInput = {
    messageId,
    content,
    senderId,
    conversationId,
    previousMessages,
  };

  // Run moderation
  const response = await ContentModerationService.moderateMessage(input);

  // Update message with results
  await ContentModerationService.updateMessageModeration(messageId, response);

  // Handle auto-block actions
  if (response.action === 'auto_blocked') {
    logger.warn('Message auto-blocked by AI moderation', {
      messageId,
      senderId,
      category: response.result.category,
      confidence: response.result.confidence,
    });

    // Apply account action for auto-blocked messages
    await ContentModerationService.applyAccountAction(
      senderId,
      'suspension_7d',
      `Auto-blocked message: ${response.result.category} (confidence: ${response.result.confidence})`,
    );

    // Create urgent report for admin review
    await db('message_reports').insert({
      message_id: messageId,
      reported_by: null, // System-generated
      reported_user_id: senderId,
      report_type: 'child_safety_concern',
      description: `AI AUTO-BLOCK: ${response.result.reasoning}`,
      status: 'pending',
      severity: 'critical',
      ai_detected: true,
      ai_confidence: response.result.confidence,
    });
  }

  // Handle flagged messages
  if (response.action === 'flagged_urgent' || response.action === 'flagged_standard') {
    const severity = response.action === 'flagged_urgent' ? 'high' : 'medium';

    await db('message_reports').insert({
      message_id: messageId,
      reported_by: null, // System-generated
      reported_user_id: senderId,
      report_type: 'child_safety_concern',
      description: `AI FLAG: ${response.result.reasoning}`,
      status: 'pending',
      severity,
      ai_detected: true,
      ai_confidence: response.result.confidence,
    });
  }

  logger.info(`Moderation completed for message ${messageId}`, {
    category: response.result.category,
    confidence: response.result.confidence,
    action: response.action,
    latencyMs: response.latencyMs,
  });

  return response;
}

/**
 * Bull queue processor
 */
void moderationQueue.process('moderate', async (job) => {
  const data = job.data as ModerationJob;

  try {
    const result = await processModeration(data);
    return { success: true, result };
  } catch (error: any) {
    logger.error(`Moderation job failed for message ${data.messageId}`, {
      error: error.message,
      attempt: data.attempt,
    });

    // Retry logic
    if (data.attempt < MAX_RETRIES) {
      await moderationQueue.add(
        'moderate',
        { ...data, attempt: data.attempt + 1 },
        { delay: Math.pow(2, data.attempt) * 1000 }, // Exponential backoff
      );
    } else {
      // Mark for manual review after max retries
      await db('messages')
        .where('id', data.messageId)
        .update({
          moderation_status: 'pending',
          flagged_for_review: true,
          moderation_notes: `AI moderation failed after ${MAX_RETRIES} attempts: ${error.message}`,
        });
    }

    throw error;
  }
});

/**
 * Add message to moderation queue
 */
export async function queueMessageForModeration(
  messageId: string,
  content: string,
  senderId: string,
  conversationId: string,
): Promise<void> {
  if (!ContentModerationService.isEnabled()) {
    logger.debug('Content moderation disabled, skipping queue');
    return;
  }

  await moderationQueue.add(
    'moderate',
    {
      messageId,
      content,
      senderId,
      conversationId,
      attempt: 1,
    },
    {
      attempts: MAX_RETRIES,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  );

  logger.debug(`Message ${messageId} queued for moderation`);
}

/**
 * Polling-based worker (alternative to Bull queue)
 * Use this for simpler deployments or development
 */
export class ModerationPollingWorker {
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  /**
   * Start the polling worker
   */
  async start(): Promise<void> {
    if (!ContentModerationService.isEnabled()) {
      logger.info('Content moderation disabled, worker not started');
      return;
    }

    this.isRunning = true;
    logger.info('Moderation polling worker started', {
      batchSize: BATCH_SIZE,
      pollIntervalMs: POLL_INTERVAL_MS,
      shadowMode: ContentModerationService.isShadowMode(),
    });

    await this.poll();
  }

  /**
   * Stop the polling worker
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info('Moderation polling worker stopped');
  }

  /**
   * Poll for pending messages
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Get messages pending AI review
      const pendingMessages = await db('messages')
        .where('moderation_status', 'pending_ai_review')
        .whereNull('ai_moderated_at')
        .orderBy('created_at', 'asc')
        .limit(BATCH_SIZE)
        .select('id', 'content', 'sender_id', 'conversation_id');

      if (pendingMessages.length > 0) {
        logger.debug(`Processing ${pendingMessages.length} messages for moderation`);

        for (const message of pendingMessages) {
          try {
            // Decrypt content
            let decryptedContent: string;
            try {
              decryptedContent = decrypt(message.content);
            } catch {
              decryptedContent = message.content; // May already be decrypted in dev
            }

            await processModeration({
              messageId: message.id,
              content: decryptedContent,
              senderId: message.sender_id,
              conversationId: message.conversation_id,
              attempt: 1,
            });
          } catch (error: any) {
            logger.error(`Failed to moderate message ${message.id}`, {
              error: error.message,
            });

            // Mark for manual review on persistent failure
            await db('messages')
              .where('id', message.id)
              .update({
                moderation_status: 'pending',
                flagged_for_review: true,
                moderation_notes: `Moderation error: ${error.message}`,
              });
          }
        }
      }
    } catch (error) {
      logger.error('Error in moderation polling loop', { error });
    }

    // Schedule next poll
    this.pollInterval = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats(): Promise<{
  pending: number;
  processed24h: number;
  flagged24h: number;
  blocked24h: number;
  avgLatencyMs: number;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const stats = await db('ai_moderation_logs')
    .where('created_at', '>=', oneDayAgo)
    .select(
      db.raw('COUNT(*) as processed'),
      db.raw("COUNT(CASE WHEN action_taken LIKE 'flagged%' THEN 1 END) as flagged"),
      db.raw("COUNT(CASE WHEN action_taken = 'auto_blocked' THEN 1 END) as blocked"),
      db.raw('AVG(latency_ms) as avg_latency'),
    )
    .first();

  const pending = await db('messages')
    .where('moderation_status', 'pending_ai_review')
    .count('* as count')
    .first();

  return {
    pending: parseInt(pending?.count as string) || 0,
    processed24h: parseInt(stats?.processed) || 0,
    flagged24h: parseInt(stats?.flagged) || 0,
    blocked24h: parseInt(stats?.blocked) || 0,
    avgLatencyMs: parseFloat(stats?.avg_latency) || 0,
  };
}

// Create singleton worker instance
export const moderationWorker = new ModerationPollingWorker();

export default moderationWorker;
