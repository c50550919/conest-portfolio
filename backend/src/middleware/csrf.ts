/**
 * CSRF Protection Middleware
 * Implements token-based CSRF protection for state-changing operations
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { securityConfig } from '../config/security';

const { tokenLength, cookieName, headerName, cookieOptions } = securityConfig.csrf;

// Store tokens in memory (in production, use Redis)
const tokenStore = new Map<string, Set<string>>();

/**
 * Generate CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(tokenLength).toString('hex');

  if (!tokenStore.has(sessionId)) {
    tokenStore.set(sessionId, new Set());
  }

  tokenStore.get(sessionId)!.add(token);

  // Cleanup old tokens (keep max 5 tokens per session)
  const tokens = tokenStore.get(sessionId)!;
  if (tokens.size > 5) {
    const oldestToken = tokens.values().next().value;
    tokens.delete(oldestToken);
  }

  return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const tokens = tokenStore.get(sessionId);
  if (!tokens) return false;

  return tokens.has(token);
}

/**
 * Middleware to attach CSRF token to response
 */
export function attachCSRFToken(req: Request, res: Response, next: NextFunction): void {
  const sessionId = (req as any).sessionId || req.ip;

  // Generate new token
  const token = generateCSRFToken(sessionId);

  // Set cookie
  res.cookie(cookieName, token, cookieOptions);

  // Also send in response header
  res.setHeader('X-CSRF-Token', token);

  next();
}

/**
 * Middleware to verify CSRF token for state-changing requests
 */
export function verifyCSRFToken(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = (req as any).sessionId || req.ip;

  // Get token from header or body
  const token = req.headers[headerName] as string || req.body?._csrf;

  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING',
    });
  }

  // Validate token
  if (!validateCSRFToken(sessionId, token)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  next();
}

/**
 * Clear CSRF tokens for session
 */
export function clearCSRFTokens(sessionId: string): void {
  tokenStore.delete(sessionId);
}
