/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Redis Configuration
 *
 * Configures ioredis client with connection pooling, retry strategy,
 * and TTL policies for caching.
 *
 * Constitution Principles:
 * - Principle III: Security-First (TLS enabled for production)
 * - Principle IV: Performance (<100ms cache lookups, 5min-30day TTL)
 *
 * TTL Strategy (from research.md):
 * - Compatibility scores: 5min (frequently changing)
 * - Profile queues: 1hr (moderate refresh)
 * - Swipe history: 30 days (long-term storage)
 */

import Redis from 'ioredis';
import logger from './logger';

// TTL constants (in seconds)
export const REDIS_TTL = {
  COMPATIBILITY_SCORE: 5 * 60, // 5 minutes
  PROFILE_QUEUE: 60 * 60, // 1 hour
  SWIPE_HISTORY: 30 * 24 * 60 * 60, // 30 days
  SESSION: 15 * 60, // 15 minutes (matches JWT access token)
  VERIFICATION: 7 * 24 * 60 * 60, // 7 days (matches verification grace period)
} as const;

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times: number): number | void {
    const delay = Math.min(times * 50, 2000);
    logger.warn('Redis connection retry', { attempt: times, delay });
    return delay;
  },
  reconnectOnError(err: Error): boolean | 1 | 2 {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect on READONLY errors
      return 2; // Reconnect and resend failed command
    }
    return false;
  },
};

// Production-only TLS configuration
if (process.env.NODE_ENV === 'production') {
  Object.assign(redisConfig, {
    tls: {
      rejectUnauthorized: true,
    },
  });
}

// Create Redis client instance
export const redis = new Redis(redisConfig);

// Connection event handlers
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready to accept commands');
});

redis.on('error', (err: Error) => {
  logger.error('Redis client error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

/**
 * Graceful shutdown handler
 */
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis connection closed gracefully');
  } catch (err) {
    logger.error('Error closing Redis connection', { error: err });
    redis.disconnect();
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (err) {
    logger.error('Redis health check failed', { error: err });
    return false;
  }
}

/**
 * Helper: Set value with TTL
 */
export async function setWithTTL(
  key: string,
  value: string,
  ttl: number,
): Promise<'OK'> {
  return redis.setex(key, ttl, value);
}

/**
 * Helper: Set JSON value with TTL
 */
export async function setJSONWithTTL<T>(
  key: string,
  value: T,
  ttl: number,
): Promise<'OK'> {
  return redis.setex(key, ttl, JSON.stringify(value));
}

/**
 * Helper: Get JSON value
 */
export async function getJSON<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    logger.error('Failed to parse JSON from Redis', { key, error: err });
    return null;
  }
}

/**
 * Helper: Delete keys by pattern (use with caution)
 */
export async function deleteByPattern(pattern: string): Promise<number> {
  let cursor = '0';
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      100,
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      const deleted = await redis.del(...keys);
      deletedCount += deleted;
    }
  } while (cursor !== '0');

  logger.debug('Deleted keys by pattern', { pattern, deletedCount });
  return deletedCount;
}

export default redis;
