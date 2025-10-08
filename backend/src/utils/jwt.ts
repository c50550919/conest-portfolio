/**
 * JWT Utility Functions
 *
 * Constitution Principle III: Security
 * - Access token: 15min expiry
 * - Refresh token: 7 day expiry
 * - Multi-device support via token array
 * - Comprehensive error handling for token verification
 */

import * as jwt from 'jsonwebtoken';
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  errorType?: 'expired' | 'invalid' | 'malformed' | 'not_before';
}

/**
 * Generate access token for user authentication
 * @param payload - JWT payload with userId and email
 * @returns JWT access token with 15min expiry
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate refresh token for session renewal
 * @param payload - JWT payload with userId and email
 * @returns JWT refresh token with 7 day expiry
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify JWT token with comprehensive error handling
 * @param token - JWT token to verify
 * @returns Verification result with payload or error details
 */
export function verifyToken(token: string): TokenVerificationResult {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return {
      valid: true,
      payload,
    };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return {
        valid: false,
        error: 'Token has expired',
        errorType: 'expired',
      };
    }

    if (error instanceof NotBeforeError) {
      return {
        valid: false,
        error: 'Token not yet valid',
        errorType: 'not_before',
      };
    }

    if (error instanceof JsonWebTokenError) {
      return {
        valid: false,
        error: error.message,
        errorType: 'invalid',
      };
    }

    return {
      valid: false,
      error: 'Token verification failed',
      errorType: 'malformed',
    };
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyToken instead for better error handling
 */
export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyToken instead for better error handling
 */
export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Decode token without verification (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded payload or null
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired without throwing error
 * @param token - JWT token to check
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const result = verifyToken(token);
  return result.errorType === 'expired';
}
