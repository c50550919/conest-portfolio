/**
 * IP-based Rate Limiting Middleware
 * Implements distributed rate limiting using Redis
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { securityConfig } from '../config/security';

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis client for rate limiting
 */
export async function initializeRateLimitRedis(): Promise<void> {
  if (redisClient) return;

  redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => {
    console.error('Redis rate limit client error:', err);
  });

  await redisClient.connect();
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
    if (!redisClient) {
      console.warn('Redis client not initialized for rate limiting');
      return next();
    }

    const ip = getClientIP(req);
    const key = `${keyPrefix}:${ip}`;

    try {
      // Get current count
      const current = await redisClient.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await redisClient.ttl(key);

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

      // Increment counter
      const multi = redisClient.multi();
      multi.incr(key);

      if (count === 0) {
        multi.expire(key, Math.ceil(windowMs / 1000));
      }

      await multi.exec();

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - count - 1).toString());

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open - allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Endpoint-specific rate limiting
 */
export function endpointRateLimit(endpoint: string, options?: {
  windowMs?: number;
  maxRequests?: number;
}) {
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
export function userRateLimit(options?: {
  windowMs?: number;
  maxRequests?: number;
}) {
  const {
    windowMs = securityConfig.rateLimit.windowMs,
    maxRequests = securityConfig.rateLimit.maxRequests,
  } = options || {};

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!redisClient) {
      console.warn('Redis client not initialized for rate limiting');
      return next();
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return next(); // Skip if user not authenticated
    }

    const key = `ratelimit:user:${userId}`;

    try {
      const current = await redisClient.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await redisClient.ttl(key);

        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: ttl,
        });
        return;
      }

      const multi = redisClient.multi();
      multi.incr(key);

      if (count === 0) {
        multi.expire(key, Math.ceil(windowMs / 1000));
      }

      await multi.exec();

      next();
    } catch (error) {
      console.error('User rate limiting error:', error);
      next();
    }
  };
}

/**
 * Clear rate limit for specific IP or user
 */
export async function clearRateLimit(identifier: string, type: 'ip' | 'user' = 'ip'): Promise<void> {
  if (!redisClient) return;

  const key = `ratelimit:${type}:${identifier}`;
  await redisClient.del(key);
}
