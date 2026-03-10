/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * IP-based Rate Limiting Middleware
 * Implements distributed rate limiting using Redis (ioredis)
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { securityConfig } from '../config/security';
import logger from '../config/logger';

/**
 * Initialize Redis client for rate limiting
 * @deprecated No longer needed - ioredis auto-connects. Kept for backwards compatibility.
 */
export async function initializeRateLimitRedis(): Promise<void> {
  // ioredis auto-connects, no initialization needed
  logger.debug('Rate limit Redis initialization called (no-op with ioredis)');
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * IP-based rate limiting middleware
 */
export function ipRateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}) {
  const {
    windowMs = securityConfig.rateLimit.ipWindowMs,
    maxRequests = securityConfig.rateLimit.maxRequestsPerIP,
    keyPrefix = 'ratelimit:ip',
  } = options || {};

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = getClientIP(req);
    const key = `${keyPrefix}:${ip}`;

    try {
      // Get current count
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await redis.ttl(key);

        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', (Date.now() + ttl * 1000).toString());

        res.status(429).json({
          error: 'Too many requests from this IP',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        });
        return;
      }

      // Increment counter using ioredis pipeline
      const pipeline = redis.pipeline();
      pipeline.incr(key);

      if (count === 0) {
        pipeline.expire(key, Math.ceil(windowMs / 1000));
      }

      await pipeline.exec();

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - count - 1).toString());

      next();
    } catch (error) {
      logger.error('Rate limiting error:', { error });
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Endpoint-specific rate limiting
 */
export function endpointRateLimit(
  endpoint: string,
  options?: {
    windowMs?: number;
    maxRequests?: number;
  },
) {
  const {
    windowMs = securityConfig.rateLimit.windowMs,
    maxRequests = securityConfig.rateLimit.maxRequests,
  } = options || {};

  return ipRateLimit({
    windowMs,
    maxRequests,
    keyPrefix: `ratelimit:endpoint:${endpoint}`,
  });
}

/**
 * User-based rate limiting (after authentication)
 */
export function userRateLimit(options?: { windowMs?: number; maxRequests?: number }) {
  const {
    windowMs = securityConfig.rateLimit.windowMs,
    maxRequests = securityConfig.rateLimit.maxRequests,
  } = options || {};

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(); // Skip if user not authenticated
    }

    const key = `ratelimit:user:${userId}`;

    try {
      const current = await redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await redis.ttl(key);

        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        });
        return;
      }

      const pipeline = redis.pipeline();
      pipeline.incr(key);

      if (count === 0) {
        pipeline.expire(key, Math.ceil(windowMs / 1000));
      }

      await pipeline.exec();

      next();
    } catch (error) {
      logger.error('User rate limiting error:', { error });
      next();
    }
  };
}

/**
 * Clear rate limit for specific IP or user
 */
export async function clearRateLimit(
  identifier: string,
  type: 'ip' | 'user' = 'ip',
): Promise<void> {
  const key = `ratelimit:${type}:${identifier}`;
  await redis.del(key);
}
