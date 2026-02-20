/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Rate Limit Middleware - T042
 *
 * Constitution Principle III: Security
 * - General API: 100 req/15min
 * - Auth endpoints: 5 req/15min
 * - Redis-backed for distributed systems (fallback to memory store)
 * - express-rate-limit package
 *
 * Usage:
 *   app.use(generalRateLimit)
 *   router.post('/auth/login', authRateLimit, handler)
 *
 * Note: For production, install rate-limit-redis package:
 *   npm install rate-limit-redis
 */

import rateLimit from 'express-rate-limit';
import redis from '../config/redis';

// Try to import RedisStore, fallback to memory if not available
// Using any type for dynamic require - rate-limit-redis may not be installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let RedisStore: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RedisStore = require('rate-limit-redis').default;
} catch (_err) {
  console.warn('rate-limit-redis not installed, using memory store. Install for production use.');
}

/**
 * Get store configuration
 * Uses Redis if available, otherwise falls back to memory store
 */
function getStore(prefix: string) {
  if (RedisStore) {
    return new RedisStore({
      client: redis,
      prefix,
    });
  }
  // Return undefined to use default memory store
  return undefined;
}

/**
 * Skip rate limiting in test environment
 */
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the 100 requests in 15 minutes limit',
    retryAfter: 'Please try again in 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Redis store for distributed rate limiting (falls back to memory)
  store: getStore('rl:general:'),
  // Skip successful requests (optional - can be removed if all requests should count)
  skipSuccessfulRequests: false,
  // Skip failed requests (optional)
  skipFailedRequests: false,
  // Skip all requests in test environment
  skip: () => isTestEnv,
  // Custom key generator (uses IP by default)
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
});

/**
 * Auth endpoints rate limiter
 * 5 requests per 15 minutes (strict)
 * For login, register, password reset endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'You have exceeded the 5 authentication attempts in 15 minutes limit',
    retryAfter: 'Please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:auth:'),
  // Only count failed authentication attempts
  skipSuccessfulRequests: true,
  // Skip all requests in test environment
  skip: () => isTestEnv,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
});

/**
 * Message sending rate limiter
 * 30 messages per minute
 */
export const messageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many messages',
    message: 'You have exceeded the 30 messages per minute limit',
    retryAfter: 'Please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:message:'),
});

/**
 * Verification request rate limiter
 * 3 requests per hour
 */
export const verificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: 'Too many verification requests',
    message: 'You have exceeded the 3 verification requests per hour limit',
    retryAfter: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:verify:'),
});

/**
 * Payment processing rate limiter
 * 10 requests per hour
 */
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many payment requests',
    message: 'You have exceeded the 10 payment requests per hour limit',
    retryAfter: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:payment:'),
});

// NOTE: swipeRateLimit removed (2025-11-29)
// Swipe functionality deprecated - using connection requests instead

/**
 * Profile update rate limiter
 * 10 updates per hour
 */
export const profileUpdateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many profile updates',
    message: 'You have exceeded the 10 profile updates per hour limit',
    retryAfter: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:profile:'),
  keyGenerator: (req: any) => req.userId || req.ip || 'unknown',
});

/**
 * Admin operations rate limiter
 * 100 requests per 15 minutes (same as general but tracked separately)
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many admin requests',
    message: 'You have exceeded the 100 admin requests in 15 minutes limit',
    retryAfter: 'Please try again in 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:admin:'),
  keyGenerator: (req: any) => req.userId || req.ip || 'unknown',
});

/**
 * Verification endpoint rate limiter
 * 5 requests per hour per user
 */
export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: 'Too many verification requests',
    message: 'You have exceeded the 5 verification requests per hour limit',
    retryAfter: 'Please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:verification:'),
  keyGenerator: (req: any) => req.userId || req.ip || 'unknown',
  skip: () => isTestEnv,
});

/**
 * Phone verification rate limiter
 * 3 attempts per phone per hour + 10 per IP per hour
 * Protects against SMS bombing and abuse
 */
export const phoneVerificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per IP per hour
  message: {
    error: 'Too many verification code requests',
    message: 'You have exceeded the verification request limit. Please try again later.',
    retryAfter: 'Please wait before requesting another code',
    code: 'PHONE_VERIFY_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:phone-verify:'),
  skip: () => isTestEnv,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
});

/**
 * Phone-specific rate limiter (keyed by phone number)
 * 3 OTP requests per phone number per hour
 * This prevents SMS bombing to a specific number
 */
export const phoneNumberRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per phone per hour (matches Telnyx built-in limits)
  message: {
    error: 'Too many verification requests for this phone number',
    message: 'Maximum 3 verification codes per hour. Please check your SMS or try again later.',
    retryAfter: 'Please wait before requesting another code',
    code: 'PHONE_NUMBER_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:phone-number:'),
  skip: () => isTestEnv,
  // Key by phone number from request body
  keyGenerator: (req: any) => {
    const phone = req.body?.phone_number || req.body?.phoneNumber || req.body?.phone || 'unknown';
    // Normalize to prevent bypass with different formats
    return phone.replace(/[^\d+]/g, '');
  },
});

/**
 * OTP verification attempt rate limiter
 * 5 wrong code attempts per phone per 15 minutes
 * Prevents brute-force attacks on OTP codes
 */
export const otpAttemptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many incorrect verification attempts',
    message: 'Maximum 5 attempts per 15 minutes. Please request a new code.',
    retryAfter: 'Please wait before trying again',
    code: 'OTP_ATTEMPT_RATE_LIMIT',
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore('rl:otp-attempt:'),
  // Only count failed attempts (successful verifications don't count)
  skipSuccessfulRequests: true,
  skip: () => isTestEnv,
  keyGenerator: (req: any) => {
    const phone = req.body?.phone_number || req.body?.phoneNumber || req.body?.phone || 'unknown';
    return phone.replace(/[^\d+]/g, '');
  },
});

// Backward-compatible aliases (from old rateLimiter.ts)
export const generalLimiter = generalRateLimit;
export const authLimiter = authRateLimit;
export const messageLimiter = messageRateLimit;
export const paymentLimiter = paymentRateLimit;
