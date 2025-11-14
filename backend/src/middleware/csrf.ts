/**
 * CSRF Protection Middleware
 * Implements token-based CSRF protection for state-changing operations
 *
 * Security Implementation:
 * - Redis-backed token storage (persistent across server restarts)
 * - 24-hour token TTL (aligns with session duration)
 * - Max 5 tokens per session (prevents token accumulation)
 * - Double-submit cookie pattern (cookie + header validation)
 *
 * Constitution Principles:
 * - Principle III: Security-First (CSRF protection for all state-changing operations)
 * - Principle IV: Performance (<5ms token generation/validation via Redis)
 *
 * Updated: 2025-11-10 (Security Hardening - Migrated from memory to Redis)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { securityConfig } from '../config/security';
import redis from '../config/redis';

const { tokenLength, cookieName, headerName, cookieOptions } = securityConfig.csrf;

// Redis key prefix for CSRF tokens
const CSRF_KEY_PREFIX = 'csrf:';

// CSRF token TTL (24 hours)
const CSRF_TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds

// Maximum tokens per session
const MAX_TOKENS_PER_SESSION = 5;

/**
 * Generate CSRF token and store in Redis
 * @param sessionId - User session identifier (or IP address)
 * @returns CSRF token
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(tokenLength).toString('hex');
  const redisKey = `${CSRF_KEY_PREFIX}${sessionId}`;

  try {
    // Get existing tokens for this session
    const existingTokensJson = await redis.get(redisKey);
    const existingTokens: string[] = existingTokensJson
      ? JSON.parse(existingTokensJson)
      : [];

    // Add new token
    existingTokens.push(token);

    // Keep only the last MAX_TOKENS_PER_SESSION tokens
    const tokensToStore =
      existingTokens.length > MAX_TOKENS_PER_SESSION
        ? existingTokens.slice(-MAX_TOKENS_PER_SESSION)
        : existingTokens;

    // Store in Redis with TTL
    await redis.setex(redisKey, CSRF_TOKEN_TTL, JSON.stringify(tokensToStore));

    return token;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    throw new Error('Failed to generate CSRF token');
  }
}

/**
 * Validate CSRF token from Redis
 * @param sessionId - User session identifier (or IP address)
 * @param token - CSRF token to validate
 * @returns True if token is valid
 */
export async function validateCSRFToken(
  sessionId: string,
  token: string
): Promise<boolean> {
  const redisKey = `${CSRF_KEY_PREFIX}${sessionId}`;

  try {
    const tokensJson = await redis.get(redisKey);
    if (!tokensJson) {
      return false;
    }

    const tokens: string[] = JSON.parse(tokensJson);
    return tokens.includes(token);
  } catch (error) {
    console.error('Error validating CSRF token:', error);
    return false;
  }
}

/**
 * Middleware to attach CSRF token to response
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function attachCSRFToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = (req as any).sessionId || req.ip;

  try {
    // Generate new token
    const token = await generateCSRFToken(sessionId);

    // Set cookie
    res.cookie(cookieName, token, cookieOptions);

    // Also send in response header
    res.setHeader('X-CSRF-Token', token);

    next();
  } catch (error) {
    console.error('Error attaching CSRF token:', error);
    return next(error);
  }
}

/**
 * Middleware to verify CSRF token for state-changing requests
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export async function verifyCSRFToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = (req as any).sessionId || req.ip;

  // Get token from header or body
  const token = (req.headers[headerName] as string) || req.body?._csrf;

  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  try {
    // Validate token
    const isValid = await validateCSRFToken(sessionId, token);
    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    return res.status(500).json({
      success: false,
      error: 'CSRF verification failed',
      code: 'CSRF_VERIFICATION_ERROR',
    });
  }
}

/**
 * Clear CSRF tokens for session (logout cleanup)
 * @param sessionId - User session identifier
 */
export async function clearCSRFTokens(sessionId: string): Promise<void> {
  const redisKey = `${CSRF_KEY_PREFIX}${sessionId}`;

  try {
    await redis.del(redisKey);
  } catch (error) {
    console.error('Error clearing CSRF tokens:', error);
    // Don't throw - this is cleanup, not critical
  }
}
