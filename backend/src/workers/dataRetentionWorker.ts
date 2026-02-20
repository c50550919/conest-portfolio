/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import cron from 'node-cron';
import db from '../config/database';
import logger from '../config/logger';

/**
 * Data Retention Worker
 *
 * CMP-03: Purges expired criminal record data (flagged_records + webhook payloads)
 * CMP-04: Finalizes FCRA pre-adverse action after 5 business days
 *
 * Constitution Principle III: Security — minimize criminal record data retention
 * FCRA §604(b)(3): Criminal record data must not be retained longer than necessary
 *
 * Schedule: Daily at 3 AM (offset from webhook retry worker at 2 AM)
 */

let cronJob: cron.ScheduledTask | null = null;

/**
 * Purge expired criminal record data from verifications table
 * Nullifies flagged_records where retention_expires_at has passed
 */
async function purgeExpiredCriminalRecords(): Promise<number> {
  try {
    const result = await db('verifications')
      .whereNotNull('flagged_records')
      .whereNotNull('retention_expires_at')
      .where('retention_expires_at', '<', db.fn.now())
      .update({
        flagged_records: null,
        updated_at: db.fn.now(),
      });

    if (result > 0) {
      logger.info('Purged expired criminal record data', {
        worker: 'dataRetention',
        recordsPurged: result,
      });
    }

    return result;
  } catch (error: any) {
    logger.error('Failed to purge expired criminal records', {
      worker: 'dataRetention',
      error: error.message,
    });
    return 0;
  }
}

/**
 * Purge expired webhook payloads containing criminal record data
 * Nullifies payload where the associated verification's retention has expired
 */
async function purgeExpiredWebhookPayloads(): Promise<number> {
  try {
    // Find verification user_ids with expired retention
    const expiredUserIds = await db('verifications')
      .select('user_id')
      .whereNotNull('retention_expires_at')
      .where('retention_expires_at', '<', db.fn.now());

    if (expiredUserIds.length === 0) return 0;

    const userIds = expiredUserIds.map((r: { user_id: string }) => r.user_id);

    const result = await db('verification_webhook_events')
      .whereIn('user_id', userIds)
      .whereNotNull('payload')
      .whereIn('provider', ['certn']) // Only Certn webhooks contain criminal records
      .update({
        payload: null,
      });

    if (result > 0) {
      logger.info('Purged expired webhook payloads', {
        worker: 'dataRetention',
        payloadsPurged: result,
      });
    }

    return result;
  } catch (error: any) {
    logger.error('Failed to purge expired webhook payloads', {
      worker: 'dataRetention',
      error: error.message,
    });
    return 0;
  }
}

/**
 * Finalize FCRA pre-adverse actions after 5 business days
 *
 * CMP-04: FCRA requires a waiting period between pre-adverse notice
 * and final adverse action. After 5 business days (7 calendar days
 * as a conservative estimate), the status transitions from
 * 'pre_adverse' to 'rejected'.
 */
async function finalizeAdverseActions(): Promise<number> {
  try {
    // 7 calendar days ≈ 5 business days (conservative)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const result = await db('verifications')
      .where('background_check_status', 'pre_adverse')
      .whereNotNull('pre_adverse_notice_date')
      .where('pre_adverse_notice_date', '<', cutoffDate)
      .update({
        background_check_status: 'rejected',
        updated_at: db.fn.now(),
      });

    if (result > 0) {
      logger.info('Finalized FCRA adverse actions', {
        worker: 'dataRetention',
        actionsFinalized: result,
      });
    }

    return result;
  } catch (error: any) {
    logger.error('Failed to finalize adverse actions', {
      worker: 'dataRetention',
      error: error.message,
    });
    return 0;
  }
}

/**
 * Main worker execution — runs all retention tasks
 */
async function runRetentionTasks(): Promise<void> {
  logger.info('Data retention worker starting daily run', {
    worker: 'dataRetention',
    timestamp: new Date().toISOString(),
  });

  const recordsPurged = await purgeExpiredCriminalRecords();
  const payloadsPurged = await purgeExpiredWebhookPayloads();
  const actionsFinalized = await finalizeAdverseActions();

  logger.info('Data retention worker completed', {
    worker: 'dataRetention',
    recordsPurged,
    payloadsPurged,
    actionsFinalized,
  });
}

/**
 * Start the data retention worker
 * Runs daily at 3:00 AM server time
 */
export function startDataRetentionWorker(): void {
  if (cronJob) {
    logger.warn('Data retention worker already running');
    return;
  }

  // Run daily at 3 AM
  cronJob = cron.schedule('0 3 * * *', () => {
    void runRetentionTasks();
  });

  logger.info('Data retention worker started', {
    worker: 'dataRetention',
    schedule: 'Daily at 3:00 AM',
  });
}

/**
 * Stop the data retention worker
 */
export function stopDataRetentionWorker(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('Data retention worker stopped');
  }
}

/**
 * Run retention tasks on-demand (for testing/manual execution)
 */
export { runRetentionTasks };
